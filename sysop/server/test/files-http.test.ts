import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer, request as httpRequest } from "node:http";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { setTimeout } from "node:timers/promises";
import { PGlite } from "@electric-sql/pglite";
import { FilePersistenceError, FileService, TKN_DB, type BigMotorsDb } from "@bigmotors/db";
import * as schema from "@bigmotors/db/schema";
import { ConfigFiles } from "@bigmotors/core";
import { Files } from "@bigmotors/sysop-dti";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { createApp } from "../src/app.js";
import { createContainer } from "../src/di.js";
import { UploadStorage } from "../src/files/upload-storage.js";

test("file upload HTTP route writes original bytes and metadata through production DI", async (t) => {
  const folder = await mkdtemp(path.join(tmpdir(), "bm-files-http-"));
  const db = new PGlite();
  const orm = drizzle(db, { schema });
  const env = { FILES_ROOT: folder, FILES_UPLOADS: path.join(folder, "uploads") };
  const root = createContainer({ env });
  const di = root.child("files-http").asValue(TKN_DB, orm as unknown as BigMotorsDb);
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
  const url = `http://127.0.0.1:${address.port}/api/files/upload`;

  function form(bytes: Uint8Array = new Uint8Array([0, 1, 255]), name = "original.unknown") {
    const data = new FormData();
    data.append("file", new Blob([new Uint8Array(bytes)], { type: "application/octet-stream" }), name);
    return data;
  }
  async function upload(body: FormData, suffix = "") {
    const response = await fetch(url + suffix, { method: "POST", body });
    return { status: response.status, body: await response.json() };
  }
  async function directories() {
    return (await readdir(env.FILES_UPLOADS).catch(() => [])).sort();
  }
  async function failure(body: FormData, status = 400, code = "FILE_UPLOAD_INVALID_INPUT", suffix = "") {
    const before = await directories();
    const result = await upload(body, suffix);
    assert.equal(result.status, status, JSON.stringify(result.body));
    assert.equal(Files.uploadError.parse(result.body).error.code, code);
    assert.deepEqual(await directories(), before);
    assert.ok(!JSON.stringify(result.body).includes(folder));
  }

  await t.test("arbitrary bytes, Unicode filename, metadata after file and empty usage", async () => {
    const bytes = new Uint8Array([0, 127, 255, 1, 2]);
    const data = form(bytes, "зураг.unknown");
    data.append("title", "  Гарчиг  ");
    data.append("description", "  Тайлбар  ");
    const result = await upload(data);
    assert.equal(result.status, 201, JSON.stringify(result.body));
    const entity = Files.uploadResult.parse(result.body);
    assert.equal(entity.originalName, "зураг.unknown");
    assert.equal(entity.title, "Гарчиг");
    assert.equal(entity.description, "Тайлбар");
    const rows = await db.query<{ file_path: string; usage: string[] }>("SELECT file_path,usage FROM files WHERE id=$1", [entity.id]);
    const row = rows.rows[0]!;
    assert.deepEqual(row.usage, []);
    assert.ok(row.file_path.startsWith("uploads/"));
    assert.equal(row.file_path.includes("\\"), false);
    assert.equal(path.basename(row.file_path), entity.id);
    assert.deepEqual(await readFile(path.join(folder, row.file_path)), Buffer.from(bytes));
    const read = await fetch(new URL(`/files/${entity.id}/ignored.jpg`, url));
    assert.equal(read.status, 200);
    assert.deepEqual(Buffer.from(await read.arrayBuffer()), Buffer.from(bytes));
    assert.equal((await db.query("SELECT * FROM product_images")).rows.length, 0);
    assert.equal((await db.query("SELECT * FROM products")).rows.length, 0);
  });
  await t.test("empty files and blank optional metadata are accepted; repeated upload gets new IDs", async () => {
    const first = form(new Uint8Array());
    first.append("title", "  ");
    first.append("description", "");
    const a = await upload(first);
    const b = await upload(form(new Uint8Array()));
    assert.equal(a.status, 201);
    assert.equal(b.status, 201);
    const firstResult = Files.uploadResult.parse(a.body);
    assert.notEqual(firstResult.id, Files.uploadResult.parse(b.body).id);
    assert.equal(firstResult.title, null);
    assert.equal(firstResult.description, null);
  });
  await t.test("exactly 20 MB succeeds; one byte more is rejected and cleaned", async () => {
    const maxBytes = di.resolve(ConfigFiles).FILE_UPLOAD_MAX_BYTES;
    assert.equal(maxBytes, 20_971_520);
    const exact = await upload(form(new Uint8Array(maxBytes)));
    assert.equal(exact.status, 201, JSON.stringify(exact.body));
    await failure(form(new Uint8Array(maxBytes + 1)), 413, "FILE_UPLOAD_TOO_LARGE");
  });
  await t.test("upload honors the environment override through ConfigFiles DI", async () => {
    const configuredRoot = createContainer({ env: { ...env, FILE_UPLOAD_MAX_BYTES: "8" } });
    const configuredDi = configuredRoot.child("configured-upload").asValue(TKN_DB, orm as unknown as BigMotorsDb);
    const configuredServer = createServer(createApp(configuredDi));
    try {
      configuredServer.listen(0, "127.0.0.1");
      await once(configuredServer, "listening");
      const configuredAddress = configuredServer.address();
      assert.ok(configuredAddress && typeof configuredAddress !== "string");
      const configuredUrl = `http://127.0.0.1:${configuredAddress.port}/api/files/upload`;
      const accepted = await fetch(configuredUrl, { method: "POST", body: form(new Uint8Array(8)) });
      assert.equal(accepted.status, 201, await accepted.text());
      const before = await directories();
      const rejected = await fetch(configuredUrl, { method: "POST", body: form(new Uint8Array(9)) });
      assert.equal(rejected.status, 413);
      const error = Files.uploadError.parse(await rejected.json()).error;
      assert.equal(error.code, "FILE_UPLOAD_TOO_LARGE");
      assert.equal(error.message, "File exceeds the 8 byte limit.");
      assert.deepEqual(await directories(), before);
    } finally {
      await new Promise<void>((resolve, reject) => {
        configuredServer.close((error) => error ? reject(error) : resolve());
        configuredServer.closeAllConnections();
      });
      configuredRoot.destroy();
    }
  });
  await t.test("missing, extra and unknown file fields reject without leaving disk files", async () => {
    await failure(new FormData());
    const two = form();
    two.append("file", new Blob(["second"]), "second.bin");
    await failure(two);
    const wrong = new FormData();
    wrong.append("image", new Blob(["x"]), "x");
    await failure(wrong);
  });
  await t.test("metadata limits, duplicate/nested fields, extra fields and query are strict", async () => {
    for (const [key, value] of [["title", "x".repeat(256)], ["description", "x".repeat(513)], ["usage", "[]"], ["filePath", "../../x"], ["title[a]", "x"]]) {
      const data = form();
      data.append(key!, value!);
      await failure(data);
    }
    const repeated = form();
    repeated.append("title", "a");
    repeated.append("title", "b");
    await failure(repeated);
    await failure(form(), 400, "FILE_UPLOAD_INVALID_INPUT", "?productId=x");
    const valid = form();
    valid.append("title", "x".repeat(255));
    valid.append("description", "y".repeat(512));
    assert.equal((await upload(valid)).status, 201);
  });
  await t.test("JSON is 415; malformed multipart is 400 with cleanup", async () => {
    const before = await directories();
    for (const [contentType, body, status] of [
      ["application/json", "{}", 415],
      ["multipart/form-data", "broken", 400],
      ["multipart/form-data; boundary=x", '--x\r\nContent-Disposition: form-data; name="file"; filename="x"\r\n\r\npartial', 400],
    ] as const) {
      const response = await fetch(url, { method: "POST", headers: { "Content-Type": contentType }, body });
      assert.equal(response.status, status, await response.text());
      assert.deepEqual(await directories(), before);
    }
  });
  await t.test("aborted uploads are cleaned without inserting metadata", async () => {
    const before = await directories();
    const count = (await db.query("SELECT id FROM files")).rows.length;
    const req = httpRequest(url, { method: "POST", headers: { "Content-Type": "multipart/form-data; boundary=abort" } });
    req.on("error", () => {});
    req.write('--abort\r\nContent-Disposition: form-data; name="file"; filename="partial.bin"\r\n\r\n');
    req.write(Buffer.alloc(128 * 1024));
    try {
      for (let i = 0; i < 100 && (await directories()).length === before.length; i++) await setTimeout(20);
      assert.ok((await directories()).length > before.length);
    } finally { req.destroy(); }
    for (let i = 0; i < 100 && (await directories()).length !== before.length; i++) await setTimeout(20);
    assert.deepEqual(await directories(), before);
    assert.equal((await db.query("SELECT id FROM files")).rows.length, count);
  });
  await t.test("parallel requests own separate files", async () => {
    const results = await Promise.all([upload(form()), upload(form()), upload(form())]);
    assert.ok(results.every((result) => result.status === 201));
    assert.equal(new Set(results.map((result) => Files.uploadResult.parse(result.body).id)).size, 3);
  });
  await t.test("known database rejection cleans the file and returns safe 500", async () => {
    await db.exec("ALTER TABLE files ADD CONSTRAINT reject_test_upload CHECK (false) NOT VALID");
    try { await failure(form(), 500, "FILE_UPLOAD_STORAGE_ERROR"); }
    finally { await db.exec("ALTER TABLE files DROP CONSTRAINT reject_test_upload"); }
  });
  await t.test("storage setup failures do not expose disk paths", async (context) => {
    const mock = context.mock.method(UploadStorage.prototype, "prepare", async () => { throw new Error(`Cannot write ${folder}`); });
    try { await failure(form(), 500, "FILE_UPLOAD_STORAGE_ERROR"); }
    finally { mock.mock.restore(); }
  });
  await t.test("uncertain database commit preserves the uploaded bytes for reconciliation", async (context) => {
    const before = await directories();
    const events: string[] = [];
    const logger = context.mock.method(console, "error", (event: string) => events.push(event));
    const persistence = context.mock.method(FileService.prototype, "createUploadedFile", async () => {
      throw new FilePersistenceError(true, new Error("Connection lost"));
    });
    try {
      const result = await upload(form());
      assert.equal(result.status, 500);
      assert.equal(Files.uploadError.parse(result.body).error.code, "FILE_UPLOAD_STORAGE_ERROR");
      const added = (await directories()).filter((name) => !before.includes(name));
      assert.equal(added.length, 1);
      const content = await readdir(path.join(env.FILES_UPLOADS, added[0]!));
      assert.equal(content.length, 1);
      assert.ok(events.includes("file_upload_commit_uncertain"));
    } finally { persistence.mock.restore(); logger.mock.restore(); }
  });
  await t.test("production fails closed until Userly upload authorization is integrated", async () => {
    Object.assign(env, { NODE_ENV: "production" });
    try { await failure(form(), 503, "AUTH_ACL_UNAVAILABLE"); }
    finally { Reflect.deleteProperty(env, "NODE_ENV"); }
  });
});
