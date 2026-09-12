import assert from "node:assert/strict";
import { test } from "node:test";
import { Pages } from "../src/page.js";

test("page contracts accept JSON objects and reject invalid slugs, server fields and empty updates", () => {
  assert.deepEqual(Pages.createBody.parse({ title: " About ", slug: " about ", description: " " }), { title: "About", slug: "about", description: null });
  const content = { blocks: [{ text: "A", count: 0, visible: false }], optional: null };
  assert.deepEqual(Pages.createBody.parse({ title: "A", slug: "a", content }).content, content);
  for (const fields of [{ slug: "A" }, { slug: "a/b" }, { slug: "a--b" }, { meta: [] }, { content: null }, { content: "HTML" }, { createdAt: "fake" }, { publishedAt: null }, { status: "hidden" }]) {
    assert.equal(Pages.createBody.safeParse({ title: "A", slug: "a", ...fields }).success, false);
  }
  assert.equal(Pages.updateBody.safeParse({}).success, false);
  assert.equal(Pages.updateBody.safeParse({ content: {}, meta: {}, mainImageId: null }).success, true);
  assert.equal(Pages.listQuery.parse({ limit: "21", status: "draft" }).limit, 21);
  for (const query of [{ limit: 101 }, { offset: -1 }, { status: "unknown" }]) assert.equal(Pages.listQuery.safeParse(query).success, false);
});
