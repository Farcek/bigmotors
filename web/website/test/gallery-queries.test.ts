import assert from "node:assert/strict";
import { test } from "node:test";
import type { GalleryService } from "@bigmotors/db";
import { readGalleryByKey } from "../src/server/gallery-queries.ts";

const gallery = { id: "00000000-0000-4000-8000-000000000001", key: "home", name: "Home", desc: null, created: new Date(), updated: new Date() };
const item = { id: "item", galleryId: gallery.id, imageId: "image", sortOrder: 0, title: "<script>example</script>", label: null, desc: null, linkUrl: "/vehicles", linkLabel: "Catalog", originalName: "image.png", created: new Date(), updated: new Date() };
type GalleryReader = Pick<GalleryService, "findByKey" | "listItems">;

test("gallery lookup passes the exact key and loads all ordered item pages", async () => {
  const offsets: number[] = [];
  const first = Array.from({ length: 100 }, (_, i) => ({ ...item, id: String(i), sortOrder: i }));
  const result = await readGalleryByKey("home", {
    findByKey: async key => { assert.equal(key, "home"); return gallery; },
    listItems: async (id, params) => {
      assert.equal(id, gallery.id); assert.equal(params?.limit, 100);
      offsets.push(params!.offset!);
      return params!.offset === 0 ? first : [{ ...item, id: "100", sortOrder: 100 }];
    },
  });
  assert.deepEqual(offsets, [0, 100]);
  assert.deepEqual(result, { ...gallery, items: [...first, { ...item, id: "100", sortOrder: 100 }] });
});

test("missing gallery returns null; an empty gallery returns an empty items array", async () => {
  const service: GalleryReader = { findByKey: async () => gallery, listItems: async () => [] };
  assert.deepEqual(await readGalleryByKey("home", service), { ...gallery, items: [] });
  assert.equal(await readGalleryByKey("missing", {
    findByKey: async () => { throw Object.assign(new Error("Missing"), { code: "GALLERY_NOT_FOUND" }); },
    listItems: async () => { throw new Error("Should not load items"); },
  }), null);
});

test("gallery and item storage failures are not hidden", async () => {
  const error = Object.assign(new Error("Storage failure"), { code: "GALLERY_STORAGE_ERROR" });
  await assert.rejects(readGalleryByKey("home", { findByKey: async () => { throw error; }, listItems: async () => [] }), error);
  await assert.rejects(readGalleryByKey("home", { findByKey: async () => gallery, listItems: async () => { throw error; } }), error);
});
