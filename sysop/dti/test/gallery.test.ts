import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { Galleries, GalleryItems } from "../src/gallery.js";

test("gallery contracts trim and clear text while rejecting invalid fields", () => {
  assert.deepEqual(Galleries.createBody.parse({ key: " banner ", name: " A ", desc: " " }), { key: "banner", name: "A", desc: null });
  for (const input of [{}, { name: " " }, { name: "a".repeat(256) }, { name: "a", desc: "d".repeat(513) }, { name: "a", created: "fake" }]) assert.equal(Galleries.createBody.safeParse({ key: "valid", ...input }).success, false);
  for (const key of [undefined, null, "", " ", "a".repeat(256)]) {
    assert.equal(Galleries.createBody.safeParse({ name: "A", key }).success, false);
  }
  assert.equal(Galleries.createBody.safeParse({ name: "A", key: "a".repeat(255) }).success, true);
  assert.deepEqual(Galleries.updateBody.parse({ key: " changed " }), { key: "changed" });
  assert.equal(Galleries.updateBody.safeParse({ key: " " }).success, false);
  assert.equal(Galleries.updateBody.safeParse({}).success, false);
  assert.equal(GalleryItems.updateBody.safeParse({ galleryId: randomUUID() }).success, false);
  assert.equal(GalleryItems.updateBody.safeParse({ imageId: randomUUID(), title: "Replacement" }).success, false);
});
test("item contracts preserve zero and enforce UUID and integer boundaries", () => {
  const imageId = randomUUID();
  assert.deepEqual(GalleryItems.createBody.parse({ imageId, title: " ", label: " X ", sortOrder: 0 }), { imageId, title: null, label: "X", sortOrder: 0 });
  for (const input of [{}, { imageId: "bad" }, { imageId, sortOrder: 0.5 }, { imageId, title: "a".repeat(256) }]) assert.equal(GalleryItems.createBody.safeParse(input).success, false);
  assert.equal(GalleryItems.listQuery.parse({ limit: "21", offset: "20" }).limit, 21);
  for (const query of [{ limit: 101 }, { offset: -1 }, { limit: "bad" }]) assert.equal(Galleries.listQuery.safeParse(query).success, false);
});

test("gallery item links accept local and HTTP URLs, clear optional values and reject unsafe links", () => {
  for (const linkUrl of ["/vehicles", "/vehicles?brand=toyota#list", "https://example.com/a", "http://example.com", "/", null, ""]) {
    assert.equal(GalleryItems.updateBody.safeParse({ linkUrl }).success, true);
  }
  for (const linkUrl of ["javascript:alert(1)", "data:text/html,test", "//example.com", "/\\example.com", "/a\nb", "https://user:pass@example.com", "/" + "a".repeat(2048)]) {
    assert.equal(GalleryItems.updateBody.safeParse({ linkUrl }).success, false, String(linkUrl));
  }
  assert.deepEqual(GalleryItems.updateBody.parse({ linkUrl: " ", linkLabel: " " }), { linkUrl: null, linkLabel: null });
  assert.equal(GalleryItems.updateBody.safeParse({ linkLabel: "x".repeat(256) }).success, false);
  assert.equal(GalleryItems.updateBody.safeParse({ linkLabel: "x".repeat(255) }).success, true);
});
