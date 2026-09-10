import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { createServer } from "node:http";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { TKN_DB, type BigMotorsDb } from "@bigmotors/db";
import * as schema from "@bigmotors/db/schema";
import { Branches } from "@bigmotors/sysop-dti";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { createApp } from "../src/app.js";
import { createContainer } from "../src/di.js";

test("branches HTTP API uses DI and real CRUD against an isolated database", async (t) => {
  const db = new PGlite();
  const root = createContainer({ env: {} });
  const orm = drizzle(db, { schema });
  // Keep production service registration; only replace the PostgreSQL driver for tests.
  const di = root.child("branches-http-test").asValue(TKN_DB, orm as unknown as BigMotorsDb);
  const server = createServer(createApp(di));
  t.after(async () => {
    try {
      if (server.listening) {
        await new Promise<void>((resolve, reject) => {
          server.close((error) => error ? reject(error) : resolve());
          server.closeAllConnections();
        });
      }
    } finally {
      try { root.destroy(); } finally { if (!db.closed) await db.close(); }
    }
  });
  await migrate(orm, {
    migrationsFolder: fileURLToPath(new URL("../../../packages/db/migrations/", import.meta.url)),
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const baseUrl = `http://127.0.0.1:${address.port}/api/branches`;

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

  await t.test("CRUD, pagination and active filtering follow the branch contract", async () => {
    assert.deepEqual(Branches.listResult.parse(data(await request("GET"))), []);
    const first = Branches.entity.parse(data(await request("POST", "", { name: "  Main HTTP  " })));
    assert.equal(first.name, "Main HTTP");
    assert.equal(first.description, null);
    assert.equal(first.isActive, true);
    assert.equal(first.sortOrder, 0);
    assert.equal(new Date(first.createdAt).toISOString(), first.createdAt);
    const second = Branches.entity.parse(data(await request("POST", "", { name: "Other HTTP", sortOrder: 1 })));
    const updated = Branches.entity.parse(data(await request("PATCH", `/${first.id}`, {
      description: "  Company branch  ", isActive: false,
    })));
    assert.equal(updated.name, first.name);
    assert.equal(updated.createdAt, first.createdAt);
    assert.equal(updated.description, "Company branch");
    assert.equal(updated.isActive, false);
    assert.ok(Date.parse(updated.updatedAt) >= Date.parse(first.updatedAt));
    assert.deepEqual(Branches.listResult.parse(data(await request("GET", "?limit=1&offset=1"))), [second]);
    assert.deepEqual(Branches.listResult.parse(data(await request("GET", "?isActive=false"))), [updated]);
    assert.deepEqual(Branches.listResult.parse(data(await request("GET", "?isActive=true"))), [second]);
    const cleared = Branches.entity.parse(data(await request("PATCH", `/${first.id}`, { description: " " })));
    assert.equal(cleared.description, null);
    assert.deepEqual(Branches.entity.parse(data(await request("DELETE", `/${first.id}`))), cleared);
    data(await request("DELETE", `/${second.id}`));
    assert.deepEqual(data(await request("GET")), []);
    failure(await request("DELETE", `/${first.id}`), 404, "BRANCH_NOT_FOUND");
  });

  await t.test("invalid payloads and identifiers return 400 without writing", async () => {
    for (const body of [{}, { name: " " }, { name: "x", hexCode: "#FFFFFF" }, { name: "x".repeat(256) }]) {
      failure(await request("POST", "", body), 400, "DTI_BODY_VALIDATE_ERROR");
    }
    failure(await request("PATCH", `/${randomUUID()}`, {}), 400, "DTI_BODY_VALIDATE_ERROR");
    failure(await request("DELETE", "/invalid"), 400, "DTI_PATH_PARAMS_VALIDATE_ERROR");
    for (const query of ["?limit=0", "?limit=101", "?offset=-1", "?isActive=invalid"]) {
      failure(await request("GET", query), 400, "DTI_QUERY_VALIDATE_ERROR");
    }
    assert.deepEqual(data(await request("GET")), []);
  });

  await t.test("duplicate names and missing branches retain 409 and 404 responses", async () => {
    const a = Branches.entity.parse(data(await request("POST", "", { name: "Unique HTTP" })));
    const b = Branches.entity.parse(data(await request("POST", "", { name: "Different HTTP" })));
    failure(await request("POST", "", { name: " UNIQUE HTTP " }), 409, "BRANCH_NAME_CONFLICT");
    failure(await request("PATCH", `/${b.id}`, { name: a.name }), 409, "BRANCH_NAME_CONFLICT");
    failure(await request("PATCH", `/${randomUUID()}`, { name: "Missing" }), 404, "BRANCH_NOT_FOUND");
    data(await request("DELETE", `/${a.id}`));
    data(await request("DELETE", `/${b.id}`));
  });

  await t.test("all product types protect referenced company branches independently of locations", async () => {
    for (const [type, table] of [["vehicle", "vehicles"], ["part", "parts"], ["tire", "tires"]] as const) {
      const branch = Branches.entity.parse(data(await request("POST", "", { name: `${type} HTTP` })));
      const productId = randomUUID();
      await db.transaction(async (tx) => {
        await tx.query("INSERT INTO products (id, product_type, title) VALUES ($1, $2, 'HTTP fixture')", [productId, type]);
        await tx.query(`INSERT INTO ${table} (product_id, branch_id) VALUES ($1, $2)`, [productId, branch.id]);
      });
      failure(await request("DELETE", `/${branch.id}`), 409, "BRANCH_IN_USE");
      const updated = Branches.entity.parse(data(await request("PATCH", `/${branch.id}`, { isActive: false })));
      assert.equal(updated.isActive, false);
      const { rows } = await db.query(`SELECT branch_id, location_id FROM ${table} WHERE product_id=$1`, [productId]);
      assert.deepEqual(rows, [{ branch_id: branch.id, location_id: null }]);
    }
  });

  await t.test("database failures return a sanitized 500", async () => {
    await db.close();
    const result = await request("GET");
    failure(result, 500, "BRANCH_STORAGE_ERROR");
    assert.deepEqual(result.body, { success: false, code: "BRANCH_STORAGE_ERROR", message: "Branch storage operation failed." });
  });
});
