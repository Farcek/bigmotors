import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { createServer } from "node:http";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { TKN_DB, type BigMotorsDb } from "@bigmotors/db";
import * as schema from "@bigmotors/db/schema";
import { Galleries, GalleryItems } from "@bigmotors/sysop-dti";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { createApp } from "../src/app.js";
import { createContainer } from "../src/di.js";

test("gallery HTTP CRUD uses production DI, contracts and file usage triggers", async (t) => {
  const db = new PGlite(); const root = createContainer({ env: {} }); const orm = drizzle(db, { schema });
  const di = root.child("gallery-http").asValue(TKN_DB, orm as unknown as BigMotorsDb);
  const server = createServer(createApp(di));
  t.after(async () => {
    if (server.listening) await new Promise<void>((resolve) => { server.close(() => resolve()); server.closeAllConnections(); });
    root.destroy(); await db.close();
  });
  await migrate(orm, { migrationsFolder: fileURLToPath(new URL("../../../packages/db/migrations/", import.meta.url)) });
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  const address = server.address(); assert.ok(address && typeof address !== "string");
  async function request(method: string, path: string, body?: unknown, status = 200) {
    const response = await fetch(`http://127.0.0.1:${(address as {port:number}).port}/api${path}`, { method, ...(body === undefined ? {} : { headers: {"Content-Type":"application/json"}, body: JSON.stringify(body) }) });
    const result = await response.json() as { success: boolean; data?: unknown; code?: string; stack?: unknown };
    assert.equal(response.status, status, JSON.stringify(result));
    assert.equal(result.success, status === 200); assert.equal(result.stack, undefined);
    return status === 200 ? result.data : result.code;
  }
  const g = Galleries.entity.parse(await request("POST", "/galleries", { name: "HTTP gallery" }));
  assert.deepEqual(Galleries.entity.parse(await request("GET", `/galleries/${g.id}`)), g);
  assert.equal(Galleries.listResult.parse(await request("GET", "/galleries?search=HTTP&limit=1")).length, 1);
  assert.equal((Galleries.entity.parse(await request("PATCH", `/galleries/${g.id}`, { desc: "changed" }))).desc, "changed");
  await request("POST", "/galleries", { name: " " }, 400);
  await request("GET", "/galleries?offset=-1", undefined, 400);
  const imageId = randomUUID();
  await db.query("INSERT INTO files (id,file_path,original_name) VALUES ($1,'gallery/http','http.jpg')", [imageId]);
  const path = `/galleries/${g.id}/items`;
  const item = GalleryItems.entity.parse(await request("POST", path, { imageId, title: "Photo" }));
  assert.equal(GalleryItems.listResult.parse(await request("GET", path))[0]?.originalName, "http.jpg");
  const updated = GalleryItems.entity.parse(await request("PATCH", `${path}/${item.id}`, { sortOrder: 9, label: "New" }));
  assert.equal(updated.sortOrder, 9);
  await request("PATCH", `${path}/${item.id}`, { imageId: randomUUID(), title: "Replacement" }, 400);
  assert.equal(GalleryItems.listResult.parse(await request("GET", path))[0]?.imageId, imageId);
  await request("PATCH", `/galleries/${randomUUID()}/items/${item.id}`, { label: "Wrong" }, 404);
  await request("POST", path, { imageId: randomUUID() }, 409);
  await request("PATCH", `${path}/${item.id}`, {}, 400);
  assert.equal(GalleryItems.entity.parse(await request("DELETE", `${path}/${item.id}`)).id, item.id);
  await request("POST", path, { imageId });
  await request("DELETE", `/galleries/${g.id}`);
  await request("GET", `/galleries/${g.id}`, undefined, 404);
  assert.deepEqual((await db.query("SELECT usage FROM files WHERE id=$1", [imageId])).rows, [{ usage: [] }]);
});
