import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { Container } from "@napp/di";
import { drizzle } from "drizzle-orm/pglite";
import { eq } from "drizzle-orm";
import { testDatabase } from "./support/database.js";
import { TKN_DB, type BigMotorsDb } from "../src/db.js";
import { PublicVehicleService, PublicVehicleQueryError } from "../src/service/public-vehicle.js";
import * as s from "../src/schema/index.js";

test("public vehicle queries enforce visibility, privacy, bounds, filters and active lookup ancestry", async () => {
  const db = await testDatabase();
  const orm = drizzle(db, { schema: s });
  const di = new Container("public-test").asValue(TKN_DB, orm as unknown as BigMotorsDb).asClass(PublicVehicleService);
  const service = di.resolve(PublicVehicleService);
  try {
    const [brand] = await orm.insert(s.vehicleBrands).values({ name: "Brand" }).returning();
    const [model] = await orm.insert(s.vehicleModels).values({ name: "Model", brandId: brand!.id }).returning();
    const [variant] = await orm.insert(s.vehicleVariants).values({ name: "Variant", modelId: model!.id }).returning();
    const [color] = await orm.insert(s.colors).values({ name: "Color" }).returning();
    const [body] = await orm.insert(s.vehicleBodyTypes).values({ name: "Body" }).returning();
    const [file] = await orm.insert(s.files).values({ filePath: "private/disk/path", originalName: "photo name.jpg", usage: [] }).returning();
    const ids = Array.from({ length: 49 }, () => randomUUID());
    await orm.transaction(async (tx) => {
      for (let i = 0; i < ids.length; i++) {
        await tx.insert(s.products).values({ id: ids[i], productType: "vehicle", title: `Vehicle ${i}`, publicationStatus: i === 45 ? "draft" : i === 46 ? "hidden" : i === 47 ? "archived" : "published", mainImageId: file!.id,
          firstPublishedAt: new Date("2026-01-01T00:00:00Z"), priceDisplayMode: i === 0 ? "inquire" : "show_price", price: 10_000_000 + i, currency: "MNT", internalNote: "PRIVATE-NOTE", content: "PRIVATE-CONTENT" });
        await tx.insert(s.vehicles).values({ productId: ids[i]!, brandId: brand!.id, modelId: model!.id, variantId: variant!.id, bodyTypeId: body!.id, exteriorColorId: color!.id, manufactureYear: 2020,
          fuelType: i === 0 ? "electric" : "gasoline", engineCapacityCc: i === 0 ? null : 2000, transmission: i === 0 ? null : "automatic", drivetrain: "awd", steeringPosition: "left", condition: i % 2 === 0 ? "new" : "used", mileageKm: i * 100,
          saleStatus: i === 48 ? "sold" : "available", arrivalStatus: "expected", vin: "PRIVATE-VIN" });
        await tx.insert(s.productImages).values({ productId: ids[i]!, fileId: file!.id, sortOrder: 0 });
      }
    });
    const first = await service.list();
    assert.equal(first.total, 45); assert.equal(first.pageSize, 12); assert.equal(first.pageCount, 3); assert.equal(first.items.length, 12);
    const second = await service.list({ page: "2" }); const third = await service.list({ page: 3 });
    assert.equal(new Set([...first.items, ...second.items, ...third.items].map((item) => item.id)).size, 36);
    assert.deepEqual(first.items.map((item) => item.id), ids.slice(0, 45).sort().slice(0, 12));
    assert.equal(first.items[0]!.imageCount, 1);
    assert.doesNotMatch(JSON.stringify(first), /PRIVATE|private\/disk|filePath|internalNote|"vin"|"content"|"usage"/);
    assert.equal((await service.list({ fuel: "electric" })).items[0]!.price, null);
    assert.equal((await service.list({ price_min: "0" })).total, 44);
    assert.equal((await service.list({ mileage_min: "0", mileage_max: "0" })).total, 1);
    assert.equal((await service.list({ engine_min: "2000", engine_max: "2000" })).total, 44);
    assert.equal((await service.list({ brand: brand!.id, model: model!.id, variant: variant!.id, category: body!.id, color: color!.id, condition: "used", drivetrain: "awd", steering: "left", transmission: "automatic", year_min: "2020", year_max: "2020" })).total, 22);
    const empty = await service.list({ brand: randomUUID(), page: 3 });
    assert.deepEqual([empty.total, empty.pageCount, empty.page, empty.items.length], [0, 0, 1, 0]);
    assert.equal((await service.list({ fuel: "electric", page: 3 })).page, 1);
    for (const bad of [{ page: 4 }, { price_min: "-1" }, { mileage_min: 100, mileage_max: 1 }, { brand: "bad" }, { publicationStatus: "draft" }, { limit: 1000 }, { fuel: "invalid" }]) await assert.rejects(service.list(bad as never), PublicVehicleQueryError);
    const lookups = await service.lookups();
    assert.equal(lookups.models[0]!.brandId, brand!.id); assert.equal(lookups.variants[0]!.modelId, model!.id);
    await orm.update(s.vehicleBrands).set({ isActive: false }).where(eq(s.vehicleBrands.id, brand!.id));
    const inactive = await service.lookups();
    assert.equal(inactive.brands.length + inactive.models.length + inactive.variants.length, 0);
    assert.equal((await service.list()).total, 45);
  } finally { di.destroy(); await db.close(); }
});
