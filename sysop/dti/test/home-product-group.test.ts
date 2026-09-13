import assert from "node:assert/strict";
import { test } from "node:test";
import { HomeProductGroups } from "../src/home-product-group.js";

test("home group contracts restrict filters to the public vehicle search vocabulary", () => {
  const body = HomeProductGroups.createBody.parse({ title: " Electric ", filters: { fuel: "electric", mileage_min: "0" }, imageId: null });
  assert.equal(body.title, "Electric"); assert.equal(body.filters.mileage_min, 0);
  for (const filters of [{ page: 2 }, { publicationStatus: "draft" }, { sql: "anything" }, { engine_min: 3000, engine_max: 2000 }, { year_max: new Date().getUTCFullYear() + 1 }, { fuel: "invalid" }, []]) assert.equal(HomeProductGroups.createBody.safeParse({ title: "test", filters }).success, false);
  assert.equal(HomeProductGroups.updateBody.safeParse({}).success, false);
  assert.equal(HomeProductGroups.updateBody.safeParse({ imageId: null }).success, true);
  assert.equal(HomeProductGroups.updateBody.safeParse({ filters: {} }).success, true);
});
