import assert from "node:assert/strict";
import { test } from "node:test";
import { readVehicleListingQuery, vehicleListingPageSize, vehicleListingQuery, vehicleListingToQuery, vehicleSearchParams } from "@bigmotors/core";
import { fetchCatalogVehicles } from "../src/components/vehicles.preview/client";
import { catalogVehicleResponse } from "../src/server/public-vehicle-response";
import type { PublicVehicleService } from "@bigmotors/db";

test("listing contract keeps filter strings separate from pagination and responsive density", () => {
  for (const [columns, size] of [["2", "12"], ["3", "18"], ["4", "24"], ["6", "36"]] as const) {
    assert.equal(vehicleListingPageSize(columns, true), size);
    assert.equal(vehicleListingPageSize(columns, false), "24");
  }
  const query = vehicleListingQuery.parse({ fuel: "hybrid", price_min: "0", page: "4", columns: "2", page_size: "12", sort: "price_desc" });
  assert.deepEqual(readVehicleListingQuery(vehicleListingToQuery(query)), query);
  assert.ok(Object.values(query).every((value) => typeof value === "string"));
  assert.equal(vehicleSearchParams.safeParse(query).success, false);
  for (const bad of ["page=1&page=2", "fuel=gasoline&fuel=diesel", "page_size=48", "columns=5", "sort=nope", "wat=1"]) assert.throws(() => readVehicleListingQuery(new URLSearchParams(bad)));
});

test("catalog client forwards URL strings and AbortSignal, and validates bounded responses", async () => {
  const query = vehicleListingQuery.parse({ page: "4", page_size: "12" });
  const controller = new AbortController();
  const data = { items: Array.from({ length: 9 }, (_, i) => ({ id: `test-${i}`, title: `Vehicle ${i}` })), page: 4, pageSize: 12, pageCount: 4, total: 45, brandCounts: {} };
  await fetchCatalogVehicles(query, controller.signal, (async (url, options) => {
    assert.match(String(url), /^\/api\/vehicles\/search\?/);
    assert.match(String(url), /page_size=12/);
    assert.equal(options?.signal, controller.signal); assert.equal(options?.cache, "no-store");
    return Response.json(data);
  }) as typeof fetch);
  for (const bad of [{ ...data, pageSize: 100 }, { ...data, page: 5 }, { ...data, brandCounts: { brand: -1 } }, { ...data, total: -1 }]) {
    await assert.rejects(fetchCatalogVehicles(query, controller.signal, (async () => Response.json(bad)) as typeof fetch));
  }
  await assert.rejects(fetchCatalogVehicles(query, controller.signal, (async () => new Response(null, { status: 500 })) as typeof fetch), /ачаалж/);
  await assert.rejects(fetchCatalogVehicles(query, controller.signal, (async () => { throw new TypeError("offline"); }) as typeof fetch), /холбогдож/);
  controller.abort();
  await assert.rejects(fetchCatalogVehicles(query, controller.signal, (async (_url, options) => { options?.signal?.throwIfAborted(); return Response.json(data); }) as typeof fetch));
});

test("catalog response preserves public file URLs and sanitizes server failures", async () => {
  const service = { search: async () => ({ total: 1, page: 1, pageCount: 1, pageSize: 24, brandCounts: {}, items: [{ id: "vehicle", title: "Vehicle", mainImageId: "file", mainImageName: "a b.jpg", itemImageId: null, itemImageName: null }] }) } as unknown as Pick<PublicVehicleService, "search">;
  const response = await catalogVehicleResponse(new Request("http://website/api/vehicles/search"), service);
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.items[0].imageUrl, "/files/file/a%20b.jpg");
  assert.equal("mainImageName" in data.items[0], false);
  const broken = { search: async () => { throw new Error("PRIVATE-CONNECTION-DETAILS"); } } as Pick<PublicVehicleService, "search">;
  const error = await catalogVehicleResponse(new Request("http://website/api/vehicles/search"), broken);
  assert.equal(error.status, 500);
  assert.doesNotMatch(await error.text(), /PRIVATE/);
  const invalid = await catalogVehicleResponse(new Request("http://website/api/vehicles/search?sort=bad"), service);
  assert.equal(invalid.status, 400);
});
