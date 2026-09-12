import assert from "node:assert/strict";
import { test } from "node:test";
import { Files } from "../src/file.js";

test("upload contract has a single multipart route and strict metadata", () => {
  assert.equal(Files.uploadRoute.path, "/files/upload");
  assert.equal("maxBytes" in Files.uploadRoute, false);
  assert.deepEqual(Files.uploadMetadata.parse({ title: " ", description: " text " }), { title: null, description: "text" });
  for (const input of [{ title: ["one", "two"] }, { usage: [] }, { productId: "x" }, { title: null }, { title: "x".repeat(256) }]) {
    assert.equal(Files.uploadMetadata.safeParse(input).success, false);
  }
});
test("upload result is flat and excludes path, usage and unknown fields", () => {
  const value = { id: "d61fc439-90f7-48dd-86e7-20ca3625a421", originalName: "x", title: null, description: null,
    createdAt: "2026-09-12T08:00:00.000Z", updatedAt: "2026-09-12T08:00:00.000Z" };
  assert.deepEqual(Files.uploadResult.parse(value), value);
  for (const extra of [{ filePath: "uploads/x" }, { usage: [] }, { success: true }]) {
    assert.equal(Files.uploadResult.safeParse({ ...value, ...extra }).success, false);
  }
});
