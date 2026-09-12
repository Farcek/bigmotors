import assert from "node:assert/strict";
import { test } from "node:test";
import type { Page } from "@bigmotors/db";
import { isContentSlug, readContentPage } from "../src/server/page-queries.ts";

const row: Page = {
  id: "00000000-0000-4000-8000-000000000001", title: "Page", slug: "test-page", description: null,
  mainImageId: null, content: { text: "<script>not executable</script>", nested: [false, 0, null] }, meta: {},
  status: "published", publishedAt: new Date(), createdAt: new Date(), updatedAt: new Date(),
};
const failure = (code: string) => Object.assign(new Error("Test failure"), { code });

test("slug lookup returns only published pages and avoids storage for invalid/reserved slugs", async () => {
  assert.deepEqual(await readContentPage(row.slug, { findPublishedBySlug: async slug => { assert.equal(slug, row.slug); return row; } }), row);
  for (const slug of ["api", "files", "vehicles", "parts", "tires", "_next", "../test", "MixedCase", "a".repeat(256)]) {
    assert.equal(isContentSlug(slug), false);
    assert.equal(await readContentPage(slug, { findPublishedBySlug: async () => { throw new Error("Should not read"); } }), null);
  }
  assert.equal(await readContentPage("missing", { findPublishedBySlug: async () => { throw failure("PAGE_NOT_FOUND"); } }), null);
  for (const status of ["draft", "archived"] as const) {
    assert.equal(await readContentPage("unpublished", { findPublishedBySlug: async () => ({ ...row, status }) }), null);
  }
});

test("database failures are not disguised as missing pages", async () => {
  const error = failure("PAGE_STORAGE_ERROR");
  await assert.rejects(readContentPage("valid-slug", { findPublishedBySlug: async () => { throw error; } }), error);
});
