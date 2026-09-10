import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import type { PGlite } from "@electric-sql/pglite";
import type { Container } from "@napp/di";
import { NappError } from "@napp/error";
import {
  VehicleBrandService, VehicleBodyTypeService, VehicleFeatureService,
  PartBrandService, TireBrandService, LocationService,
  type CreateVehicleBrandInput, type UpdateVehicleBrandInput,
} from "../src/index.js";
import { testDatabase, transaction } from "./support/database.js";
import { testServiceContainer } from "./support/di.js";

type Service = Pick<VehicleBrandService, "list" | "create" | "update" | "delete">;
const references = [
  [VehicleBrandService, "VEHICLE_BRAND"], [VehicleBodyTypeService, "VEHICLE_BODY_TYPE"],
  [VehicleFeatureService, "VEHICLE_FEATURE"], [PartBrandService, "PART_BRAND"],
  [TireBrandService, "TIRE_BRAND"], [LocationService, "LOCATION"],
] as const;
let db: PGlite;
let di: Container;
before(async () => {
  db = await testDatabase();
  di = testServiceContainer(db);
});
after(async () => {
  try { di?.destroy(); } finally { if (db && !db.closed) await db.close(); }
});
function hasError(code: string, status: number) {
  return (error: unknown) => {
    assert.ok(error instanceof NappError);
    assert.equal(error.code, code);
    assert.equal(error.status, status);
    return true;
  };
}

for (const [ctor, code] of references) {
  test(`${code} resolves through DI and supports normalized CRUD and stable pagination`, async () => {
    const service = di.resolve<Service>(ctor);
    assert.equal(di.resolve<Service>(ctor), service);
    const a = await service.create({ name: "  Reference A  ", description: " " });
    const b = await service.create({ name: "Reference B" });
    assert.equal(a.name, "Reference A");
    assert.equal(a.description, null);
    assert.equal(a.sortOrder, 0);
    assert.equal(a.isActive, true);
    assert.ok(a.createdAt instanceof Date);
    assert.deepEqual((await service.list({ limit: 1, offset: 1 })).map((r) => r.id), [b.id]);
    const changed = await service.update(a.id, { description: "  Details  ", isActive: false });
    assert.equal(changed.description, "Details");
    const renamed = await service.update(a.id, { name: "Renamed", description: undefined });
    assert.equal(renamed.description, "Details");
    assert.equal(renamed.createdAt.getTime(), a.createdAt.getTime());
    assert.ok(renamed.updatedAt.getTime() >= a.updatedAt.getTime());
    assert.equal((await service.update(a.id, { description: " " })).description, null);
    assert.deepEqual((await service.list({ isActive: false })).map((r) => r.id), [a.id]);
    assert.deepEqual((await service.list({ isActive: true })).map((r) => r.id), [b.id]);
    assert.deepEqual(await service.list({ offset: 100 }), []);
    assert.equal((await service.delete(a.id)).id, a.id);
    await service.delete(b.id);
  });

  test(`${code} rejects invalid inputs and maps conflicts and missing records`, async () => {
    const service = di.resolve<Service>(ctor);
    for (const body of [
      {}, { name: " " }, { name: "x".repeat(256) }, { name: "x", description: "x".repeat(513) },
      { name: "x", sortOrder: 0.5 }, { name: "x", sortOrder: 2_147_483_648 },
      { name: "x", isActive: "true" }, { name: "x", hexCode: "#FFFFFF" }, { name: "x", parentId: randomUUID() },
    ]) await assert.rejects(service.create(body as CreateVehicleBrandInput), hasError(`${code}_INVALID_INPUT`, 400));
    for (const patch of [{}, { name: undefined }, { id: randomUUID() }]) {
      await assert.rejects(service.update(randomUUID(), patch as UpdateVehicleBrandInput), hasError(`${code}_INVALID_INPUT`, 400));
    }
    for (const query of [{ limit: 0 }, { limit: 101 }, { offset: -1 }, { offset: NaN }]) {
      await assert.rejects(service.list(query), hasError(`${code}_INVALID_INPUT`, 400));
    }
    await assert.rejects(service.delete("invalid"), hasError(`${code}_INVALID_INPUT`, 400));
    await assert.rejects(service.update("invalid", { name: "x" }), hasError(`${code}_INVALID_INPUT`, 400));
    const a = await service.create({ name: "Unique" });
    const b = await service.create({ name: "Other" });
    await assert.rejects(service.create({ name: " UNIQUE " }), hasError(`${code}_NAME_CONFLICT`, 409));
    await assert.rejects(service.update(b.id, { name: "unique" }), hasError(`${code}_NAME_CONFLICT`, 409));
    await assert.rejects(service.update(randomUUID(), { name: "Missing" }), hasError(`${code}_NOT_FOUND`, 404));
    await service.delete(a.id);
    await service.delete(b.id);
    await assert.rejects(service.delete(a.id), hasError(`${code}_NOT_FOUND`, 404));
  });
}

test("flat references cannot be deleted while products, models or feature links use them", async () => {
  async function product(type: "vehicle" | "part" | "tire", column?: string, ref?: string) {
    const id = randomUUID();
    const table = { vehicle: "vehicles", part: "parts", tire: "tires" }[type];
    await transaction(db, async () => {
      await db.query("INSERT INTO products (id, product_type, title) VALUES ($1, $2, 'Reference fixture')", [id, type]);
      if (column) await db.query(`INSERT INTO ${table} (product_id, ${column}) VALUES ($1, $2)`, [id, ref]);
      else await db.query(`INSERT INTO ${table} (product_id) VALUES ($1)`, [id]);
    });
    return id;
  }
  const cases = [
    [VehicleBrandService, "VEHICLE_BRAND", async (id: string) => { await product("vehicle", "brand_id", id); }],
    [VehicleBrandService, "VEHICLE_BRAND", async (id: string) => { await db.query("INSERT INTO vehicle_models (name, brand_id) VALUES ('Model fixture', $1)", [id]); }],
    [VehicleBodyTypeService, "VEHICLE_BODY_TYPE", async (id: string) => { await product("vehicle", "body_type_id", id); }],
    [VehicleFeatureService, "VEHICLE_FEATURE", async (id: string) => {
      await db.query("INSERT INTO vehicle_feature_links (product_id, feature_id) VALUES ($1, $2)", [await product("vehicle"), id]);
    }],
    [PartBrandService, "PART_BRAND", async (id: string) => { await product("part", "brand_id", id); }],
    [TireBrandService, "TIRE_BRAND", async (id: string) => { await product("tire", "brand_id", id); }],
    [TireBrandService, "TIRE_BRAND", async (id: string) => { await db.query("INSERT INTO tire_models (name, brand_id) VALUES ('Tire model fixture', $1)", [id]); }],
    ...(["vehicle", "part", "tire"] as const).map((type) =>
      [LocationService, "LOCATION", async (id: string) => { await product(type, "location_id", id); }] as const),
  ] as const;
  for (const [ctor, code, link] of cases) {
    const service = di.resolve<Service>(ctor);
    const row = await service.create({ name: randomUUID() });
    await link(row.id);
    await assert.rejects(service.delete(row.id), hasError(`${code}_IN_USE`, 409));
    assert.equal((await service.update(row.id, { isActive: false })).isActive, false);
  }
});

test("location CRUD does not change company branches with the same name", async () => {
  await db.query("INSERT INTO branches (name) VALUES ('Same name')");
  const service = di.resolve(LocationService);
  const row = await service.create({ name: "Same name" });
  await service.delete(row.id);
  assert.deepEqual((await db.query("SELECT name FROM branches WHERE name='Same name'")).rows, [{ name: "Same name" }]);
});

test("all flat reference services sanitize storage errors", async () => {
  await db.close();
  for (const [ctor, code] of references) {
    await assert.rejects(di.resolve<Service>(ctor).list(), hasError(`${code}_STORAGE_ERROR`, 500));
  }
});
