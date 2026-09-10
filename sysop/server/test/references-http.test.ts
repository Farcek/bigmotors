import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { createServer } from "node:http";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { TKN_DB, type BigMotorsDb } from "@bigmotors/db";
import * as schema from "@bigmotors/db/schema";
import { VehicleBrands, VehicleBodyTypes, VehicleFeatures, PartBrands, TireBrands, Locations } from "@bigmotors/sysop-dti";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { createApp } from "../src/app.js";
import { createContainer } from "../src/di.js";

const references = [
  ["vehicle-brands", VehicleBrands, "VEHICLE_BRAND", "vehicle", "brand_id"],
  ["vehicle-body-types", VehicleBodyTypes, "VEHICLE_BODY_TYPE", "vehicle", "body_type_id"],
  ["vehicle-features", VehicleFeatures, "VEHICLE_FEATURE", "vehicle", null],
  ["part-brands", PartBrands, "PART_BRAND", "part", "brand_id"],
  ["tire-brands", TireBrands, "TIRE_BRAND", "tire", "brand_id"],
  ["locations", Locations, "LOCATION", "vehicle", "location_id"],
] as const;

test("six flat reference APIs use production DI and services over HTTP", async (t) => {
  const db = new PGlite();
  const root = createContainer({ env: {} });
  // Replace only the driver; all real service providers and routes remain registered.
  const orm = drizzle(db, { schema });
  const di = root.child("references-http-test").asValue(TKN_DB, orm as unknown as BigMotorsDb);
  const server = createServer(createApp(di));
  t.after(async () => {
    try {
      if (server.listening) await new Promise<void>((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
        server.closeAllConnections();
      });
    } finally {
      try { root.destroy(); } finally { if (!db.closed) await db.close(); }
    }
  });
  await migrate(orm, { migrationsFolder: fileURLToPath(new URL("../../../packages/db/migrations/", import.meta.url)) });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}/api`;
  async function request(method: string, path: string, body?: unknown) {
    const response = await fetch(`${base}/${path}`, {
      method,
      ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
    });
    return { status: response.status, body: await response.json() as unknown };
  }
  function data(result: Awaited<ReturnType<typeof request>>) {
    assert.equal(result.status, 200, JSON.stringify(result.body));
    assert.ok(typeof result.body === "object" && result.body !== null);
    assert.ok("success" in result.body && result.body.success === true);
    assert.ok("data" in result.body);
    return result.body.data;
  }
  function failure(result: Awaited<ReturnType<typeof request>>, status: number, code: string) {
    assert.equal(result.status, status, JSON.stringify(result.body));
    assert.ok(typeof result.body === "object" && result.body !== null);
    assert.ok("success" in result.body && result.body.success === false);
    assert.ok("code" in result.body);
    assert.equal(result.body.code, code);
    for (const key of ["cause", "stack", "details"]) assert.equal(key in result.body, false);
  }

  for (const [path, contract, code, type, column] of references) {
    await t.test(`${path}: CRUD, JSON dates, pagination and active filtering`, async () => {
      assert.deepEqual(contract.listResult.parse(data(await request("GET", path))), []);
      const a = contract.entity.parse(data(await request("POST", path, { name: "  Reference A  " })));
      const b = contract.entity.parse(data(await request("POST", path, { name: "Reference B", sortOrder: 1 })));
      assert.equal(a.name, "Reference A");
      assert.equal(a.description, null);
      assert.equal(a.sortOrder, 0);
      assert.equal(a.isActive, true);
      assert.equal(new Date(a.createdAt).toISOString(), a.createdAt);
      const changed = contract.entity.parse(data(await request("PATCH", `${path}/${a.id}`, { description: " Details ", isActive: false })));
      assert.equal(changed.name, a.name);
      assert.equal(changed.createdAt, a.createdAt);
      assert.equal(changed.description, "Details");
      assert.ok(Date.parse(changed.updatedAt) >= Date.parse(a.updatedAt));
      assert.deepEqual(contract.listResult.parse(data(await request("GET", `${path}?limit=1&offset=1`))), [b]);
      assert.deepEqual(contract.listResult.parse(data(await request("GET", `${path}?isActive=false`))), [changed]);
      assert.deepEqual(contract.listResult.parse(data(await request("GET", `${path}?isActive=true`))), [b]);
      const cleared = contract.entity.parse(data(await request("PATCH", `${path}/${a.id}`, { description: " " })));
      assert.equal(cleared.description, null);
      assert.deepEqual(contract.entity.parse(data(await request("DELETE", `${path}/${a.id}`))), cleared);
      data(await request("DELETE", `${path}/${b.id}`));
      assert.deepEqual(data(await request("GET", path)), []);
    });

    await t.test(`${path}: validation, duplicate and missing record responses`, async () => {
      for (const body of [{}, { name: " " }, { name: "x", parentId: randomUUID() }, { name: "x", hexCode: "#FFFFFF" }]) {
        failure(await request("POST", path, body), 400, "DTI_BODY_VALIDATE_ERROR");
      }
      failure(await request("PATCH", `${path}/${randomUUID()}`, {}), 400, "DTI_BODY_VALIDATE_ERROR");
      failure(await request("DELETE", `${path}/invalid`), 400, "DTI_PATH_PARAMS_VALIDATE_ERROR");
      for (const query of ["limit=101", "offset=-1", "isActive=invalid"]) {
        failure(await request("GET", `${path}?${query}`), 400, "DTI_QUERY_VALIDATE_ERROR");
      }
      const a = contract.entity.parse(data(await request("POST", path, { name: "Unique" })));
      const b = contract.entity.parse(data(await request("POST", path, { name: "Other" })));
      failure(await request("POST", path, { name: " UNIQUE " }), 409, `${code}_NAME_CONFLICT`);
      failure(await request("PATCH", `${path}/${b.id}`, { name: a.name }), 409, `${code}_NAME_CONFLICT`);
      failure(await request("PATCH", `${path}/${randomUUID()}`, { name: "Missing" }), 404, `${code}_NOT_FOUND`);
      data(await request("DELETE", `${path}/${a.id}`));
      data(await request("DELETE", `${path}/${b.id}`));
      failure(await request("DELETE", `${path}/${a.id}`), 404, `${code}_NOT_FOUND`);
    });

    await t.test(`${path}: referenced values return 409 but allow deactivation`, async () => {
      const row = contract.entity.parse(data(await request("POST", path, { name: "Referenced" })));
      const productId = randomUUID();
      const table = { vehicle: "vehicles", part: "parts", tire: "tires" }[type];
      await db.transaction(async (tx) => {
        await tx.query("INSERT INTO products (id, product_type, title) VALUES ($1, $2, 'HTTP reference fixture')", [productId, type]);
        if (column) await tx.query(`INSERT INTO ${table} (product_id, ${column}) VALUES ($1, $2)`, [productId, row.id]);
        else {
          await tx.query("INSERT INTO vehicles (product_id) VALUES ($1)", [productId]);
          await tx.query("INSERT INTO vehicle_feature_links (product_id, feature_id) VALUES ($1, $2)", [productId, row.id]);
        }
      });
      failure(await request("DELETE", `${path}/${row.id}`), 409, `${code}_IN_USE`);
      assert.equal(contract.entity.parse(data(await request("PATCH", `${path}/${row.id}`, { isActive: false }))).isActive, false);
    });
  }

  await t.test("all six endpoints preserve safe storage errors", async () => {
    await db.close();
    for (const [path, , code] of references) {
      failure(await request("GET", path), 500, `${code}_STORAGE_ERROR`);
    }
  });
});
