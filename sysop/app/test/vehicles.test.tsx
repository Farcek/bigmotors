import assert from "node:assert/strict";
import { test } from "node:test";
import { DTIError } from "@napp/dti-core";
import { Vehicles } from "@bigmotors/sysop-dti";
import { availableCommands, changedPayload, initialValues, listQuery, rawPayload, returnToList, validateVehicle, vehicleError, vehiclePayload } from "../src/pages/vehicles/model";
import { lookupOptions } from "../src/pages/vehicles/useVehicleLookups";
import { fileUrl, uploadFile } from "../src/files/client";
import { vehicleFieldTab, vehicleTabs, vehicleTabValue } from "../src/pages/vehicles/form-tabs";

test("saved tab state preserves valid tabs and defaults invalid navigation state", () => {
  for (const tab of vehicleTabs) assert.equal(vehicleTabValue(tab.value), tab.value);
  for (const value of [null, undefined, "unknown", {}, 1]) assert.equal(vehicleTabValue(value), "basic");
});

test("seven tabs assign every editable vehicle field exactly once", () => {
  assert.deepEqual(vehicleTabs.map((tab) => tab.label), ["Үндсэн", "Автомашин", "Үзүүлэлт", "Борлуулалт", "Зураг / Видео", "Агуулга", "Карт"]);
  const fields = vehicleTabs.flatMap((tab) => [...tab.fields]);
  assert.equal(fields.length, new Set(fields).size);
  assert.deepEqual([...fields].sort(), Object.keys(initialValues()).sort());
  assert.deepEqual(vehicleTabs[0].fields, ["title", "description", "mainImageId"]);
  for (const tab of vehicleTabs) for (const field of tab.fields) assert.equal(vehicleFieldTab(field), tab.value);
});

const id = "00000000-0000-4000-8000-000000000001";
const timestamp = "2026-09-12T00:00:00.000Z";

test("one optional YouTube video validates and clears in the media tab", () => {
  const values = { ...initialValues(), title: "Video", youtubeUrl: "https://youtu.be/abcdefghijk" };
  assert.equal(vehiclePayload(values).youtubeUrl, values.youtubeUrl);
  assert.equal(vehiclePayload({ ...values, youtubeUrl: " " }).youtubeUrl, null);
  assert.ok(validateVehicle({ ...values, youtubeUrl: "https://example.test/video" }).youtubeUrl);
  assert.equal(vehicleFieldTab("youtubeUrl"), "images");
});
test("draft permits title only and preserves zero, false and optional nulls", () => {
  const values = { ...initialValues(), title: " Test ", mileageKm: 0, financingAvailable: "false" };
  assert.deepEqual(validateVehicle(values), {});
  const payload = vehiclePayload(values);
  assert.equal(payload.title, "Test"); assert.equal(payload.description, null); assert.equal(payload.itemTitle, null);
  assert.equal(payload.mileageKm, 0); assert.equal(payload.financingAvailable, false); assert.equal(payload.price, null);
  assert.equal(payload.content, null); assert.equal(payload.mainImageId, null);
});
test("field limits, dependencies and publication requirements are enforced", () => {
  const values = { ...initialValues(), title: "Test" };
  for (const [key, value] of [["title", "x".repeat(256)], ["description", "x".repeat(513)], ["itemDesc", "x".repeat(513)], ["price", 0], ["mileageKm", -1], ["seatCount", 101], ["engineCapacityCc", 30001], ["manufactureYear", 3000]] as const) assert.ok(validateVehicle({ ...values, [key]: value })[key]);
  assert.ok(validateVehicle({ ...values, manufactureYear: 2024, importYear: 2023 }).importYear);
  assert.ok(validateVehicle({ ...values, fuelType: "electric", engineCapacityCc: 1 }).engineCapacityCc);
  assert.ok(validateVehicle({ ...values, modelId: id }).brandId);
  assert.ok(validateVehicle({ ...values, condition: "used", arrivalStatus: "in_stock" }, true).mileageKm);
  assert.ok(validateVehicle({ ...values, arrivalStatus: "in_stock" }, true).locationId);
  assert.deepEqual(validateVehicle({ ...values, title: "x".repeat(255), description: "x".repeat(512), content: "<p>" + "x".repeat(3000) + "</p>", vin: " arbitrary duplicate VIN " }), {});
});
test("year text inputs serialize as numbers and retain year validation", () => {
  const initial = { ...initialValues(), title: "Test", manufactureYear: 2004, importYear: 2020 };
  const values = { ...initial, manufactureYear: "2004", importYear: "2020" };
  assert.deepEqual(validateVehicle(values), {});
  assert.equal(vehiclePayload(values).manufactureYear, 2004);
  assert.equal(vehiclePayload(values).importYear, 2020);
  assert.deepEqual(changedPayload(values, initial), {});
  assert.equal(vehiclePayload({ ...values, importYear: "" }).importYear, null);
  for (const year of ["abcd", "2,004", "2e03", "2004.5", "1899", "9999", " "]) assert.ok(validateVehicle({ ...values, manufactureYear: year }).manufactureYear, year);
  assert.ok(validateVehicle({ ...values, importYear: "2003" }).importYear);
});
test("PATCH sends changed fields only and preserves untouched HTML", () => {
  const initial = { ...initialValues(), title: "Test", content: '<div class="legacy"><p>Stored HTML</p></div>', mainImageId: id, images: [{ fileId: id, sortOrder: 0 }] };
  assert.deepEqual(changedPayload({ ...initial, title: "Changed" }, initial), { title: "Changed" });
  assert.deepEqual(changedPayload({ ...initial, mainImageId: null, images: [] }, initial), { mainImageId: null, images: [] });
  assert.deepEqual(changedPayload(initial, initial), {});
});
test("entity mapping keeps file order and feature selections without mutation", () => {
  const body = rawPayload({ ...initialValues(), title: "Test", mileageKm: 0, financingAvailable: "false" });
  const row = Vehicles.entity.parse({ ...body, id, productType: "vehicle", publicationStatus: "draft", firstPublishedAt: null, createdAt: timestamp, updatedAt: timestamp, mainImage: null, itemImage: null });
  const mapped = initialValues(row); assert.equal(mapped.mileageKm, 0); assert.equal(mapped.financingAvailable, "false");
  mapped.featureIds.push(id); assert.deepEqual(row.featureIds, []);
});
test("inactive lookup and ancestors prevent new selections, not retained ones", () => {
  const row = { id, name: "Test", description: null, sortOrder: 0, isActive: false, createdAt: timestamp, updatedAt: timestamp };
  assert.equal(lookupOptions([row])[0].disabled, true);
  assert.equal(lookupOptions([row], [id])[0].disabled, false);
  assert.equal(lookupOptions([{ ...row, isActive: true }], [], [row])[0].disabled, true);
  assert.equal(lookupOptions([row], [], [], false)[0].disabled, false);
});
test("query validates bounds and back URL stays within the vehicle list", () => {
  assert.equal(listQuery(new URLSearchParams()).success, true);
  for (const query of ["offset=-1", "priceMin=10&priceMax=5", "limit=1000", "publicationStatus=unknown", "search=", "manufactureYearMax=9999"]) assert.equal(listQuery(new URLSearchParams(query)).success, false, query);
  assert.equal(returnToList("https://evil.test"), "/vehicles"); assert.equal(returnToList("//evil.test"), "/vehicles");
  assert.equal(returnToList("/vehicles?search=Test"), "/vehicles?search=Test");
});
test("lifecycle actions have no hard delete and errors do not leak server data", () => {
  assert.deepEqual(availableCommands("draft"), ["publish", "archive"]); assert.deepEqual(availableCommands("published"), ["hide", "archive"]); assert.deepEqual(availableCommands("archived"), ["restore"]);
  assert.match(vehicleError(new DTIError("Required for publication: mainImageId, modelId.", { code: "VEHICLE_PUBLICATION_INVALID" })), /Үндсэн зураг, Загвар/);
  assert.doesNotMatch(vehicleError(new DTIError("private secret", { code: "UNKNOWN_ERROR" })), /private|secret/);
});
test("file URL encodes original name; upload sends metadata and any file format", async (t) => {
  const data = { id, originalName: "test #?.raw", title: "Title", description: "Description", createdAt: timestamp, updatedAt: timestamp };
  assert.equal(fileUrl(data), `/files/${id}/test%20%23%3F.raw`);
  const signal = new AbortController().signal;
  t.mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
    assert.equal(url, "/api/files/upload"); assert.equal(init.method, "POST"); assert.equal(init.signal, signal); assert.equal(init.headers, undefined);
    const body = init.body as FormData; assert.equal(body.get("title"), "Title"); assert.equal(body.get("description"), "Description"); assert.equal((body.get("file") as File).name, data.originalName);
    return new Response(JSON.stringify(data), { status: 201 });
  });
  assert.deepEqual(await uploadFile(new File(["arbitrary bytes"], data.originalName), "Title", "Description", signal), data);
});
test("upload size rejection is readable and does not expose response payload", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response("private", { status: 413 }));
  await assert.rejects(uploadFile(new File(["x"], "x"), "", "", new AbortController().signal), /хэмжээнээс хэтэрсэн/);
});
