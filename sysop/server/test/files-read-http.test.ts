import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { createServer } from "node:http";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { FileService, TKN_DB, type BigMotorsDb } from "@bigmotors/db";
import * as schema from "@bigmotors/db/schema";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { createApp } from "../src/app.js";
import { createContainer } from "../src/di.js";

test("public file read through HTTP and DI", async (t) => {
  const folder = await mkdtemp(path.join(tmpdir(), "bm-file-read-"));
  const rootPath = path.join(folder, "root");
  await mkdir(rootPath);
  const db = new PGlite();
  const orm = drizzle(db, { schema });
  const root = createContainer({ env: { NODE_ENV: "production", FILES_ROOT: rootPath } });
  const di = root.child("file-read").asValue(TKN_DB, orm as unknown as BigMotorsDb);
  const server = createServer(createApp(di));
  t.after(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
      server.closeAllConnections();
    });
    root.destroy();
    await db.close();
    assert.ok(path.resolve(folder).startsWith(path.resolve(tmpdir()) + path.sep));
    await rm(folder, { recursive: true, force: true, maxRetries: 3 });
  });
  await migrate(orm, { migrationsFolder: fileURLToPath(new URL("../../../packages/db/migrations/", import.meta.url)) });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const origin = `http://127.0.0.1:${address.port}`;
  const bytes = Buffer.from([0, 1, 127, 255]);
  async function file(originalName: string, contents = bytes) {
    const id = randomUUID();
    await writeFile(path.join(rootPath, id), contents);
    return di.resolve(FileService).createUploadedFile({ id, filePath: id, originalName });
  }
  const image = await file("зураг.JPG");
  const readUrl = (id: string, name = "different.html") => `${origin}/files/${id}/${encodeURIComponent(name)}`;

  await t.test("anonymous production read ignores URL name, usage and authorization headers", async () => {
    for (const name of [image.originalName, "different.html", "../../private.txt", "bad\r\nname", "folder\\file"]) {
      const res = await fetch(readUrl(image.id, name), { headers: { Authorization: "Bearer invalid" } });
      assert.equal(res.status, 200);
      assert.equal(res.headers.get("content-type"), "image/jpeg");
      assert.equal(res.headers.get("content-disposition"), null);
      assert.deepEqual(Buffer.from(await res.arrayBuffer()), bytes);
    }
    await db.query("UPDATE files SET usage = ARRAY[$1::uuid] WHERE id = $2", [randomUUID(), image.id]);
    const res = await fetch(readUrl(image.id));
    assert.equal(res.status, 200);
    assert.deepEqual(Buffer.from(await res.arrayBuffer()), bytes);
    assert.equal((await db.query("SELECT id FROM products")).rows.length, 0);
  });

  await t.test("HEAD reports length without body; empty and unknown formats work", async () => {
    const head = await fetch(readUrl(image.id), { method: "HEAD" });
    assert.equal(head.status, 200);
    assert.equal(head.headers.get("content-length"), String(bytes.length));
    assert.equal((await head.arrayBuffer()).byteLength, 0);
    const empty = await file("хоосон.unknown", Buffer.alloc(0));
    const res = await fetch(readUrl(empty.id, "pretend.jpg"));
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("content-type"), "application/octet-stream");
    assert.match(res.headers.get("content-disposition")!, /^attachment;/);
    assert.equal((await res.arrayBuffer()).byteLength, 0);
  });

  await t.test("active content downloads unchanged with safe headers based on stored name", async () => {
    for (const name of ["page.html", "image.svg"]) {
      const content = Buffer.from("<script>alert(1)</script>");
      const record = await file(name, content);
      const res = await fetch(readUrl(record.id, "photo.png"));
      assert.equal(res.status, 200);
      assert.equal(res.headers.get("content-type"), "application/octet-stream");
      assert.match(res.headers.get("content-disposition")!, new RegExp(name.replace(".", "\\.")));
      assert.equal(res.headers.get("cache-control"), "no-store");
      assert.equal(res.headers.get("x-content-type-options"), "nosniff");
      assert.match(res.headers.get("content-security-policy")!, /sandbox/);
      assert.deepEqual(Buffer.from(await res.arrayBuffer()), content);
    }
  });

  await t.test("invalid ID is 400; absent record, disk file and directory are 404", async () => {
    const missing = await file("gone.bin");
    await rm(path.join(rootPath, missing.id));
    const directory = await file("directory.bin");
    await rm(path.join(rootPath, directory.id));
    await mkdir(path.join(rootPath, directory.id));
    for (const [id, status, code] of [
      ["invalid", 400, "FILE_INVALID_ID"],
      [randomUUID(), 404, "FILE_NOT_FOUND"],
      [missing.id, 404, "FILE_NOT_FOUND"],
      [directory.id, 404, "FILE_NOT_FOUND"],
    ] as const) {
      const res = await fetch(readUrl(id));
      assert.equal(res.status, status);
      assert.deepEqual(await res.json(), { error: { code, message: status === 400 ? "Invalid file ID." : "File not found." } });
    }
  });

  await t.test("stored traversal and junction escapes fail without exposing disk paths", async () => {
    const outside = path.join(folder, "outside");
    await mkdir(outside);
    await writeFile(path.join(outside, "secret"), "secret");
    await symlink(outside, path.join(rootPath, "escape"), process.platform === "win32" ? "junction" : "dir");
    for (const filePath of ["../outside/secret", "escape/secret", "C:/private/secret", "/outside/secret"]) {
      const id = randomUUID();
      await orm.insert(schema.files).values({ id, filePath, originalName: "secret" });
      const res = await fetch(readUrl(id));
      assert.equal(res.status, 500);
      const body = await res.text();
      assert.ok(!body.includes(folder));
      assert.ok(!body.includes("secret"));
    }
  });

  await t.test("database failures are safe 500; upload production gate remains", async (context) => {
    const lookup = context.mock.method(FileService.prototype, "findById", async () => { throw new Error(`DB ${folder}`); });
    try {
      const res = await fetch(readUrl(image.id));
      assert.equal(res.status, 500);
      assert.ok(!(await res.text()).includes(folder));
    } finally { lookup.mock.restore(); }
    const res = await fetch(`${origin}/api/files/upload`, { method: "POST" });
    assert.equal(res.status, 503);
    assert.deepEqual(await res.json(), { error: { code: "AUTH_ACL_UNAVAILABLE", message: "Admin API is not initialized." } });
  });
});
