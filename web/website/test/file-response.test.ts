import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { readFileResponse } from "../src/server/file-response.ts";

test("public file GET/HEAD preserve original bytes and ignore URL filename and authorization", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "bigmotors-web-files-"));
  try {
    const bytes = Buffer.from([0, 255, 1, 128, 3]);
    await writeFile(path.join(root, "image"), bytes);
    const reader = { getRoot: () => root, findById: async (id: string) => {
      assert.equal(id, "test-id"); return { filePath: "image", originalName: "зураг.JPG" };
    } };
    for (const name of ["other.html", "../../secret.txt", "bad\r\nname", "folder\\file"]) {
      const response = await readFileResponse(new Request(`http://localhost/files/test-id/${encodeURIComponent(name)}`, { headers: { Authorization: "ignored" } }), "test-id", reader);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("content-type"), "image/jpeg");
      assert.equal(response.headers.get("content-length"), String(bytes.length));
      assert.equal(response.headers.get("content-disposition"), null);
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
    }
    const head = await readFileResponse(new Request("http://localhost/files/test-id/name", { method: "HEAD" }), "test-id", reader);
    assert.equal(head.status, 200); assert.equal(head.headers.get("content-length"), String(bytes.length));
    assert.equal(await head.text(), "");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("unknown and active formats are returned unchanged as downloads, including empty files", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "bigmotors-web-download-"));
  try {
    for (const originalName of ["page.html", "image.svg", "unknown", "тайлбар.txt", 'bad"\r\nname.bin']) {
      const text = originalName === "unknown" ? "" : "<script>example()</script>";
      await writeFile(path.join(root, "download"), text);
      const response = await readFileResponse(new Request("http://localhost/files/id/image.jpg"), "id", {
        getRoot: () => root, findById: async () => ({ filePath: "download", originalName }),
      });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("content-type"), "application/octet-stream");
      assert.match(response.headers.get("content-disposition")!, /^attachment;/);
      assert.equal(response.headers.get("x-content-type-options"), "nosniff");
      assert.match(response.headers.get("content-security-policy")!, /sandbox/);
      assert.equal(await response.text(), text);
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("missing files, invalid IDs, DB errors and unsafe paths produce sanitized responses", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "bigmotors-web-path-"));
  const request = new Request("http://localhost/files/id/name");
  try {
    await mkdir(path.join(root, "folder"));
    for (const [filePath, status] of [["missing", 404], ["folder", 404], ["../secret", 500], ["/secret", 500], ["a\\b", 500], ["C:/secret", 500]] as const) {
      const response = await readFileResponse(request, "id", { getRoot: () => root, findById: async () => ({ filePath, originalName: "file" }) });
      assert.equal(response.status, status, filePath);
      assert.doesNotMatch(await response.text(), /secret|C:|bigmotors-web-path/);
    }
    for (const [code, status] of [["FILE_INVALID_ID", 400], ["FILE_NOT_FOUND", 404], ["XX000", 500]] as const) {
      for (const method of ["GET", "HEAD"]) {
        const response = await readFileResponse(new Request(request, { method }), "id", {
          getRoot: () => root, findById: async () => { throw Object.assign(new Error("private credentials"), { code }); },
        });
        assert.equal(response.status, status);
        const text = await response.text();
        if (method === "HEAD") assert.equal(text, "");
        assert.doesNotMatch(text, /private|credentials|XX000/);
      }
    }
    const storage = path.join(root, "storage"); const outside = path.join(root, "outside");
    await mkdir(storage); await mkdir(outside); await writeFile(path.join(outside, "secret"), "private");
    await symlink(outside, path.join(storage, "link"), process.platform === "win32" ? "junction" : "dir");
    const escape = await readFileResponse(request, "id", { getRoot: () => storage, findById: async () => ({ filePath: "link/secret", originalName: "image.jpg" }) });
    assert.equal(escape.status, 500); assert.doesNotMatch(await escape.text(), /private|outside|secret/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
