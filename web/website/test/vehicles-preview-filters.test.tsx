import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CATALOG_LIMITS, DRIVETRAINS, FUEL_TYPES, TRANSMISSIONS, vehicleListingQuery, vehicleSearchParams, vehicleSearchToQuery } from "@bigmotors/core";
import { VehiclesPreview } from "../src/components/vehicles.preview";
import { DEMO_LOOKUPS } from "./fixtures/vehicle-lookups";
import { applyPreset, changeFilter, filterErrors, RANGE_PRESETS, readPreviewQuery, selectedPreset } from "../src/components/vehicles.preview/model";

test("presets set both bounds, clear stale bounds, and match manual input", () => {
  for (const name of ["price", "year", "mileage"] as const) {
    for (const preset of RANGE_PRESETS[name]) {
      const values = applyPreset({ fuel: "hybrid", [`${name}_min`]: "999", [`${name}_max`]: "999" }, name, preset.value);
      assert.equal(values[`${name}_min`] ?? "", preset.min);
      assert.equal(values[`${name}_max`] ?? "", preset.max);
      assert.equal(values.fuel, "hybrid");
      assert.equal(selectedPreset(values, name), preset.value);
      assert.ok(vehicleSearchParams.safeParse(values).success);
      assert.deepEqual(applyPreset(values, name, ""), { fuel: "hybrid" });
    }
  }
  assert.equal(applyPreset({}, "price", "under20").price_max, "19999999");
  assert.equal(applyPreset({}, "mileage", "50000").mileage_max, "49999");
  assert.equal(selectedPreset({ price_min: "020000000", price_max: "50000000" }, "price"), "20to50");
  assert.equal(selectedPreset({ price_min: "123" }, "price"), undefined);
  assert.equal(selectedPreset({}, "price"), "");
});

test("shared validation rejects invalid numbers and ranges, retains zero", () => {
  for (const value of ["-1", "1.5", "abc", "1,000", String(CATALOG_LIMITS.priceMax + 1)]) assert.ok(filterErrors({ price_min: value }).price_min);
  for (const name of ["price", "year", "mileage", "engine"] as const) assert.match(filterErrors({ [`${name}_min`]: "2024", [`${name}_max`]: "2020" })[`${name}_max`]!, /Дээд утга/);
  assert.ok(filterErrors({ year_min: String(new Date().getUTCFullYear() + 1) }).year_min);
  assert.ok(filterErrors({ year_min: "1899" }).year_min);
  assert.ok(filterErrors({ mileage_max: String(CATALOG_LIMITS.mileageMax + 1) }).mileage_max);
  assert.ok(filterErrors({ engine_max: String(CATALOG_LIMITS.engineCapacityMax + 1) }).engine_max);
  assert.deepEqual(filterErrors({ mileage_min: "0", price_min: "0", engine_min: "0" }), {});
  assert.equal(changeFilter({}, "mileage_min", "0").mileage_min, "0");
});

test("URL filters retain contract strings, normalize IDs, and infer known parents", () => {
  const brand = DEMO_LOOKUPS.brands[0];
  const model = DEMO_LOOKUPS.models[0];
  const variant = DEMO_LOOKUPS.variants[0];
  const state = readPreviewQuery({ brand: brand.id.toUpperCase(), model: model.id, variant: variant.id, fuel: "cng", transmission: "amt", drivetrain: "awd", price_min: "0", sort: "price_asc", page: "2" }, DEMO_LOOKUPS);
  assert.equal(state.filters.brand, brand.id);
  assert.equal(state.sort, "price_asc");
  assert.equal(state.message, "");
  assert.ok(Object.values(state.filters).every((value) => typeof value === "string"));
  assert.ok(vehicleSearchParams.safeParse(state.filters).success);
  assert.equal(vehicleSearchToQuery(state.filters).get("price_min"), "0");
  assert.deepEqual(readPreviewQuery({ variant: variant.id }, DEMO_LOOKUPS).filters, { brand: brand.id, model: model.id, variant: variant.id });
  assert.deepEqual(changeFilter(state.filters, "brand", DEMO_LOOKUPS.brands[1].id), { brand: DEMO_LOOKUPS.brands[1].id, fuel: "cng", transmission: "amt", drivetrain: "awd", price_min: "0" });
  assert.equal(changeFilter(state.filters, "model", DEMO_LOOKUPS.models[1].id).variant, undefined);
});

test("bad URL values remain correctable; duplicates and unknown keys are reported", () => {
  const state = readPreviewQuery({ fuel: ["gasoline", "diesel"], wat: "oops", sort: "nope", page: "-1", price_min: "abc", transmission: "automatic" });
  assert.equal(state.filters.fuel, undefined);
  assert.equal(state.filters.price_min, "abc");
  assert.equal(state.filters.transmission, "automatic");
  assert.ok(filterErrors(state.filters).price_min);
  assert.match(state.message, /зөвхөн нэг утга/);
  assert.match(state.message, /танихгүй/);
  assert.match(state.message, /Эрэмбийн/);
  assert.match(state.message, /Хуудасны/);
  const foreign = "00000000-0000-4000-8000-000000000001";
  const html = renderToStaticMarkup(<VehiclesPreview initialFilters={{ brand: foreign }} />);
  assert.match(html, /URL-ийн марк/);
  assert.ok(html.includes(`value="${foreign}"`));
});

test("enum options follow shared order with canonical values and no unwanted fields", () => {
  const html = renderToStaticMarkup(<VehiclesPreview initialFilters={{ fuel: "plug_in_hybrid", transmission: "e_cvt", drivetrain: "four_wheel_drive", price_min: "20000000", price_max: "50000000" }} initialQuery={vehicleListingQuery.parse({ sort: "price_desc" })} />);
  for (const [name, expected] of [["fuel", FUEL_TYPES], ["transmission", TRANSMISSIONS], ["drivetrain", DRIVETRAINS]] as const) {
    const inputs = html.match(new RegExp(`<input[^>]*name="${name}"[^>]*>`, "g")) ?? [];
    assert.deepEqual(inputs.map((input) => input.match(/value="([^"]*)"/)![1]), ["", ...expected]);
    assert.equal(inputs.filter((input) => input.includes('checked=""')).length, 1);
  }
  assert.match(html, /name="price_min"[^>]*value="20000000"/);
  assert.match(html, /value="price_desc" selected=""/);
  assert.doesNotMatch(html, /name="steering"|name="color"/);
});
