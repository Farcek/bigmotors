import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { createServer } from "node:http";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { TKN_DB, type BigMotorsDb } from "@bigmotors/db";
import * as schema from "@bigmotors/db/schema";
import { HomeProductGroups } from "@bigmotors/sysop-dti";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { createApp } from "../src/app.js";
import { createContainer } from "../src/di.js";
import { seedReferences } from "../../../packages/db/src/seeds/run.js";
import { demoVehicles, demoVehicleBody } from "../src/dev/vehicle-data.js";
import { planDemoProductGroups, indexDemoProductGroups, importDemoProductGroups } from "../src/dev/product-group-data.js";

test("home product group HTTP CRUD uses DI, filter contracts and file usage", async (t) => {
  const db = new PGlite(); const root = createContainer({ env: {} }); const orm = drizzle(db, { schema });
  const di = root.child("home-group-http").asValue(TKN_DB, orm as unknown as BigMotorsDb);
  const server = createServer(createApp(di));
  t.after(async () => {
    if (server.listening) await new Promise<void>(resolve => { server.close(() => resolve()); server.closeAllConnections(); });
    root.destroy(); await db.close();
  });
  await migrate(orm, { migrationsFolder: fileURLToPath(new URL("../../../packages/db/migrations/", import.meta.url)) });
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  const address = server.address(); assert.ok(address && typeof address !== "string");
  async function request(method: string, path: string, body?: unknown, status = 200) {
    const response = await fetch(`http://127.0.0.1:${(address as { port: number }).port}/api/home-product-groups${path}`, {
      method, ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
    });
    const result = await response.json() as { success: boolean; data?: unknown; code?: string; stack?: unknown };
    assert.equal(response.status, status, JSON.stringify(result)); assert.equal(result.success, status === 200); assert.equal(result.stack, undefined);
    return result.data;
  }
  const imageId = randomUUID();
  await db.query("INSERT INTO files (id,file_path,original_name) VALUES ($1,'group/http','image.jpg')", [imageId]);
  const row = HomeProductGroups.entity.parse(await request("POST", "", { title: "Electric", filters: { fuel: "electric", mileage_min: "0" }, imageId }));
  assert.equal(row.filters.mileage_min, "0");
  assert.deepEqual(HomeProductGroups.entity.parse(await request("GET", `/${row.id}`)), row);
  assert.equal(HomeProductGroups.listResult.parse(await request("GET", "?search=Electric&isActive=true")).length, 1);
  for (const filters of [{ page: "1" }, { sql: "select *" }, { engine_min: "10", engine_max: "1" }, { mileage_min: 0 }, { brand: "invalid" }]) await request("POST", "", { title: "Bad", filters }, 400);
  await request("GET", "?limit=101", undefined, 400);
  await request("PATCH", `/${row.id}`, {}, 400);
  await request("PATCH", `/${row.id}`, { imageId: randomUUID() }, 409);
  const updated = HomeProductGroups.entity.parse(await request("PATCH", `/${row.id}`, { filters: { engine_max: "2000" }, isActive: false, imageId: null }));
  assert.deepEqual(updated.filters, { engine_max: "2000" }); assert.equal(updated.imageId, null);
  assert.equal(HomeProductGroups.listResult.parse(await request("GET", "?isActive=true")).length, 0);
  await request("DELETE", `/${row.id}`);
  await request("GET", `/${row.id}`, undefined, 404);
  assert.deepEqual((await db.query("SELECT usage FROM files WHERE id=$1", [imageId])).rows, [{ usage: [] }]);

  await seedReferences(orm as unknown as BigMotorsDb);
  const brands = await orm.select().from(schema.vehicleBrands);
  const models = await orm.select().from(schema.vehicleModels);
  const bodies = await orm.select().from(schema.vehicleBodyTypes);
  const planned = planDemoProductGroups(demoVehicles.map((car) => {
    const brandId = brands.find((row) => row.name === car.brand)!.id;
    return { car, body: demoVehicleBody(car, { brandId,
      modelId: models.find((row) => row.brandId === brandId && row.name === car.model)!.id,
      bodyTypeId: bodies.find((row) => row.name === car.bodyType)!.id, exteriorColorId: randomUUID() }) };
  }));
  const images = new Map(demoVehicles.map((car) => [car.key, imageId]));
  const summary = { created: 0, skipped: 0 };
  await importDemoProductGroups({ planned, existing: new Map(), imageIds: images, summary,
    create: (body) => request("POST", "", body) });
  assert.deepEqual(summary, { created: 10, skipped: 0 });
  const all = HomeProductGroups.listResult.parse(await request("GET", "?limit=100"));
  assert.equal(all.length, 10);
  assert.equal(HomeProductGroups.listResult.parse(await request("GET", "?isActive=true")).length, 8);
  assert.equal(HomeProductGroups.listResult.parse(await request("GET", "?isActive=false")).length, 2);
  const rerun = { created: 0, skipped: 0 };
  await importDemoProductGroups({ planned, existing: indexDemoProductGroups(all), imageIds: images, summary: rerun,
    create: () => { throw new Error("Rerun should not POST"); } });
  assert.deepEqual(rerun, { created: 0, skipped: 10 });
  const [storedFile] = (await db.query<{ usage: string[] }>("SELECT usage FROM files WHERE id=$1", [imageId])).rows;
  assert.ok(storedFile);
  assert.deepEqual(new Set(storedFile.usage), new Set(all.map((row) => row.id)));
});
