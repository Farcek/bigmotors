import assert from "node:assert/strict";
import { test } from "node:test";
import type { PublicVehicleService } from "@bigmotors/db";
import { readVehicleDetail, vehicleDetailResponse } from "../src/server/vehicle-detail-response";

const record: NonNullable<Awaited<ReturnType<PublicVehicleService["detail"]>>> = {
  id: "car", title: "Toyota", description: "Description", content: '<h2>Details</h2><p onclick="evil()">Safe <strong>text</strong></p><script>secret()</script><iframe src="https://evil.test"></iframe><a href="javascript:evil()">Bad</a><a href="https://example.com">Good</a>',
  mainImageId: "main", mainImageName: "гол зураг.jpg", price: null, currency: "MNT", priceDisplayMode: "inquire",
  brandId: "brand", bodyTypeId: "body", brandName: "Toyota", modelName: null, variantName: null, bodyTypeName: "SUV",
  manufactureYear: 2020, importYear: null, mileageKm: 0, fuelType: "electric", engineCapacityCc: null, transmission: null,
  drivetrain: null, steeringPosition: null, seatCount: null, exteriorColorName: null, interiorColorName: null,
  condition: "used", conditionDescription: null, arrivalStatus: "in_stock", financingAvailable: null, youtubeUrl: null,
  branchName: null, locationName: null, features: ["Camera"],
  photos: [{ id: "second", originalName: "second.jpg" }, { id: "main", originalName: "гол зураг.jpg" }],
};

const service: Pick<PublicVehicleService, "detail" | "list"> = {
  detail: async () => record,
  list: async () => ({ items: [], total: 0, page: 1, pageCount: 0, pageSize: 12 }),
};

test("detail presenter orders main first, deduplicates it, encodes URLs and sanitizes public content", async () => {
  const queries: unknown[] = [];
  const result = await readVehicleDetail({ ...service, list: async (query) => { queries.push(query); return service.list(); } }, "car");
  assert.deepEqual(queries, [{ category: "body" }, { brand: "brand" }, {}]);
  assert.ok(result);
  assert.deepEqual(result.item.photos.map((photo) => photo.src), [`/files/main/${encodeURIComponent("гол зураг.jpg")}`, "/files/second/second.jpg"]);
  assert.equal(result.item.imageCount, 2);
  assert.equal(result.item.price, null);
  assert.match(result.item.contentHtml!, /<h2>Details<\/h2>|<strong>text<\/strong>/);
  assert.doesNotMatch(result.item.contentHtml!, /onclick|script|iframe|javascript|secret/);
  assert.match(result.item.contentHtml!, /href="https:\/\/example.com"/);
  assert.doesNotMatch(JSON.stringify(result), /mainImageId|mainImageName|originalName|"content"|brandId|bodyTypeId/);
});

test("missing main image uses ordered photos, empty content omitted and brand fallback is used", async () => {
  const result = await readVehicleDetail({
    detail: async () => ({ ...record, mainImageId: null, mainImageName: null, bodyTypeId: null, content: "<p><br></p>", photos: [] }),
    list: service.list,
  }, "car");
  assert.ok(result);
  assert.equal(result.item.imageUrl, null);
  assert.equal(result.item.contentHtml, null);
  assert.deepEqual(result.item.photos, []);
});

test("missing vehicle does not query recommendations; API errors are uncached and sanitized", async () => {
  const missing = await vehicleDetailResponse("missing", { detail: async () => null, list: async () => { throw new Error("Must not run"); } });
  assert.equal(missing.status, 404);
  assert.equal(missing.headers.get("cache-control"), "no-store");
  const failed = await vehicleDetailResponse("car", { ...service, detail: async () => { throw new Error("DATABASE_PASSWORD=secret"); } });
  assert.equal(failed.status, 500);
  assert.deepEqual(await failed.json(), { code: "VEHICLE_DETAIL_FAILED" });
  assert.equal(failed.headers.get("cache-control"), "no-store");
  const success = await vehicleDetailResponse("car", service);
  assert.equal(success.status, 200);
  assert.equal(success.headers.get("cache-control"), "no-store");
});
