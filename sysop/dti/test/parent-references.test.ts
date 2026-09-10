import assert from "node:assert/strict";
import { test } from "node:test";
import { VehicleModels, VehicleVariants, TireModels, PartCategories } from "../src/index.js";

const id = "d4ea26c2-52a0-4223-8cc1-d649b84281d1";
const row = {
  id, name: "Reference", description: null, sortOrder: 0, isActive: true,
  createdAt: "2026-09-11T00:00:00.000Z", updatedAt: "2026-09-11T00:00:00.000Z",
};
for (const [contract, prefix, path, parentKey] of [
  [VehicleModels, "vehicleModel", "/vehicle-models", "brandId"],
  [VehicleVariants, "vehicleVariant", "/vehicle-variants", "modelId"],
  [TireModels, "tireModel", "/tire-models", "brandId"],
  [PartCategories, "partCategory", "/part-categories", "parentId"],
] as const) {
  test(`${prefix} exposes CRUD actions with immutable parent input and JSON results`, () => {
    for (const [action, suffix, method, url] of [
      [contract.list, "List", "GET", path], [contract.create, "Create", "POST", path],
      [contract.update, "Update", "PATCH", `${path}/:id`], [contract.remove, "Delete", "DELETE", `${path}/:id`],
    ] as const) {
      assert.equal(action.name, `${prefix}${suffix}`);
      assert.equal(action.method, method);
      assert.equal(action.path, url);
    }
    assert.deepEqual(contract.createBody.parse({ name: "  Reference  ", [parentKey]: id }), { name: "Reference", [parentKey]: id });
    assert.deepEqual(contract.entity.parse({ ...row, [parentKey]: id }), { ...row, [parentKey]: id });
    assert.equal(contract.entity.safeParse({ ...row, [parentKey]: id, createdAt: new Date() }).success, false);
    assert.equal(contract.updateBody.safeParse({ [parentKey]: id, name: "Rename" }).success, false);
    assert.equal(contract.updateBody.safeParse({ [parentKey]: undefined, name: "Rename" }).success, false);
    assert.equal(contract.updateBody.safeParse({}).success, false);
    assert.equal(contract.updateBody.safeParse({ name: undefined }).success, false);
    assert.deepEqual(contract.updateBody.parse({ description: " " }), { description: null });
    for (const value of ["", "invalid", 1, [id]]) {
      assert.equal(contract.createBody.safeParse({ name: "x", [parentKey]: value }).success, false);
      assert.equal(contract.listQuery.safeParse({ [parentKey]: value }).success, false);
    }
    assert.deepEqual(contract.listQuery.parse({ [parentKey]: id, limit: "10", isActive: "false" }), {
      [parentKey]: id, limit: 10, offset: 0, isActive: false,
    });
    assert.equal(contract.listQuery.safeParse({ [parentKey]: null }).success, false);
  });
}

test("models and variants require their parent while categories default to roots", () => {
  for (const contract of [VehicleModels, VehicleVariants, TireModels]) {
    assert.equal(contract.createBody.safeParse({ name: "Missing" }).success, false);
  }
  assert.deepEqual(PartCategories.createBody.parse({ name: "Root" }), { name: "Root", parentId: null });
  assert.equal(PartCategories.createBody.safeParse({ name: "Root", parentId: null }).success, true);
  assert.equal(PartCategories.entity.safeParse({ ...row, parentId: null }).success, true);
  assert.equal(PartCategories.entity.safeParse(row).success, false);
});

test("category root filtering has explicit wire boolean and parent exclusivity", () => {
  for (const rootOnly of [true, "true"]) {
    assert.equal(PartCategories.listQuery.parse({ rootOnly }).rootOnly, true);
    assert.equal(PartCategories.listQuery.safeParse({ rootOnly, parentId: id }).success, false);
  }
  for (const rootOnly of [false, "false"]) {
    assert.equal(PartCategories.listQuery.parse({ rootOnly, parentId: id }).rootOnly, false);
  }
  for (const rootOnly of ["", "1", "FALSE", null, [], {}]) {
    assert.equal(PartCategories.listQuery.safeParse({ rootOnly }).success, false);
  }
});
