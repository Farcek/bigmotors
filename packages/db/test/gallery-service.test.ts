import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { GalleryService } from "../src/service/gallery.js";
import { testDatabase } from "./support/database.js";
import { testServiceContainer } from "./support/di.js";

test("gallery CRUD, ordering and shared file usage remain atomic", async () => {
  const db = await testDatabase(); const di = testServiceContainer(db); const service = di.resolve(GalleryService);
  try {
    const unrelated = randomUUID(); const a = randomUUID(); const b = randomUUID();
    await db.query("INSERT INTO files (id,file_path,original_name,usage) VALUES ($1,'gallery/a','a.svg',ARRAY[$3::uuid]),($2,'gallery/b','b.jpg','{}')", [a,b,unrelated]);
    const first = await service.create({ key: " first ", name: " First ", desc: " " });
    const second = await service.create({ key: "second", name: "Second" });
    assert.equal(first.key, "first");
    assert.equal(first.name, "First"); assert.equal(first.desc, null);
    assert.ok(first.created instanceof Date);
    assert.equal((await service.list({ search: "irs" }))[0]?.id, first.id);
    assert.equal((await service.list({ limit: 1, offset: 1 }))[0]?.id, second.id);
    const one = await service.createItem(first.id, { imageId: a, title: " One ", sortOrder: 5, linkUrl: " /vehicles ", linkLabel: " Catalog " });
    assert.equal(one.linkUrl, "/vehicles"); assert.equal(one.linkLabel, "Catalog");
    const two = await service.createItem(first.id, { imageId: a, sortOrder: -1 });
    assert.equal(two.linkUrl, null); assert.equal(two.linkLabel, null);
    await assert.rejects(service.updateItem(first.id, one.id, { linkUrl: "javascript:alert(1)" }), { code: "GALLERY_INVALID_INPUT" });
    await assert.rejects(service.updateItem(first.id, one.id, { linkLabel: "x".repeat(256) }), { code: "GALLERY_INVALID_INPUT" });
    const three = await service.createItem(second.id, { imageId: a });
    async function usage(id: string) { return (await db.query<{usage:string[]}>("SELECT usage FROM files WHERE id=$1", [id])).rows[0]!.usage.sort(); }
    assert.deepEqual(await usage(a), [unrelated,one.id,two.id,three.id].sort());
    assert.deepEqual((await service.listItems(first.id)).map(r=>r.id), [two.id,one.id]);
    assert.equal((await service.listItems(first.id, { limit: 1, offset: 1 }))[0]?.originalName, "a.svg");
    assert.equal((await service.listItems(first.id, { limit: 1, offset: 1 }))[0]?.linkUrl, "/vehicles");
    const linked = await service.updateItem(first.id, one.id, { linkUrl: "https://example.com/catalog" });
    assert.equal(linked.linkLabel, "Catalog");
    const cleared = await service.updateItem(first.id, one.id, { linkUrl: " ", linkLabel: null });
    assert.equal(cleared.linkUrl, null); assert.equal(cleared.linkLabel, null);
    await assert.rejects(service.updateItem(second.id, one.id, { label: "wrong owner" }), { code: "GALLERY_NOT_FOUND" });
    const replacement = { imageId: b, title: "Replacement" };
    await assert.rejects(service.updateItem(first.id, one.id, replacement), { code: "GALLERY_INVALID_INPUT" });
    assert.deepEqual(await usage(a), [unrelated,one.id,two.id,three.id].sort());
    await service.updateItem(first.id, one.id, { title: "", sortOrder: -2 });
    assert.deepEqual(await usage(a), [unrelated,one.id,two.id,three.id].sort());
    assert.deepEqual(await usage(b), []);
    assert.equal((await service.listItems(first.id))[0]?.title, null);
    assert.ok((await service.findById(first.id)).updated >= first.updated);
    await assert.rejects(db.query("DELETE FROM files WHERE id=$1", [a]));
    await service.deleteItem(first.id, one.id);
    assert.deepEqual(await usage(b), []);
    await service.delete(first.id);
    assert.deepEqual(await usage(a), [unrelated,three.id].sort());
    assert.equal((await db.query("SELECT * FROM gallery_item WHERE gallery_id=$1", [first.id])).rows.length, 0);
    await service.delete(second.id);
    assert.deepEqual(await usage(a), [unrelated]);
    assert.equal((await db.query("SELECT * FROM files")).rows.length, 2);
    assert.deepEqual(await service.list(), []);
    await assert.rejects(service.findById(first.id), { code: "GALLERY_NOT_FOUND" });
  } finally { di.destroy(); await db.close(); }
});

test("gallery validates boundaries and direct SQL follows usage triggers", async () => {
  const db = await testDatabase(); const di = testServiceContainer(db); const service = di.resolve(GalleryService);
  try {
    for (const input of [{ name: " " }, { name: "a".repeat(256) }, { name: "A", desc: "d".repeat(513) }]) await assert.rejects(service.create({ key: "valid", ...input }), { code: "GALLERY_INVALID_INPUT" });
    const g = await service.create({ key: "k".repeat(255), name: "A".repeat(255), desc: "d".repeat(512) });
    await assert.rejects(service.update(g.id, {}), { code: "GALLERY_INVALID_INPUT" });
    await assert.rejects(service.createItem(g.id, { imageId: "no" }), { code: "GALLERY_INVALID_INPUT" });
    await assert.rejects(service.createItem(g.id, { imageId: randomUUID(), sortOrder: 0.5 }), { code: "GALLERY_INVALID_INPUT" });
    const id = randomUUID();
    await db.query("INSERT INTO files (id,file_path,original_name) VALUES ($1,'sql/image','image')", [id]);
    await db.query("INSERT INTO gallery_item (gallery_id,image_id) VALUES ($1,$2)", [g.id,id]);
    assert.equal((await db.query<{usage:string[]}>("SELECT usage FROM files WHERE id=$1", [id])).rows[0]!.usage.length, 1);
    await db.query("DELETE FROM gallery WHERE id=$1", [g.id]);
    assert.deepEqual((await db.query("SELECT usage FROM files WHERE id=$1", [id])).rows, [{ usage: [] }]);
  } finally { di.destroy(); await db.close(); }
});

test("gallery keys are required, unique on create/update and searchable", async () => {
  const db = await testDatabase(); const di = testServiceContainer(db); const service = di.resolve(GalleryService);
  try {
    for (const key of ["", " ", "k".repeat(256)]) {
      await assert.rejects(service.create({ key, name: "Gallery" }), { code: "GALLERY_INVALID_INPUT" });
    }
    const first = await service.create({ key: "home-banner", name: "Gallery" });
    const second = await service.create({ key: "second", name: "Gallery" });
    assert.equal((await service.findByKey("home-banner")).id, first.id);
    await assert.rejects(service.findByKey("home"), { code: "GALLERY_NOT_FOUND" });
    await assert.rejects(service.findByKey("HOME-BANNER"), { code: "GALLERY_NOT_FOUND" });
    await assert.rejects(service.findByKey(" "), { code: "GALLERY_INVALID_INPUT" });
    await assert.rejects(service.create({ key: " home-banner ", name: "Duplicate" }), { code: "GALLERY_KEY_CONFLICT", status: 409 });
    await assert.rejects(service.update(second.id, { key: first.key }), { code: "GALLERY_KEY_CONFLICT", status: 409 });
    assert.equal((await service.findById(second.id)).key, "second");
    assert.equal((await service.update(first.id, { key: " renamed " })).key, "renamed");
    assert.equal((await service.update(first.id, { desc: "Changed" })).key, "renamed");
    assert.deepEqual((await service.list({ search: "renamed" })).map((row) => row.id), [first.id]);
    await assert.rejects(service.update(first.id, { key: " " }), { code: "GALLERY_INVALID_INPUT" });
    await assert.rejects(db.query('INSERT INTO gallery (key,name) VALUES ($1,$2)', ["renamed", "SQL duplicate"]));
    await assert.rejects(db.query('INSERT INTO gallery (name) VALUES ($1)', ["Missing key"]));
    await assert.rejects(db.query('INSERT INTO gallery (key,name) VALUES ($1,$2)', [" ", "Blank key"]));
    assert.equal((await service.create({ key: "RENAMED", name: "Case sensitive" })).key, "RENAMED");
  } finally { di.destroy(); await db.close(); }
});
