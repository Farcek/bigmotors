import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { NappError } from "@napp/error";
import type { PGlite } from "@electric-sql/pglite";
import type { Container } from "@napp/di";
import { BranchService, type CreateBranchInput, type UpdateBranchInput } from "../src/index.js";
import { testDatabase, transaction } from "./support/database.js";
import { testServiceContainer } from "./support/di.js";

let db: PGlite;
let service: BranchService;
let container: Container;
before(async () => {
  db = await testDatabase();
  container = testServiceContainer(db);
  service = container.resolve(BranchService);
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

test("branch service creates defaults, normalizes text and updates only supplied fields", async () => {
  const row = await service.create({ name: "  Main branch  " });
  assert.equal(row.name, "Main branch");
  assert.equal(row.description, null);
  assert.equal(row.sortOrder, 0);
  assert.equal(row.isActive, true);
  assert.ok(row.createdAt instanceof Date);
  const updated = await service.update(row.id, { description: " Company branch ", sortOrder: 3, isActive: false });
  assert.equal(updated.name, row.name);
  assert.equal(updated.description, "Company branch");
  assert.equal(updated.sortOrder, 3);
  assert.equal(updated.isActive, false);
  assert.ok(updated.updatedAt.getTime() >= row.updatedAt.getTime());
  const renamed = await service.update(row.id, { name: "Renamed", description: undefined });
  assert.equal(renamed.description, updated.description);
  assert.equal((await service.update(row.id, { description: "  " })).description, null);
  assert.equal((await service.update(row.id, { description: null, isActive: true })).isActive, true);
  assert.equal((await service.delete(row.id)).id, row.id);
});

test("branch service provides stable pagination and optional active filtering", async () => {
  const b = await service.create({ name: "Branch B", sortOrder: 2 });
  const a = await service.create({ name: "Branch A", sortOrder: 2 });
  const c = await service.create({ name: "Branch C", sortOrder: -1, isActive: false });
  assert.deepEqual((await service.list()).map((row) => row.id), [c.id, a.id, b.id]);
  assert.deepEqual((await service.list({ limit: 1, offset: 1 })).map((row) => row.id), [a.id]);
  assert.deepEqual((await service.list({ isActive: true })).map((row) => row.id), [a.id, b.id]);
  assert.deepEqual((await service.list({ isActive: false })).map((row) => row.id), [c.id]);
  assert.deepEqual(await service.list({ offset: 100 }), []);
  for (const row of [a, b, c]) await service.delete(row.id);
});

test("branch service rejects invalid text, identity fields, empty patches and pagination", async () => {
  const invalid: unknown[] = [
    {}, { name: null }, { name: " " }, { name: "x".repeat(256) },
    { name: "Invalid", description: "x".repeat(513) }, { name: "Invalid", hexCode: "#FFFFFF" },
    { name: "Invalid", sortOrder: 0.5 }, { name: "Invalid", sortOrder: 2_147_483_648 },
    { name: "Invalid", sortOrder: -2_147_483_649 }, { name: "Invalid", isActive: "false" },
    { name: "Invalid", id: randomUUID() },
  ];
  for (const input of invalid) {
    await assert.rejects(service.create(input as CreateBranchInput), hasError("BRANCH_INVALID_INPUT", 400));
  }
  for (const input of [{}, { name: undefined }, { name: " " }, { createdAt: new Date() }]) {
    await assert.rejects(service.update(randomUUID(), input as UpdateBranchInput), hasError("BRANCH_INVALID_INPUT", 400));
  }
  for (const input of [{ limit: 0 }, { limit: 101 }, { limit: 1.5 }, { offset: -1 }, { offset: NaN }]) {
    await assert.rejects(service.list(input), hasError("BRANCH_INVALID_INPUT", 400));
  }
  await assert.rejects(service.update("invalid", { name: "Ignored" }), hasError("BRANCH_INVALID_INPUT", 400));
  await assert.rejects(service.delete("invalid"), hasError("BRANCH_INVALID_INPUT", 400));
  assert.deepEqual(await service.list(), []);
});

test("branch service maps duplicate names and missing rows", async () => {
  const a = await service.create({ name: "Unique branch" });
  const b = await service.create({ name: "Other branch" });
  await assert.rejects(service.create({ name: " UNIQUE BRANCH " }), hasError("BRANCH_NAME_CONFLICT", 409));
  await assert.rejects(service.update(b.id, { name: a.name }), hasError("BRANCH_NAME_CONFLICT", 409));
  await assert.rejects(service.update(randomUUID(), { name: "Missing" }), hasError("BRANCH_NOT_FOUND", 404));
  await assert.rejects(service.delete(randomUUID()), hasError("BRANCH_NOT_FOUND", 404));
  await service.delete(a.id);
  await assert.rejects(service.delete(a.id), hasError("BRANCH_NOT_FOUND", 404));
  await service.delete(b.id);
});

for (const [type, table] of [["vehicle", "vehicles"], ["part", "parts"], ["tire", "tires"]] as const) {
  test(`branch service protects ${type} references while allowing deactivation`, async () => {
    const branch = await service.create({ name: `Linked ${type} branch` });
    const productId = randomUUID();
    await transaction(db, async () => {
      await db.query("INSERT INTO products (id, product_type, title) VALUES ($1, $2, 'Linked product')", [productId, type]);
      await db.query(`INSERT INTO ${table} (product_id, branch_id) VALUES ($1, $2)`, [productId, branch.id]);
    });
    await assert.rejects(service.delete(branch.id), hasError("BRANCH_IN_USE", 409));
    assert.equal((await service.update(branch.id, { isActive: false })).isActive, false);
    const { rows: [product] } = await db.query(`SELECT branch_id, location_id FROM ${table} WHERE product_id=$1`, [productId]);
    assert.deepEqual(product, { branch_id: branch.id, location_id: null });
  });
}

test("branch service does not modify locations with the same name", async () => {
  const branch = await service.create({ name: "Separate records" });
  await db.query("INSERT INTO locations (name) VALUES ($1)", [branch.name]);
  await service.delete(branch.id);
  const { rows } = await db.query("SELECT name FROM locations WHERE name=$1", [branch.name]);
  assert.deepEqual(rows, [{ name: branch.name }]);
});

test("branch service sanitizes unexpected storage errors", async (t) => {
  const isolated = await testDatabase();
  t.after(async () => { if (!isolated.closed) await isolated.close(); });
  const isolatedContainer = testServiceContainer(isolated);
  t.after(() => isolatedContainer.destroy());
  const closedService = isolatedContainer.resolve(BranchService);
  await isolated.close();
  await assert.rejects(closedService.list(), hasError("BRANCH_STORAGE_ERROR", 500));
});
