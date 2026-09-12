import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { TKN_DB, type BigMotorsDb } from "@bigmotors/db";
import * as schema from "@bigmotors/db/schema";
import { Settings } from "@bigmotors/sysop-dti";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { createApp } from "../src/app.js";
import { createContainer } from "../src/di.js";

test("settings HTTP CRUD accepts encoded arbitrary keys and saves selected keys atomically", async (t) => {
  const db = new PGlite(); const root = createContainer({ env: {} }); const orm = drizzle(db, { schema });
  const di = root.child("settings-http").asValue(TKN_DB, orm as unknown as BigMotorsDb);
  const server = createServer(createApp(di));
  t.after(async () => {
    if (server.listening) await new Promise<void>(resolve => { server.close(() => resolve()); server.closeAllConnections(); });
    root.destroy(); await db.close();
  });
  await migrate(orm, { migrationsFolder: fileURLToPath(new URL("../../../packages/db/migrations/", import.meta.url)) });
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  const address = server.address(); assert.ok(address && typeof address !== "string");
  async function request(method: string, path: string, body?: unknown, status = 200) {
    const response = await fetch(`http://127.0.0.1:${(address as {port:number}).port}/api${path}`, {
      method, ...(body === undefined ? {} : { headers: {"Content-Type":"application/json"}, body: JSON.stringify(body) }),
    });
    const result = await response.json() as { success: boolean; data?: unknown; code?: string; stack?: unknown };
    assert.equal(response.status, status, JSON.stringify(result)); assert.equal(result.success, status === 200); assert.equal(result.stack, undefined);
    return status === 200 ? result.data : result.code;
  }
  const key = "custom/key? &Монгол"; const path = `/settings/${encodeURIComponent(key)}`;
  const row = Settings.entity.parse(await request("POST", "/settings", { key, value: "  keep spaces  " }));
  assert.deepEqual(Settings.entity.parse(await request("GET", path)), row);
  assert.equal(await request("POST", "/settings", row, 409), "SETTINGS_KEY_CONFLICT");
  assert.equal(Settings.entity.parse(await request("PATCH", path, { value: "" })).value, "");
  assert.equal(Settings.listResult.parse(await request("GET", `/settings?key=${encodeURIComponent(key)}&limit=1`))[0]?.key, key);
  const entries = [{ key: "homepage", value: "arbitrary" }, { key: "siteTitle", value: "Title" }, { key: "adminEmail", value: "not-an-email" }];
  assert.equal(Settings.listResult.parse(await request("PUT", "/settings", { entries })).length, 3);
  await request("PUT", "/settings", { entries: [{ key: "siteTitle", value: "New title" }] });
  assert.equal(Settings.entity.parse(await request("GET", "/settings/siteTitle")).value, "New title");
  assert.equal(Settings.entity.parse(await request("GET", path)).value, "");
  await request("PUT", "/settings", { entries: [{ key: "siteTitle", value: "bad" }, { key: "too-long", value: "x".repeat(256) }] }, 400);
  assert.equal(Settings.entity.parse(await request("GET", "/settings/siteTitle")).value, "New title");
  for (const body of [{}, { key: "rename", value: "x" }, { value: null }, { value: 123 }]) await request("PATCH", path, body, 400);
  await request("GET", "/settings?limit=101", undefined, 400);
  await request("DELETE", path); await request("GET", path, undefined, 404);
});
