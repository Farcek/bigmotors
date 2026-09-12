import assert from "node:assert/strict";
import { test } from "node:test";
import { Settings } from "../src/settings.js";

test("settings contracts accept any key and value without predefined-key rules", () => {
  for (const key of ["homepage", "custom/key? &Монгол", "__proto__", "Key", "key", " key "]) {
    assert.deepEqual(Settings.createBody.parse({ key, value: " literal " }), { key, value: " literal " });
  }
  assert.deepEqual(Settings.updateBody.parse({ value: "" }), { value: "" });
  for (const input of [{ key: "", value: "" }, { key: " ", value: "" }, { key: "k", value: null }, { key: "k", value: "a".repeat(256) }, { key: "k".repeat(256), value: "" }, { key: "k", value: "\0" }, { key: "k", value: "v", id: "x" }]) assert.equal(Settings.createBody.safeParse(input).success, false);
  assert.equal(Settings.updateBody.safeParse({ key: "new", value: "x" }).success, false);
  assert.equal(Settings.updateBody.safeParse({}).success, false);
  assert.equal(Settings.saveBody.safeParse({ entries: [] }).success, false);
  assert.equal(Settings.saveBody.safeParse({ entries: [{ key: "a", value: "1" }, { key: "a", value: "2" }] }).success, false);
  assert.equal(Settings.listQuery.parse({ key: "homepage", limit: "1" }).limit, 1);
});
