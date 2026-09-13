import assert from "node:assert/strict";
import { test } from "node:test";
import { Vehicles } from "../src/index.js";

const id = "d4ea26c2-52a0-4223-8cc1-d649b84281d1";
const otherId = "85b4f544-31f6-4fd1-b198-5602121c2145";
const date = "2026-09-12T00:00:00.000Z";
const entity: Vehicles.Entity = {
  id, productType: "vehicle", title: "Sample vehicle", description: null, content: null,
  mainImageId: null, itemTitle: null, itemDesc: null, itemImageId: null,
  price: null, currency: null, priceDisplayMode: null, publicationStatus: "draft", isFeatured: false,
  internalNote: null, firstPublishedAt: null, createdAt: date, updatedAt: date,
  brandId: null, modelId: null, variantId: null, manufactureYear: null, importYear: null, vin: null,
  bodyTypeId: null, fuelType: null, engineCapacityCc: null, transmission: null, drivetrain: null,
  steeringPosition: null, exteriorColorId: null, interiorColorId: null, seatCount: null,
  condition: null, mileageKm: null, branchId: null, locationId: null, conditionDescription: null,
  saleStatus: null, arrivalStatus: null, financingAvailable: null, youtubeUrl: null,
  mainImage: null, itemImage: null, images: [], featureIds: [],
};

test("vehicle actions expose detail, draft CRUD and explicit publication commands", () => {
  for (const [action, name, method, path] of [
    [Vehicles.list, "vehicleList", "GET", "/vehicles"],
    [Vehicles.get, "vehicleGet", "GET", "/vehicles/:id"],
    [Vehicles.create, "vehicleCreate", "POST", "/vehicles"],
    [Vehicles.update, "vehicleUpdate", "PATCH", "/vehicles/:id"],
    [Vehicles.publish, "vehiclePublish", "POST", "/vehicles/:id/publish"],
    [Vehicles.hide, "vehicleHide", "POST", "/vehicles/:id/hide"],
    [Vehicles.archive, "vehicleArchive", "POST", "/vehicles/:id/archive"],
    [Vehicles.restore, "vehicleRestore", "POST", "/vehicles/:id/restore"],
  ] as const) {
    assert.equal(action.name, name);
    assert.equal(action.method, method);
    assert.equal(action.path, path);
    assert.equal(action.result, action === Vehicles.list ? Vehicles.listResult : Vehicles.entity);
  }
  for (const action of [Vehicles.get, Vehicles.publish, Vehicles.hide, Vehicles.archive, Vehicles.restore]) {
    assert.equal(action.params, Vehicles.params);
    assert.equal(action.body, undefined);
  }
  assert.equal(Vehicles.create.body, Vehicles.createBody);
  assert.equal(Vehicles.update.body, Vehicles.updateBody);
  assert.equal(Vehicles.update.params, Vehicles.params);
  assert.equal(Vehicles.list.query, Vehicles.listQuery);
  assert.equal("remove" in Vehicles, false);
  assert.equal(Vehicles.params.safeParse({ id: "bad" }).success, false);
  assert.equal(Vehicles.params.safeParse({ id, productType: "part" }).success, false);
});

test("title alone creates a draft input without inventing unknown values", () => {
  assert.deepEqual(Vehicles.createBody.parse({ title: "  Sample  " }), { title: "Sample" });
  assert.deepEqual(Vehicles.createBody.parse({ title: "Sample", description: " ", itemTitle: "", itemDesc: null }),
    { title: "Sample", description: null, itemTitle: null, itemDesc: null });
  for (const body of [{}, { title: " " }, { title: null }, { title: "x".repeat(256) }]) {
    assert.equal(Vehicles.createBody.safeParse(body).success, false);
  }
  for (const forbidden of ["id", "productId", "productType", "publicationStatus", "firstPublishedAt", "createdAt", "updatedAt", "usage", "mainImage"]) {
    assert.equal(Vehicles.createBody.safeParse({ title: "Sample", [forbidden]: id }).success, false, forbidden);
    assert.equal(Vehicles.updateBody.safeParse({ [forbidden]: id }).success, false, forbidden);
  }
});

test("PATCH distinguishes omission, null, false and empty relation lists", () => {
  const patch = Vehicles.updateBody.parse({ description: null, mainImageId: null, isFeatured: false, financingAvailable: null, images: [], featureIds: [] });
  assert.deepEqual(patch, { description: null, mainImageId: null, isFeatured: false, financingAvailable: null, images: [], featureIds: [] });
  assert.equal(Object.hasOwn(patch, "title"), false);
  assert.equal(Object.hasOwn(patch, "saleStatus"), false);
  for (const body of [{}, { title: undefined }, { title: null }, { images: null }, { featureIds: null }, { isFeatured: null }, { price: "100" }]) {
    assert.equal(Vehicles.updateBody.safeParse(body).success, false);
  }
  // Existing parent and publication state are only known to the backend.
  assert.deepEqual(Vehicles.updateBody.parse({ modelId: id }), { modelId: id });
  assert.deepEqual(Vehicles.updateBody.parse({ fuelType: "electric" }), { fuelType: "electric" });
});

test("text limits apply to summaries, not VIN, HTML content or internal notes", () => {
  const vin = " arbitrary\nVIN ! " + "x".repeat(1024);
  const content = "<p>" + "x".repeat(4096) + "</p>";
  const body = Vehicles.createBody.parse({ title: "x".repeat(255), description: "x".repeat(512), content, vin, internalNote: content });
  assert.equal(body.vin, vin);
  assert.equal(body.content, content);
  assert.equal(body.internalNote, content);
  assert.equal(Vehicles.updateBody.parse({ vin: "" }).vin, "");
  for (const key of ["description", "itemDesc", "conditionDescription"]) {
    assert.equal(Vehicles.updateBody.safeParse({ [key]: "x".repeat(513) }).success, false);
  }
  assert.equal(Vehicles.updateBody.safeParse({ itemTitle: "x".repeat(256) }).success, false);
});

test("numeric, enum and provided cross-field constraints match vehicle rules", () => {
  const year = new Date().getUTCFullYear();
  for (const [key, min, max] of [
    ["price", 1, 99_999_999_999], ["manufactureYear", 1900, year], ["importYear", 1900, year],
    ["engineCapacityCc", 1, 30_000], ["mileageKm", 0, 9_999_999], ["seatCount", 1, 100],
  ] as const) {
    for (const value of [min, max, null]) assert.equal(Vehicles.updateBody.safeParse({ [key]: value }).success, true, key);
    for (const value of [min - 1, max + 1, 1.5, Infinity, NaN, "1", false]) {
      assert.equal(Vehicles.updateBody.safeParse({ [key]: value }).success, false, `${key}: ${value}`);
    }
  }
  for (const input of [
    { manufactureYear: 2020, importYear: 2019 }, { fuelType: "electric", engineCapacityCc: 1 },
    { currency: "USD" }, { transmission: "other" }, { financingAvailable: "false" }, { locationId: "invalid" },
  ]) assert.equal(Vehicles.updateBody.safeParse(input).success, false);
  assert.equal(Vehicles.createBody.safeParse({ title: "EV", fuelType: "electric", engineCapacityCc: null }).success, true);
  assert.equal(Vehicles.createBody.safeParse({ title: "Model", modelId: id }).success, false);
  assert.equal(Vehicles.createBody.safeParse({ title: "Variant", brandId: id, variantId: id }).success, false);
  assert.equal(Vehicles.createBody.safeParse({ title: "Car", brandId: id, modelId: otherId, variantId: id }).success, true);
});

test("gallery stores unique file references and order without accepting file metadata or usage", () => {
  assert.equal(Vehicles.updateBody.safeParse({ mainImageId: id, itemImageId: id, images: [{ fileId: id, sortOrder: 0 }], featureIds: [id, otherId] }).success, true);
  assert.equal(Vehicles.updateBody.safeParse({ images: [{ fileId: id, sortOrder: 0 }, { fileId: id, sortOrder: 1 }] }).success, false);
  assert.equal(Vehicles.updateBody.safeParse({ featureIds: [id, id] }).success, false);
  for (const value of [
    { fileId: id, sortOrder: -1 }, { fileId: id, sortOrder: 0.5 }, { fileId: id, sortOrder: 2_147_483_648 },
    { fileId: id, sortOrder: 0, title: "File metadata is separate" }, { id, fileId: id, sortOrder: 0 },
    { fileId: id, sortOrder: 0, usage: [] },
  ]) assert.equal(Vehicles.imagesInput.safeParse([value]).success, false);
  const images = Array.from({ length: 101 }, (_, index) => ({ fileId: `00000000-0000-4000-8000-${index.toString().padStart(12, "0")}`, sortOrder: index }));
  assert.equal(Vehicles.imagesInput.safeParse(images).success, true);
});

test("admin list query parses wire values, pagination, all statuses and bounded ranges", () => {
  assert.deepEqual(Vehicles.listQuery.parse({}), { limit: 50, offset: 0, sort: "created_desc" });
  assert.deepEqual(Vehicles.listQuery.parse({ limit: "10", offset: "20", isFeatured: "false", priceMin: "1", mileageKmMin: "0", publicationStatus: "archived" }),
    { limit: 10, offset: 20, isFeatured: false, priceMin: 1, mileageKmMin: 0, publicationStatus: "archived", sort: "created_desc" });
  assert.equal(Vehicles.listQuery.parse({ search: "  Toyota  " }).search, "Toyota");
  for (const query of [
    { priceMin: 10, priceMax: 9 }, { manufactureYearMin: 2020, manufactureYearMax: 2019 }, { mileageKmMin: 2, mileageKmMax: 1 },
    { priceMin: "" }, { priceMin: "1.5" }, { priceMin: true }, { priceMin: null }, { limit: 0 }, { limit: 101 },
    { offset: -1 }, { sort: "unknown" }, { search: " " }, { isFeatured: "FALSE" }, { brandId: [id] }, { isActive: true },
  ]) assert.equal(Vehicles.listQuery.safeParse(query).success, false, JSON.stringify(query));
});

test("detail and paginated summary results are JSON safe and keep fallback values nullable", () => {
  const file = { id: otherId, originalName: "image.any", title: null, description: null, createdAt: date, updatedAt: date };
  const full: Vehicles.Entity = { ...entity, mainImageId: otherId, mainImage: file, images: [{ id, fileId: otherId, sortOrder: 0, file }], featureIds: [id] };
  assert.deepEqual(Vehicles.entity.parse(full), full);
  assert.equal(Vehicles.entity.parse(full).itemTitle, null);
  const { content, internalNote, vin, images, featureIds, ...item } = full;
  const result = { items: [item], total: 1, limit: 50, offset: 0 };
  assert.deepEqual(Vehicles.listResult.parse(result), result);
  for (const invalid of [[], { ...result, total: -1 }, { ...result, items: [full] }, { ...result, total: undefined }]) {
    assert.equal(Vehicles.listResult.safeParse(invalid).success, false);
  }
  for (const invalid of [
    { ...full, productType: "part" }, { ...full, createdAt: new Date() }, { ...full, updatedAt: "not-date" },
    { ...full, firstPublishedAt: "2026-09-12" }, { ...full, mainImage: undefined }, { ...full, filePath: "/secret" },
  ]) assert.equal(Vehicles.entity.safeParse(invalid).success, false);
});
