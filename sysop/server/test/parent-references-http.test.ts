import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { createServer } from "node:http";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { TKN_DB, type BigMotorsDb } from "@bigmotors/db";
import * as schema from "@bigmotors/db/schema";
import { VehicleModels, VehicleVariants, TireModels, PartCategories } from "@bigmotors/sysop-dti";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { createApp } from "../src/app.js";
import { createContainer } from "../src/di.js";

const references = [
  ["vehicle-models", VehicleModels, "VEHICLE_MODEL", "brandId", "vehicle-brands"],
  ["vehicle-variants", VehicleVariants, "VEHICLE_VARIANT", "modelId", "vehicle-models"],
  ["tire-models", TireModels, "TIRE_MODEL", "brandId", "tire-brands"],
  ["part-categories", PartCategories, "PART_CATEGORY", "parentId", "part-categories"],
] as const;

test("dependent reference HTTP APIs enforce immutable parents and ancestry", async (t) => {
  const db = new PGlite();
  const root = createContainer({ env: {} });
  const orm = drizzle(db, { schema });
  // Run real providers, handlers and validation against an isolated test driver.
  const di = root.child("parent-reference-http-test").asValue(TKN_DB, orm as unknown as BigMotorsDb);
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
      method, ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
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
  async function create(path: string, input: Record<string, unknown>) {
    const row = data(await request("POST", path, input));
    assert.ok(typeof row === "object" && row !== null && "id" in row && typeof row.id === "string");
    return row.id;
  }
  async function parent(path: string) {
    const name = randomUUID();
    const input = path === "vehicle-models"
      ? { name, brandId: await create("vehicle-brands", { name: randomUUID() }) }
      : { name };
    return create(path, input);
  }

  for (const [path, contract, code, parentKey, parentPath] of references) {
    await t.test(`${path}: scoped uniqueness, parent filtering, immutable patch and CRUD`, async () => {
      const a = await parent(parentPath), b = await parent(parentPath);
      const first = contract.entity.parse(data(await request("POST", path, { name: " Shared ", [parentKey]: a })));
      const sameName = contract.entity.parse(data(await request("POST", path, { name: "Shared", [parentKey]: b })));
      const second = contract.entity.parse(data(await request("POST", path, { name: "Second", [parentKey]: a, sortOrder: 1 })));
      assert.equal(first.name, "Shared");
      assert.equal(Reflect.get(first, parentKey), a);
      assert.equal(new Date(first.createdAt).toISOString(), first.createdAt);
      failure(await request("POST", path, { name: " SHARED ", [parentKey]: a }), 409, `${code}_NAME_CONFLICT`);
      failure(await request("PATCH", `${path}/${second.id}`, { name: "shared" }), 409, `${code}_NAME_CONFLICT`);
      for (const id of [a, b, first.id, null]) {
        failure(await request("PATCH", `${path}/${first.id}`, { name: "Changed", [parentKey]: id }), 400, "DTI_BODY_VALIDATE_ERROR");
      }
      const changed = contract.entity.parse(data(await request("PATCH", `${path}/${first.id}`, { description: " Detail ", isActive: false })));
      assert.equal(changed.description, "Detail");
      assert.equal(changed.createdAt, first.createdAt);
      assert.equal(Reflect.get(changed, parentKey), a);
      assert.ok(Date.parse(changed.updatedAt) >= Date.parse(first.updatedAt));
      assert.deepEqual(contract.listResult.parse(data(await request("GET", `${path}?${parentKey}=${a}&isActive=false`))), [changed]);
      assert.deepEqual(contract.listResult.parse(data(await request("GET", `${path}?${parentKey}=${a}&limit=1&offset=1`))), [second]);
      assert.deepEqual(contract.listResult.parse(data(await request("GET", `${path}?${parentKey}=${b}`))), [sameName]);
      const cleared = contract.entity.parse(data(await request("PATCH", `${path}/${first.id}`, { description: null })));
      assert.equal(cleared.description, null);
      assert.deepEqual(contract.entity.parse(data(await request("DELETE", `${path}/${first.id}`))), cleared);
      data(await request("DELETE", `${path}/${second.id}`));
      data(await request("DELETE", `${path}/${sameName.id}`));
      failure(await request("DELETE", `${path}/${first.id}`), 404, `${code}_NOT_FOUND`);
      failure(await request("PATCH", `${path}/${randomUUID()}`, { name: "Missing" }), 404, `${code}_NOT_FOUND`);
    });

    await t.test(`${path}: missing or inactive parents are rejected but existing children remain editable`, async () => {
      const id = await parent(parentPath);
      failure(await request("POST", path, { name: "Missing", [parentKey]: randomUUID() }), 400, `${code}_PARENT_NOT_FOUND`);
      failure(await request("POST", path, { name: "Invalid", [parentKey]: "invalid" }), 400, "DTI_BODY_VALIDATE_ERROR");
      failure(await request("GET", `${path}?${parentKey}=invalid`), 400, "DTI_QUERY_VALIDATE_ERROR");
      const child = contract.entity.parse(data(await request("POST", path, { name: "Existing", [parentKey]: id })));
      data(await request("PATCH", `${parentPath}/${id}`, { isActive: false }));
      failure(await request("POST", path, { name: "Blocked", [parentKey]: id }), 409, `${code}_PARENT_INACTIVE`);
      const changed = contract.entity.parse(data(await request("PATCH", `${path}/${child.id}`, { description: "Editable" })));
      assert.equal(changed.isActive, true);
      assert.equal(Reflect.get(changed, parentKey), id);
      data(await request("DELETE", `${path}/${child.id}`));
    });
  }

  await t.test("variants reject an inactive brand ancestor", async () => {
    const brandId = await create("vehicle-brands", { name: "Ancestor brand" });
    const modelId = await create("vehicle-models", { name: "Ancestor model", brandId });
    data(await request("PATCH", `vehicle-brands/${brandId}`, { isActive: false }));
    failure(await request("POST", "vehicle-variants", { name: "Blocked", modelId }), 409, "VEHICLE_VARIANT_PARENT_INACTIVE");
  });

  await t.test("category roots, immediate children and inactive ancestry work without a tree endpoint", async () => {
    const rootId = await create("part-categories", { name: "Tree root" });
    const childId = await create("part-categories", { name: "Child", parentId: rootId });
    const leafId = await create("part-categories", { name: "Leaf", parentId: childId });
    failure(await request("POST", "part-categories", { name: " tree root ", parentId: null }), 409, "PART_CATEGORY_NAME_CONFLICT");
    const roots = PartCategories.listResult.parse(data(await request("GET", "part-categories?rootOnly=true")));
    assert.ok(roots.some((r) => r.id === rootId));
    assert.ok(roots.every((r) => r.parentId === null));
    const children = PartCategories.listResult.parse(data(await request("GET", `part-categories?parentId=${rootId}&rootOnly=false`)));
    assert.deepEqual(children.map((r) => r.id), [childId]);
    failure(await request("GET", `part-categories?rootOnly=true&parentId=${rootId}`), 400, "DTI_QUERY_VALIDATE_ERROR");
    failure(await request("DELETE", `part-categories/${rootId}`), 409, "PART_CATEGORY_IN_USE");
    failure(await request("PATCH", `part-categories/${rootId}`, { parentId: leafId }), 400, "DTI_BODY_VALIDATE_ERROR");
    data(await request("PATCH", `part-categories/${rootId}`, { isActive: false }));
    failure(await request("POST", "part-categories", { name: "Blocked", parentId: leafId }), 409, "PART_CATEGORY_PARENT_INACTIVE");
    assert.equal(PartCategories.entity.parse(data(await request("PATCH", `part-categories/${leafId}`, { name: "Renamed leaf" }))).isActive, true);
  });

  await t.test("all four routes retain storage failure responses", async () => {
    await db.close();
    for (const [path, , code] of references) failure(await request("GET", path), 500, `${code}_STORAGE_ERROR`);
  });
});
