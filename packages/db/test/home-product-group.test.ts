import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { Container } from "@napp/di";
import { drizzle } from "drizzle-orm/pglite";
import { eq } from "drizzle-orm";
import { testDatabase } from "./support/database.js";
import { TKN_DB, type BigMotorsDb } from "../src/db.js";
import { HomeProductGroupService } from "../src/service/home-product-group.js";
import * as s from "../src/schema/index.js";

test("home groups CRUD validates filters and tracks image usage transactionally", async () => {
  const db = await testDatabase(); const orm = drizzle(db, { schema: s });
  const di = new Container("group-test").asValue(TKN_DB, orm as unknown as BigMotorsDb).asClass(HomeProductGroupService);
  const service = di.resolve(HomeProductGroupService);
  try {
    const [brand] = await orm.insert(s.vehicleBrands).values({ name: "Brand" }).returning();
    const [otherBrand] = await orm.insert(s.vehicleBrands).values({ name: "Other" }).returning();
    const [model] = await orm.insert(s.vehicleModels).values({ name: "Model", brandId: brand!.id }).returning();
    const [variant] = await orm.insert(s.vehicleVariants).values({ name: "Variant", modelId: model!.id }).returning();
    const [image] = await orm.insert(s.files).values({ filePath: "groups/1", originalName: "image.jpg" }).returning();
    const [image2] = await orm.insert(s.files).values({ filePath: "groups/2", originalName: "second.jpg" }).returning();
    const row = await service.create({ title: " Group ", imageId: image!.id, filters: { brand: brand!.id, model: model!.id, variant: variant!.id, fuel: "gasoline", engine_max: "2000", mileage_min: "0" }, sortOrder: 2 });
    assert.equal(row.title, "Group"); assert.equal(row.filters.engine_max, "2000");
    assert.equal((await service.findById(row.id)).filters.mileage_min, "0");
    assert.deepEqual((await orm.select().from(s.files).where(eq(s.files.id, image!.id)))[0]!.usage, [row.id]);
    await assert.rejects(service.update(row.id, { imageId: randomUUID() }), { code: "HOME_GROUP_REFERENCE_NOT_FOUND" });
    assert.equal((await service.findById(row.id)).imageId, image!.id);
    const updated = await service.update(row.id, { imageId: image2!.id, filters: { fuel: "electric" }, isActive: false });
    assert.deepEqual(updated.filters, { fuel: "electric" });
    assert.equal(updated.createdAt.getTime(), row.createdAt.getTime()); assert.ok(updated.updatedAt >= row.updatedAt);
    assert.deepEqual((await orm.select().from(s.files).where(eq(s.files.id, image!.id)))[0]!.usage, []);
    assert.deepEqual((await orm.select().from(s.files).where(eq(s.files.id, image2!.id)))[0]!.usage, [row.id]);
    assert.equal((await service.list({ isActive: true })).length, 0);
    assert.equal((await service.list({ search: "Grou", isActive: false })).length, 1);
    for (const filters of [{ brand: randomUUID() }, { brand: otherBrand!.id, model: model!.id }, { brand: otherBrand!.id, variant: variant!.id }]) await assert.rejects(service.create({ title: "Invalid", filters }), { code: "HOME_GROUP_INVALID_REFERENCE" });
    for (const filters of [{ page: "1" }, { sql: "select *" }, { engine_min: "3000", engine_max: "1000" }, { price_min: "-1" }, { mileage_min: 0 }]) await assert.rejects(service.create({ title: "Invalid", filters } as never), { code: "HOME_GROUP_INVALID_INPUT" });
    await assert.rejects(service.update(row.id, {}), { code: "HOME_GROUP_INVALID_INPUT" });
    const all = await service.create({ title: "All vehicles", filters: {}, sortOrder: -1 });
    assert.equal((await service.list())[0]!.id, all.id);
    await service.delete(row.id);
    assert.deepEqual((await orm.select().from(s.files).where(eq(s.files.id, image2!.id)))[0]!.usage, []);
    await assert.rejects(service.findById(row.id), { code: "HOME_GROUP_NOT_FOUND" });
    await service.delete(all.id);
  } finally { di.destroy(); await db.close(); }
});
