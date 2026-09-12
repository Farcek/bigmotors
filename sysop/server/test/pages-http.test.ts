import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { createServer } from "node:http";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { TKN_DB, type BigMotorsDb } from "@bigmotors/db";
import * as schema from "@bigmotors/db/schema";
import { Pages } from "@bigmotors/sysop-dti";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { createApp } from "../src/app.js";
import { createContainer } from "../src/di.js";

test("page HTTP CRUD, JSON, publication, conflict and image usage through production DI", async (t) => {
  const db = new PGlite(); const root = createContainer({ env: {} }); const orm = drizzle(db, { schema });
  const di = root.child("page-http").asValue(TKN_DB, orm as unknown as BigMotorsDb);
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
  const page = Pages.entity.parse(await request("POST", "/pages", { title: "Page HTTP", slug: "page-http" }));
  assert.deepEqual(Pages.entity.parse(await request("GET", `/pages/${page.id}`)), page);
  assert.equal(await request("POST", "/pages", { title: "Duplicate", slug: page.slug }, 409), "PAGE_SLUG_CONFLICT");
  await request("PATCH", `/pages/${page.id}`, { status: "published" }, 400);
  for (const body of [{ meta: [] }, { content: null }, { status: "hidden" }, { publishedAt: null }, {}]) await request("PATCH", `/pages/${page.id}`, body, 400);
  const imageId = randomUUID();
  await db.query("INSERT INTO files (id,file_path,original_name) VALUES ($1,'page/http','image.jpg')", [imageId]);
  const content = { version: 1, blocks: [{ text: "HTTP test" }] }; const meta = { seoTitle: "SEO", noIndex: true };
  const published = Pages.entity.parse(await request("PATCH", `/pages/${page.id}`, { content, meta, mainImageId: imageId, status: "published" }));
  assert.deepEqual(published.content, content); assert.deepEqual(published.meta, meta); assert.ok(published.publishedAt);
  const list = Pages.listResult.parse(await request("GET", "/pages?search=HTTP&status=published&limit=21"));
  assert.equal(list.length, 1); assert.equal("content" in list[0]!, false);
  await request("GET", "/pages?limit=101", undefined, 400);
  await request("PATCH", `/pages/${page.id}`, { mainImageId: randomUUID() }, 409);
  assert.equal(Pages.entity.parse(await request("GET", `/pages/${page.id}`)).mainImageId, imageId);
  await request("PATCH", `/pages/${page.id}`, { status: "draft", content: {}, meta: {} });
  assert.equal(Pages.listResult.parse(await request("GET", "/pages?status=published")).length, 0);
  await request("DELETE", `/pages/${page.id}`);
  await request("GET", `/pages/${page.id}`, undefined, 404);
  assert.deepEqual((await db.query("SELECT usage FROM files WHERE id=$1", [imageId])).rows, [{ usage: [] }]);
});
