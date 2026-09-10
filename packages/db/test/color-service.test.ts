import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { NappError } from "@napp/error";
import type { PGlite } from "@electric-sql/pglite";
import type { Container } from "@napp/di";
import { ColorService, type CreateColorInput, type UpdateColorInput } from "../src/service/color.js";
import { testDatabase, transaction } from "./support/database.js";
import { testServiceContainer } from "./support/di.js";

let db: PGlite;
let service: ColorService;
let container: Container;
before(async () => {
  db = await testDatabase();
  container = testServiceContainer(db);
  service = container.resolve(ColorService);
});
after(async () => {
  try { container?.destroy(); } finally { await db?.close(); }
});

function hasError(code: string, status: number) {
  return (error: unknown) => {
    assert.ok(error instanceof NappError);
    assert.equal(error.code, code);
    assert.equal(error.status, status);
    return true;
  };
}

test("color service creates defaults, trims input, updates and clears optional fields", async () => {
  const row = await service.create({ name: "  Service White  ", description: "  ", hexCode: " #fFffff " });
  assert.equal(row.name, "Service White");
  assert.equal(row.description, null);
  assert.equal(row.hexCode, "#fFffff");
  assert.equal(row.sortOrder, 0);
  assert.equal(row.isActive, true);
  assert.ok(row.createdAt instanceof Date);
  const updated = await service.update(row.id, { description: " Pearl finish ", isActive: false, sortOrder: 3 });
  assert.equal(updated.name, row.name);
  assert.equal(updated.description, "Pearl finish");
  assert.equal(updated.hexCode, row.hexCode);
  assert.equal(updated.isActive, false);
  assert.equal(updated.sortOrder, 3);
  assert.ok(updated.updatedAt.getTime() >= row.updatedAt.getTime());
  const cleared = await service.update(row.id, { description: null, hexCode: " " });
  assert.equal(cleared.description, null);
  assert.equal(cleared.hexCode, null);
  const minimal = await service.create({ name: randomUUID() });
  assert.equal(minimal.hexCode, null);
  assert.equal(minimal.description, null);
  await service.delete(row.id);
  await service.delete(minimal.id);
});

test("color service lists both states by default, with stable ordering and pagination", async () => {
  const b = await service.create({ name: "Service B", sortOrder: 5 });
  const a = await service.create({ name: "Service A", sortOrder: 5 });
  const c = await service.create({ name: "Service C", sortOrder: -1, isActive: false });
  assert.deepEqual((await service.list()).map((row) => row.id), [c.id, a.id, b.id]);
  assert.deepEqual((await service.list({ limit: 1, offset: 1 })).map((row) => row.id), [a.id]);
  assert.deepEqual((await service.list({ isActive: true })).map((row) => row.id), [a.id, b.id]);
  assert.deepEqual((await service.list({ isActive: false })).map((row) => row.id), [c.id]);
  assert.deepEqual(await service.list({ offset: 100 }), []);
  for (const row of [a, b, c]) await service.delete(row.id);
});

test("color service rejects invalid inputs without writing", async () => {
  const invalid: unknown[] = [
    {}, { name: " " }, { name: "x".repeat(256) }, { name: "Invalid", description: "x".repeat(513) },
    { name: "Invalid", hexCode: "#FFF" }, { name: "Invalid", hexCode: "#12345678" },
    { name: "Invalid", hexCode: "#GG0000" }, { name: "Invalid", hexCode: "FFFFFF" },
    { name: "Invalid", sortOrder: 1.5 }, { name: "Invalid", sortOrder: 2_147_483_648 },
    { name: "Invalid", isActive: "false" }, { name: "Invalid", id: randomUUID() },
  ];
  for (const input of invalid) {
    await assert.rejects(service.create(input as CreateColorInput), hasError("COLOR_INVALID_INPUT", 400));
  }
  for (const input of [{}, { name: undefined }, { hexCode: "#FFF" }, { createdAt: new Date() }]) {
    await assert.rejects(service.update(randomUUID(), input as UpdateColorInput), hasError("COLOR_INVALID_INPUT", 400));
  }
  for (const param of [{ limit: 0 }, { limit: 101 }, { limit: 1.5 }, { offset: -1 }, { offset: NaN }]) {
    await assert.rejects(service.list(param), hasError("COLOR_INVALID_INPUT", 400));
  }
  await assert.rejects(service.update("invalid-id", { name: "Ignored" }), hasError("COLOR_INVALID_INPUT", 400));
  await assert.rejects(service.delete("invalid-id"), hasError("COLOR_INVALID_INPUT", 400));
  assert.deepEqual(await service.list(), []);
});

test("color service maps duplicate names and missing rows, but allows duplicate hex codes", async () => {
  const a = await service.create({ name: "Unique service color", hexCode: "#123456" });
  const b = await service.create({ name: "Other service color", hexCode: a.hexCode });
  await assert.rejects(service.create({ name: " UNIQUE SERVICE COLOR " }), hasError("COLOR_NAME_CONFLICT", 409));
  await assert.rejects(service.update(b.id, { name: a.name }), hasError("COLOR_NAME_CONFLICT", 409));
  await assert.rejects(service.update(randomUUID(), { name: "Missing" }), hasError("COLOR_NOT_FOUND", 404));
  await assert.rejects(service.delete(randomUUID()), hasError("COLOR_NOT_FOUND", 404));
  const removed = await service.delete(a.id);
  assert.equal(removed.id, a.id);
  await assert.rejects(service.delete(a.id), hasError("COLOR_NOT_FOUND", 404));
  await service.delete(b.id);
});

test("color service prevents deleting either vehicle color, while allowing deactivation", async () => {
  const exterior = await service.create({ name: "Linked exterior" });
  const interior = await service.create({ name: "Linked interior" });
  const productId = randomUUID();
  await transaction(db, async () => {
    await db.query("INSERT INTO products (id, product_type, title) VALUES ($1, 'vehicle', 'Linked vehicle')", [productId]);
    await db.query("INSERT INTO vehicles (product_id, exterior_color_id, interior_color_id) VALUES ($1, $2, $3)", [productId, exterior.id, interior.id]);
  });
  for (const color of [exterior, interior]) {
    await assert.rejects(service.delete(color.id), hasError("COLOR_IN_USE", 409));
    assert.equal((await service.update(color.id, { isActive: false })).isActive, false);
  }
  const { rows: [vehicle] } = await db.query("SELECT exterior_color_id, interior_color_id FROM vehicles WHERE product_id=$1", [productId]);
  assert.deepEqual(vehicle, { exterior_color_id: exterior.id, interior_color_id: interior.id });
});

test("color service sanitizes unexpected storage errors", async (t) => {
  const isolated = await testDatabase();
  t.after(async () => { if (!isolated.closed) await isolated.close(); });
  const isolatedContainer = testServiceContainer(isolated);
  t.after(() => isolatedContainer.destroy());
  const closedService = isolatedContainer.resolve(ColorService);
  await isolated.close();
  await assert.rejects(closedService.list(), hasError("COLOR_STORAGE_ERROR", 500));
});
