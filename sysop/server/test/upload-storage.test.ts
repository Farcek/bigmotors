import assert from "node:assert/strict";
import { mkdtemp, mkdir, readdir, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { ConfigFiles } from "@bigmotors/core";
import { UploadStorage } from "../src/files/upload-storage.js";

test("upload storage validates config and rejects paths and symlinks outside FILES_ROOT", async () => {
  const folder = await mkdtemp(path.join(tmpdir(), "bm-storage-"));
  try {
    const root = path.join(folder, "root");
    const outside = path.join(folder, "outside");
    await mkdir(root);
    await mkdir(outside);
    for (const [FILES_ROOT, FILES_UPLOADS] of [["", ""], ["relative", "relative/uploads"], [root, outside], [root, root]]) {
      await assert.rejects(new UploadStorage(new ConfigFiles({ FILES_ROOT, FILES_UPLOADS })).prepare());
    }
    const link = path.join(root, "link");
    await symlink(outside, link, process.platform === "win32" ? "junction" : "dir");
    await assert.rejects(new UploadStorage(new ConfigFiles({ FILES_ROOT: root, FILES_UPLOADS: path.join(link, "uploads") })).prepare());
    assert.deepEqual(await readdir(outside), []);
    const storage = new UploadStorage(new ConfigFiles({ FILES_ROOT: root, FILES_UPLOADS: path.join(root, "uploads") }));
    const target = await storage.prepare();
    assert.equal(path.resolve(root, target.filePath), target.diskPath);
    await assert.rejects(storage.discard({ ...target, directory: outside }));
    await storage.discard(target);
    assert.deepEqual(await readdir(path.join(root, "uploads")), []);
  } finally {
    assert.ok(path.resolve(folder).startsWith(path.resolve(tmpdir()) + path.sep));
    await rm(folder, { recursive: true, force: true });
  }
});
