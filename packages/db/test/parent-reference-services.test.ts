import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import type { Container } from "@napp/di";
import type { PGlite } from "@electric-sql/pglite";
import { NappError } from "@napp/error";
import {
  VehicleBrandService, VehicleModelService, VehicleVariantService,
  TireBrandService, TireModelService, PartCategoryService,
  type UpdateVehicleModelInput, type UpdateVehicleVariantInput,
  type UpdatePartCategoryInput,
} from "../src/index.js";
import { testDatabase, transaction } from "./support/database.js";
import { testServiceContainer } from "./support/di.js";

let db: PGlite;
let di: Container;
before(async () => { db = await testDatabase(); di = testServiceContainer(db); });
after(async () => { try { di?.destroy(); } finally { if (db && !db.closed) await db.close(); } });
function error(code: string, status: number) {
  return (value: unknown) => {
    assert.ok(value instanceof NappError);
    assert.equal(value.code, code);
    assert.equal(value.status, status);
    return true;
  };
}

test("vehicle models require an active brand, scope names and keep their brand immutable", async () => {
  const brands = di.resolve(VehicleBrandService);
  const models = di.resolve(VehicleModelService);
  const a = await brands.create({ name: "Model brand A" });
  const b = await brands.create({ name: "Model brand B" });
  await assert.rejects(models.create({ name: "Missing", brandId: randomUUID() }), error("VEHICLE_MODEL_PARENT_NOT_FOUND", 400));
  const model = await models.create({ name: "  Shared  ", brandId: a.id });
  const other = await models.create({ name: "Shared", brandId: b.id });
  assert.equal(model.name, "Shared");
  await assert.rejects(models.create({ name: " SHARED ", brandId: a.id }), error("VEHICLE_MODEL_NAME_CONFLICT", 409));
  assert.deepEqual((await models.list({ brandId: a.id })).map((r) => r.id), [model.id]);
  for (const brandId of [a.id, b.id, undefined]) {
    await assert.rejects(models.update(model.id, { name: "Rename", brandId } as UpdateVehicleModelInput), error("VEHICLE_MODEL_INVALID_INPUT", 400));
  }
  await brands.update(a.id, { isActive: false });
  await assert.rejects(models.create({ name: "Blocked", brandId: a.id }), error("VEHICLE_MODEL_PARENT_INACTIVE", 409));
  const changed = await models.update(model.id, { description: "  Still editable  " });
  assert.equal(changed.description, "Still editable");
  assert.equal(changed.brandId, a.id);
  assert.equal(changed.isActive, true);
  assert.equal((await models.list({ brandId: a.id })).length, 1);
  await models.delete(model.id);
  await models.delete(other.id);
});

test("vehicle variants validate both model and brand without cascading state", async () => {
  const brands = di.resolve(VehicleBrandService);
  const models = di.resolve(VehicleModelService);
  const variants = di.resolve(VehicleVariantService);
  const brand = await brands.create({ name: "Variant brand" });
  const model = await models.create({ name: "Variant model", brandId: brand.id });
  await assert.rejects(variants.create({ name: "Missing", modelId: randomUUID() }), error("VEHICLE_VARIANT_PARENT_NOT_FOUND", 400));
  const variant = await variants.create({ name: "Trim", modelId: model.id });
  await models.update(model.id, { isActive: false });
  await assert.rejects(variants.create({ name: "Blocked", modelId: model.id }), error("VEHICLE_VARIANT_PARENT_INACTIVE", 409));
  await models.update(model.id, { isActive: true });
  await brands.update(brand.id, { isActive: false });
  await assert.rejects(variants.create({ name: "Blocked ancestor", modelId: model.id }), error("VEHICLE_VARIANT_PARENT_INACTIVE", 409));
  const updated = await variants.update(variant.id, { name: "Renamed" });
  assert.equal(updated.isActive, true);
  assert.equal(updated.modelId, model.id);
  await assert.rejects(variants.update(variant.id, { name: "x", modelId: randomUUID() } as UpdateVehicleVariantInput), error("VEHICLE_VARIANT_INVALID_INPUT", 400));
  await assert.rejects(models.delete(model.id), error("VEHICLE_MODEL_IN_USE", 409));
});

test("tire models require an active tire brand and use parent-scoped names", async () => {
  const brands = di.resolve(TireBrandService);
  const models = di.resolve(TireModelService);
  const a = await brands.create({ name: "Tire model brand A" });
  const b = await brands.create({ name: "Tire model brand B" });
  await assert.rejects(models.create({ name: "Missing", brandId: randomUUID() }), error("TIRE_MODEL_PARENT_NOT_FOUND", 400));
  await models.create({ name: "Shared", brandId: a.id });
  await models.create({ name: "Shared", brandId: b.id });
  await assert.rejects(models.create({ name: " shared ", brandId: a.id }), error("TIRE_MODEL_NAME_CONFLICT", 409));
  await brands.update(a.id, { isActive: false });
  await assert.rejects(models.create({ name: "Blocked", brandId: a.id }), error("TIRE_MODEL_PARENT_INACTIVE", 409));
  assert.equal((await models.list({ brandId: a.id })).length, 1);
});

test("categories support roots and immediate children, scoped names and immutable parents", async () => {
  const categories = di.resolve(PartCategoryService);
  const a = await categories.create({ name: "Root A" });
  const b = await categories.create({ name: "Root B", parentId: null });
  assert.equal(a.parentId, null);
  const child = await categories.create({ name: "Shared", parentId: a.id });
  const sibling = await categories.create({ name: "Shared", parentId: b.id });
  await assert.rejects(categories.create({ name: " root a " }), error("PART_CATEGORY_NAME_CONFLICT", 409));
  await assert.rejects(categories.create({ name: " shared ", parentId: a.id }), error("PART_CATEGORY_NAME_CONFLICT", 409));
  await assert.rejects(categories.create({ name: "Missing", parentId: randomUUID() }), error("PART_CATEGORY_PARENT_NOT_FOUND", 400));
  assert.deepEqual((await categories.list({ rootOnly: true })).map((r) => r.id), [a.id, b.id]);
  assert.deepEqual((await categories.list({ parentId: a.id, rootOnly: false })).map((r) => r.id), [child.id]);
  assert.equal((await categories.list({ rootOnly: false })).length, 4);
  await assert.rejects(categories.list({ parentId: a.id, rootOnly: true }), error("PART_CATEGORY_INVALID_INPUT", 400));
  for (const parentId of [a.id, child.id, b.id, null, undefined]) {
    await assert.rejects(categories.update(a.id, { name: "x", parentId } as UpdatePartCategoryInput), error("PART_CATEGORY_INVALID_INPUT", 400));
  }
  await assert.rejects(categories.delete(a.id), error("PART_CATEGORY_IN_USE", 409));
  await categories.delete(sibling.id);
  await categories.delete(b.id);
});

test("category creation checks all ancestors but existing descendants remain editable", async () => {
  const categories = di.resolve(PartCategoryService);
  const root = await categories.create({ name: "Ancestor" });
  let parent = root;
  for (let depth = 0; depth < 5; depth++) parent = await categories.create({ name: `Depth ${depth}`, parentId: parent.id });
  await categories.update(root.id, { isActive: false });
  await assert.rejects(categories.create({ name: "Blocked", parentId: parent.id }), error("PART_CATEGORY_PARENT_INACTIVE", 409));
  const changed = await categories.update(parent.id, { description: "Updated", isActive: true });
  assert.equal(changed.isActive, true);
  assert.equal((await categories.list({ parentId: parent.id })).length, 0);
  await categories.update(root.id, { isActive: true });
  await categories.update(parent.id, { isActive: false });
  await assert.rejects(categories.create({ name: "Blocked direct", parentId: parent.id }), error("PART_CATEGORY_PARENT_INACTIVE", 409));
});

test("products and fitments protect all four dependent reference types", async () => {
  const brand = await di.resolve(VehicleBrandService).create({ name: "Linked brand" });
  const model = await di.resolve(VehicleModelService).create({ name: "Linked model", brandId: brand.id });
  const variant = await di.resolve(VehicleVariantService).create({ name: "Linked trim", modelId: model.id });
  const tireBrand = await di.resolve(TireBrandService).create({ name: "Linked tire brand" });
  const tireModel = await di.resolve(TireModelService).create({ name: "Linked tire model", brandId: tireBrand.id });
  const category = await di.resolve(PartCategoryService).create({ name: "Linked category" });
  const vehicleId = randomUUID(), tireId = randomUUID(), partId = randomUUID();
  await transaction(db, async () => {
    await db.query("INSERT INTO products (id, product_type, title) VALUES ($1, 'vehicle', 'Fixture'), ($2, 'tire', 'Fixture'), ($3, 'part', 'Fixture')", [vehicleId, tireId, partId]);
    await db.query("INSERT INTO vehicles (product_id, brand_id, model_id, variant_id) VALUES ($1,$2,$3,$4)", [vehicleId, brand.id, model.id, variant.id]);
    await db.query("INSERT INTO tires (product_id, brand_id, model_id) VALUES ($1,$2,$3)", [tireId, tireBrand.id, tireModel.id]);
    await db.query("INSERT INTO parts (product_id, category_id) VALUES ($1,$2)", [partId, category.id]);
    await db.query("INSERT INTO part_fitments (product_id, brand_id, model_id) VALUES ($1,$2,$3)", [partId, brand.id, model.id]);
  });
  await assert.rejects(di.resolve(VehicleModelService).delete(model.id), error("VEHICLE_MODEL_IN_USE", 409));
  await assert.rejects(di.resolve(VehicleVariantService).delete(variant.id), error("VEHICLE_VARIANT_IN_USE", 409));
  await assert.rejects(di.resolve(TireModelService).delete(tireModel.id), error("TIRE_MODEL_IN_USE", 409));
  await assert.rejects(di.resolve(PartCategoryService).delete(category.id), error("PART_CATEGORY_IN_USE", 409));
});

test("dependent services retain validation, not-found and storage error mapping", async () => {
  const services = [
    [di.resolve(VehicleModelService), "VEHICLE_MODEL"], [di.resolve(VehicleVariantService), "VEHICLE_VARIANT"],
    [di.resolve(TireModelService), "TIRE_MODEL"], [di.resolve(PartCategoryService), "PART_CATEGORY"],
  ] as const;
  for (const [service, code] of services) {
    await assert.rejects(service.update(randomUUID(), {}), error(`${code}_INVALID_INPUT`, 400));
    await assert.rejects(service.delete("invalid"), error(`${code}_INVALID_INPUT`, 400));
    await assert.rejects(service.list({ limit: 101 }), error(`${code}_INVALID_INPUT`, 400));
    await assert.rejects(service.update(randomUUID(), { name: "Missing" }), error(`${code}_NOT_FOUND`, 404));
    await assert.rejects(service.delete(randomUUID()), error(`${code}_NOT_FOUND`, 404));
  }
  await db.close();
  for (const [service, code] of services) await assert.rejects(service.list(), error(`${code}_STORAGE_ERROR`, 500));
});
