import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getVehicleSearchHref, normalizeVehicleSearchParams, parsedVehicleFilters,
  readVehicleSearchForm, readVehicleSearchParams, vehicleSearchParams, vehicleSearchToQuery,
  type VehicleSearchParams,
} from "@bigmotors/core";

test("shared search filters round trip through form, JSON and URL as strings", () => {
  const values: VehicleSearchParams = { fuel: "electric", mileage_min: "0", engine_max: "2000", brand: " ", model: undefined };
  const expected = { fuel: "electric", mileage_min: "0", engine_max: "2000" };
  const form = new FormData();
  for (const [key, value] of Object.entries(values)) if (value !== undefined) form.set(key, value);
  assert.deepEqual(readVehicleSearchForm(form), expected);
  assert.deepEqual(normalizeVehicleSearchParams(values), expected);
  assert.deepEqual(vehicleSearchParams.parse(JSON.parse(JSON.stringify(values))), expected);
  assert.deepEqual(readVehicleSearchParams(vehicleSearchToQuery(values)), expected);
  assert.deepEqual(readVehicleSearchParams(new URL(getVehicleSearchHref(values), "https://example.test").searchParams), expected);
  assert.deepEqual(parsedVehicleFilters.parse(values), { fuel: "electric", mileage_min: 0, engine_max: 2000 });
  assert.equal(getVehicleSearchHref({}), "/vehicles");
});

test("shared validation rejects non-string filters, malformed ranges and unknown fields", () => {
  for (const value of [null, [], "", { mileage_min: 0 }, { fuel: false }, { engine_max: null },
    { page: "1" }, { unknown: "" }, { price_min: "1e3" }, { engine_min: "-1" }, { mileage_max: "1.5" },
    { engine_min: "100", engine_max: "20" }, { year_max: String(new Date().getUTCFullYear() + 1) },
    { price_min: "999999999999999999999" }, { brand: "invalid" }, { condition: "invalid" }]) {
    assert.equal(vehicleSearchParams.safeParse(value).success, false, JSON.stringify(value));
  }
  assert.deepEqual(vehicleSearchParams.parse({ price_min: " 0 ", price_max: "10", fuel: "" }), { price_min: "0", price_max: "10" });
  assert.equal(vehicleSearchParams.safeParse({ engine_min: "20", engine_max: "100" }).success, true);
  assert.throws(() => readVehicleSearchParams(new URLSearchParams("fuel=electric&fuel=gasoline")));
  assert.throws(() => readVehicleSearchParams(new URLSearchParams("page=1")));
});
