import assert from "node:assert/strict";
import { test } from "node:test";
import type { Page } from "@bigmotors/db";
import { isContentSlug, readContentPage, readHomepage } from "../src/server/page-queries.ts";

const row: Page = {
  id: "00000000-0000-4000-8000-000000000001", title: "Page", slug: "test-page", description: null,
  mainImageId: null, content: { text: "<script>not executable</script>", nested: [false, 0, null] }, meta: {},
  status: "published", publishedAt: new Date(), createdAt: new Date(), updatedAt: new Date(),
};
const failure = (code: string) => Object.assign(new Error("Test failure"), { code });
const pages = { findById: async () => row, findPublishedBySlug: async () => row };

test("homepage resolves the configured UUID and returns the published content unchanged", async () => {
  const result = await readHomepage({ findByKey: async key => { assert.equal(key, "homepage"); return { key, value: row.id }; } }, {
    ...pages, findById: async id => { assert.equal(id, row.id); return row; },
  });
  assert.deepEqual(result, row);
});
test("missing, empty, malformed, deleted or unpublished homepage uses fallback", async () => {
  assert.equal(await readHomepage({ findByKey: async () => { throw failure("SETTINGS_NOT_FOUND"); } }, pages), null);
  assert.equal(await readHomepage({ findByKey: async () => ({ key: "homepage", value: "" }) }, { ...pages, findById: async () => { throw new Error("Should not read"); } }), null);
  const settings = { findByKey: async () => ({ key: "homepage", value: row.id }) };
  for (const code of ["PAGE_NOT_FOUND", "PAGE_INVALID_INPUT"]) assert.equal(await readHomepage(settings, { ...pages, findById: async () => { throw failure(code); } }), null);
  for (const status of ["draft", "archived"] as const) assert.equal(await readHomepage(settings, { ...pages, findById: async () => ({ ...row, status }) }), null);
});
test("slug lookup returns only published pages and avoids storage for invalid/reserved slugs", async () => {
  assert.deepEqual(await readContentPage(row.slug, { ...pages, findPublishedBySlug: async slug => { assert.equal(slug, row.slug); return row; } }), row);
  for (const slug of ["api", "files", "vehicles", "parts", "tires", "_next", "../test", "MixedCase", "a".repeat(256)]) {
    assert.equal(isContentSlug(slug), false);
    assert.equal(await readContentPage(slug, { ...pages, findPublishedBySlug: async () => { throw new Error("Should not read"); } }), null);
  }
  assert.equal(await readContentPage("missing", { ...pages, findPublishedBySlug: async () => { throw failure("PAGE_NOT_FOUND"); } }), null);
  assert.equal(await readContentPage("draft", { ...pages, findPublishedBySlug: async () => ({ ...row, status: "draft" }) }), null);
});
test("database failures are not disguised as missing pages or homepage fallback", async () => {
  const error = failure("PAGE_STORAGE_ERROR");
  await assert.rejects(readContentPage("valid-slug", { ...pages, findPublishedBySlug: async () => { throw error; } }), error);
  await assert.rejects(readHomepage({ findByKey: async () => { throw error; } }, pages), error);
  await assert.rejects(readHomepage({ findByKey: async () => ({ key: "homepage", value: row.id }) }, { ...pages, findById: async () => { throw error; } }), error);
});
