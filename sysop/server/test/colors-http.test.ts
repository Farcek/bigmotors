import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { createServer } from "node:http";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { TKN_DB, type BigMotorsDb } from "@bigmotors/db";
import * as schema from "@bigmotors/db/schema";
import { Colors } from "@bigmotors/sysop-dti";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { createApp } from "../src/app.js";
import { createContainer } from "../src/di.js";

test("colors HTTP API uses DI and real CRUD against an isolated database", async (t) => {
  const db = new PGlite();
  t.after(async () => { if (!db.closed) await db.close(); });
  const orm = drizzle(db, { schema });
  await migrate(orm, {
    migrationsFolder: fileURLToPath(new URL("../../../packages/db/migrations/", import.meta.url)),
  });
  const root = createContainer({ env: {} });
  t.after(() => root.destroy());
  // Only the driver is replaced; production DI modules, service and HTTP routes run unchanged.
  const di = root.child("colors-http-test").asValue(TKN_DB, orm as unknown as BigMotorsDb);
  const server = createServer(createApp(di));
  t.after(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
      server.closeAllConnections();
    });
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const baseUrl = `http://127.0.0.1:${address.port}/api/colors`;

  async function request(method: string, path = "", body?: unknown) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      ...(body === undefined ? {} : {
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      }),
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
    for (const key of ["stack", "cause", "details"]) assert.equal(key in result.body, false);
  }

  await t.test("create, list, patch and delete preserve the contract over HTTP without authentication", async () => {
    assert.deepEqual(Colors.listResult.parse(data(await request("GET"))), []);
    const created = Colors.entity.parse(data(await request("POST", "", {
      name: "  HTTP White  ", hexCode: " #fFffff ", description: "  Pearl  ",
    })));
    assert.equal(created.name, "HTTP White");
    assert.equal(created.description, "Pearl");
    assert.equal(created.hexCode, "#fFffff");
    assert.equal(created.isActive, true);
    assert.equal(created.sortOrder, 0);
    assert.equal(new Date(created.createdAt).toISOString(), created.createdAt);
    const updated = Colors.entity.parse(data(await request("PATCH", `/${created.id}`, {
      isActive: false, sortOrder: 3, hexCode: null, description: " ",
    })));
    assert.equal(updated.name, created.name);
    assert.equal(updated.createdAt, created.createdAt);
    assert.equal(updated.hexCode, null);
    assert.equal(updated.description, null);
    assert.equal(updated.sortOrder, 3);
    assert.equal(updated.isActive, false);
    assert.ok(Date.parse(updated.updatedAt) >= Date.parse(created.updatedAt));
    assert.deepEqual(Colors.listResult.parse(data(await request("GET", "?isActive=true"))), []);
    assert.deepEqual(Colors.listResult.parse(data(await request("GET", "?isActive=false&limit=1&offset=0"))), [updated]);
    assert.deepEqual(Colors.entity.parse(data(await request("DELETE", `/${created.id}`))), updated);
    assert.deepEqual(data(await request("GET")), []);
    failure(await request("DELETE", `/${created.id}`), 404, "COLOR_NOT_FOUND");
  });

  await t.test("invalid bodies, path IDs and queries return 400 without writing", async () => {
    for (const body of [{}, { name: " " }, { name: "x", hexCode: "#FFF" }, { name: "x", extra: true }]) {
      failure(await request("POST", "", body), 400, "DTI_BODY_VALIDATE_ERROR");
    }
    failure(await request("PATCH", `/${randomUUID()}`, {}), 400, "DTI_BODY_VALIDATE_ERROR");
    failure(await request("DELETE", "/not-a-uuid"), 400, "DTI_PATH_PARAMS_VALIDATE_ERROR");
    for (const query of ["?limit=0", "?limit=101", "?offset=-1", "?isActive=invalid"]) {
      failure(await request("GET", query), 400, "DTI_QUERY_VALIDATE_ERROR");
    }
    assert.deepEqual(data(await request("GET")), []);
  });

  await t.test("duplicates return 409 and missing records return 404", async () => {
    const a = Colors.entity.parse(data(await request("POST", "", { name: "Unique HTTP" })));
    const b = Colors.entity.parse(data(await request("POST", "", { name: "Other HTTP" })));
    failure(await request("POST", "", { name: " UNIQUE HTTP " }), 409, "COLOR_NAME_CONFLICT");
    failure(await request("PATCH", `/${b.id}`, { name: a.name }), 409, "COLOR_NAME_CONFLICT");
    failure(await request("PATCH", `/${randomUUID()}`, { name: "Missing" }), 404, "COLOR_NOT_FOUND");
    data(await request("DELETE", `/${a.id}`));
    data(await request("DELETE", `/${b.id}`));
  });

  await t.test("referenced colors cannot be deleted but can be deactivated", async () => {
    const color = Colors.entity.parse(data(await request("POST", "", { name: "Linked HTTP" })));
    const productId = randomUUID();
    await db.transaction(async (tx) => {
      await tx.query("INSERT INTO products (id, product_type, title) VALUES ($1, 'vehicle', 'HTTP fixture')", [productId]);
      await tx.query("INSERT INTO vehicles (product_id, exterior_color_id) VALUES ($1, $2)", [productId, color.id]);
    });
    failure(await request("DELETE", `/${color.id}`), 409, "COLOR_IN_USE");
    const updated = Colors.entity.parse(data(await request("PATCH", `/${color.id}`, { isActive: false })));
    assert.equal(updated.isActive, false);
  });

  await t.test("storage failures return a sanitized 500", async () => {
    await db.close();
    const result = await request("GET");
    failure(result, 500, "COLOR_STORAGE_ERROR");
    assert.deepEqual(result.body, { success: false, code: "COLOR_STORAGE_ERROR", message: "Color storage operation failed." });
  });
});
