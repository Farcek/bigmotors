import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { Container } from "@napp/di";
import { NappError } from "@napp/error";
import { drizzle } from "drizzle-orm/pglite";
import type { PGlite } from "@electric-sql/pglite";
import { TKN_DB, type BigMotorsDb } from "../src/db.js";
import { diDBServiceProviders } from "../src/di.js";
import { FilePersistenceError, FileService } from "../src/service/file.js";
import { testDatabase } from "./support/database.js";

let db: PGlite;
let service: FileService;
let di: Container;
before(async () => {
  db = await testDatabase();
  di = new Container("file-service").asValue(TKN_DB, drizzle(db) as unknown as BigMotorsDb);
  di.registryModule(diDBServiceProviders());
  service = di.resolve(FileService);
});
after(async () => { di?.destroy(); await db?.close(); });
function input() {
  const id = randomUUID();
  return { id, filePath: `uploads/${id}`, originalName: "original.any" };
}

test("FileService uses DI, defaults usage and timestamps, and normalizes metadata", async () => {
  const row = await service.createUploadedFile({ ...input(), title: "  Title  ", description: "  " });
  assert.deepEqual(row.usage, []);
  assert.equal(row.title, "Title");
  assert.equal(row.description, null);
  assert.ok(row.createdAt instanceof Date);
});
test("FileService rejects caller-owned usage, invalid paths and metadata", async () => {
  for (const patch of [
    { usage: [] }, { filePath: "../outside" }, { filePath: "/outside" }, { filePath: "C:\\outside" },
    { filePath: "uploads/../outside" }, { title: "x".repeat(256) }, { description: "x".repeat(513) }, { originalName: "a\0b" },
  ]) {
    await assert.rejects(service.createUploadedFile({ ...input(), ...patch }), (error: unknown) =>
      error instanceof NappError && error.code === "FILE_UPLOAD_INVALID_INPUT");
  }
});
test("FileService marks a known PostgreSQL rejection as safe for disk cleanup", async () => {
  const existing = await service.createUploadedFile(input());
  await assert.rejects(service.createUploadedFile({ ...input(), filePath: existing.filePath }), (error: unknown) =>
    error instanceof FilePersistenceError && !error.writeMayHaveCommitted);
});
test("FileService recovers the row after a committed write whose response failed", async () => {
  const value = input();
  const expected = await service.createUploadedFile(value);
  const orm = drizzle(db);
  const unreliable = {
    insert: () => ({ values: () => ({ returning: async () => { throw new Error("Connection lost"); } }) }),
    select: orm.select.bind(orm),
  } as unknown as BigMotorsDb;
  const recovered = await new FileService(unreliable).createUploadedFile(value);
  assert.deepEqual(recovered, expected);
});
test("FileService preserves the disk file when an uncertain commit cannot be resolved", async () => {
  const unavailable = {
    insert: () => ({ values: () => ({ returning: async () => { throw new Error("Connection lost"); } }) }),
    select: () => { throw new Error("Database unavailable"); },
  } as unknown as BigMotorsDb;
  await assert.rejects(new FileService(unavailable).createUploadedFile(input()), (error: unknown) =>
    error instanceof FilePersistenceError && error.writeMayHaveCommitted);
});
