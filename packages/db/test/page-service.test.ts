import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { PageService } from "../src/service/page.js";
import { testDatabase } from "./support/database.js";
import { testServiceContainer } from "./support/di.js";

test("page CRUD, lifecycle, JSON and slug uniqueness", async () => {
  const db = await testDatabase(); const di = testServiceContainer(db); const service = di.resolve(PageService);
  try {
    const page = await service.create({ title: " About ", slug: "about", description: " " });
    assert.equal(page.title, "About"); assert.equal(page.description, null);
    assert.deepEqual(page.content, {}); assert.deepEqual(page.meta, {}); assert.equal(page.status, "draft"); assert.equal(page.publishedAt, null);
    await assert.rejects(service.findPublishedBySlug("about"), { code: "PAGE_NOT_FOUND" });
    await assert.rejects(service.create({ title: "Duplicate", slug: "about" }), { code: "PAGE_SLUG_CONFLICT" });
    await assert.rejects(service.update(page.id, { status: "published" }), { code: "PAGE_INVALID_INPUT" });
    assert.equal((await service.findById(page.id)).publishedAt, null);
    const meta = { seoTitle: "SEO", noIndex: false, nested: [1, null, { test: true }] };
    const content = { version: 1, blocks: [{ type: "text", text: "Hello" }] };
    const published = await service.update(page.id, { meta, content, status: "published" });
    assert.deepEqual(published.meta, meta); assert.deepEqual(published.content, content); assert.ok(published.publishedAt instanceof Date);
    assert.equal((await service.findPublishedBySlug("about")).id, page.id);
    await assert.rejects(service.update(page.id, { content: {} }), { code: "PAGE_INVALID_INPUT" });
    await service.update(page.id, { status: "archived" });
    await assert.rejects(service.findPublishedBySlug("about"), { code: "PAGE_NOT_FOUND" });
    const republished = await service.update(page.id, { status: "published" });
    assert.deepEqual(republished.publishedAt, published.publishedAt); assert.deepEqual(republished.createdAt, page.createdAt);
    assert.ok(republished.updatedAt >= page.updatedAt);
    await service.create({ title: "Other", slug: "other" });
    const list = await service.list({ search: "bou", status: "published", limit: 1 });
    assert.equal(list[0]?.id, page.id); assert.equal("content" in list[0]!, false); assert.equal("meta" in list[0]!, false);
    assert.equal((await service.list({ search: "%" })).length, 0);
    assert.equal((await service.list({ limit: 1, offset: 1 })).length, 1);
    await service.delete(page.id);
    await assert.rejects(service.findById(page.id), { code: "PAGE_NOT_FOUND" });
  } finally { di.destroy(); await db.close(); }
});

test("page file usage survives swaps, clearing and deletion without touching other owners", async () => {
  const db = await testDatabase(); const di = testServiceContainer(db); const service = di.resolve(PageService);
  try {
    const a = randomUUID(); const b = randomUUID(); const other = randomUUID();
    await db.query("INSERT INTO files (id,file_path,original_name,usage) VALUES ($1,'page/a','a',ARRAY[$3::uuid]),($2,'page/b','b','{}')", [a,b,other]);
    const page = await service.create({ title: "Image", slug: "image", mainImageId: a });
    const usage = async (id: string) => (await db.query<{usage:string[]}>("SELECT usage FROM files WHERE id=$1", [id])).rows[0]!.usage.sort();
    assert.deepEqual(await usage(a), [other,page.id].sort());
    await service.update(page.id, { title: "Same image" });
    assert.deepEqual(await usage(a), [other,page.id].sort());
    await assert.rejects(service.update(page.id, { mainImageId: randomUUID() }), { code: "PAGE_IMAGE_NOT_FOUND" });
    assert.deepEqual(await usage(a), [other,page.id].sort());
    await service.update(page.id, { mainImageId: b });
    assert.deepEqual(await usage(a), [other]); assert.deepEqual(await usage(b), [page.id]);
    await assert.rejects(db.query("DELETE FROM files WHERE id=$1", [b]));
    await service.update(page.id, { mainImageId: null }); assert.deepEqual(await usage(b), []);
    await db.query("UPDATE pages SET main_image_id=$2 WHERE id=$1", [page.id,a]);
    await service.delete(page.id); assert.deepEqual(await usage(a), [other]);
    assert.equal((await db.query("SELECT * FROM files")).rows.length, 2);
  } finally { di.destroy(); await db.close(); }
});

test("page DB and service reject invalid inputs and direct SQL cannot bypass publication", async () => {
  const db = await testDatabase(); const di = testServiceContainer(db); const service = di.resolve(PageService);
  try {
    for (const fields of [{ title: " " }, { slug: "Bad Slug" }, { slug: "a/b" }, { title: "a".repeat(256) }, { description: "a".repeat(513) }, { meta: [] }, { content: null }, { status: "hidden" }]) {
      await assert.rejects(service.create({ title: "A", slug: "a", ...fields } as never), { code: "PAGE_INVALID_INPUT" });
    }
    const page = await service.create({ title: "A", slug: "a" });
    await assert.rejects(service.update(page.id, {}), { code: "PAGE_INVALID_INPUT" });
    await assert.rejects(service.update(page.id, { publishedAt: new Date() } as never), { code: "PAGE_INVALID_INPUT" });
    await assert.rejects(db.query("UPDATE pages SET status='published' WHERE id=$1", [page.id]));
    await assert.rejects(db.query("UPDATE pages SET meta='[]'::jsonb WHERE id=$1", [page.id]));
    await assert.rejects(db.query("UPDATE pages SET id=$2 WHERE id=$1", [page.id,randomUUID()]));
    await db.query("UPDATE pages SET status='published',content='{\"text\":\"SQL\"}'::jsonb WHERE id=$1", [page.id]);
    assert.ok((await service.findById(page.id)).publishedAt);
  } finally { di.destroy(); await db.close(); }
});
