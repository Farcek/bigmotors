import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { TKN_DB, VehicleService, type BigMotorsDb } from "@bigmotors/db";
import * as schema from "@bigmotors/db/schema";
import { Files, Vehicles } from "@bigmotors/sysop-dti";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { createApp } from "../src/app.js";
import { createContainer } from "../src/di.js";

test("vehicle API runs DTI, DI and transactional DB service with original uploaded files", async (t) => {
  const folder = await mkdtemp(path.join(tmpdir(), "bm-vehicles-http-"));
  const db = new PGlite();
  const orm = drizzle(db, { schema });
  const root = createContainer({ env: { FILES_ROOT: folder, FILES_UPLOADS: path.join(folder, "uploads") } });
  const di = root.child("vehicles-http").asValue(TKN_DB, orm as unknown as BigMotorsDb);
  const server = createServer(createApp(di));
  t.after(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
      server.closeAllConnections();
    });
    root.destroy();
    if (!db.closed) await db.close();
    assert.ok(path.resolve(folder).startsWith(path.resolve(tmpdir()) + path.sep));
    await rm(folder, { recursive: true, force: true, maxRetries: 3 });
  });
  await migrate(orm, { migrationsFolder: fileURLToPath(new URL("../../../packages/db/migrations/", import.meta.url)) });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const origin = `http://127.0.0.1:${address.port}`;
  async function request(method: string, suffix = "", body?: unknown) {
    const response = await fetch(`${origin}/api/vehicles${suffix}`, {
      method, ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
    });
    return { status: response.status, body: await response.json() as unknown };
  }
  function data(result: Awaited<ReturnType<typeof request>>) {
    assert.equal(result.status, 200, JSON.stringify(result.body));
    assert.ok(result.body && typeof result.body === "object" && "success" in result.body && result.body.success === true && "data" in result.body);
    return result.body.data;
  }
  function failure(result: Awaited<ReturnType<typeof request>>, status: number, code: string) {
    assert.equal(result.status, status, JSON.stringify(result.body));
    assert.ok(result.body && typeof result.body === "object" && "code" in result.body);
    assert.equal(result.body.code, code);
    assert.ok(!JSON.stringify(result.body).includes(folder));
    for (const key of ["stack", "cause", "details"]) assert.equal(key in result.body, false);
  }
  const create = async (body: Vehicles.CreateBody) => Vehicles.entity.parse(data(await request("POST", "", body)));
  const get = async (id: string) => Vehicles.entity.parse(data(await request("GET", `/${id}`)));
  const patch = async (id: string, body: Vehicles.UpdateBody) => Vehicles.entity.parse(data(await request("PATCH", `/${id}`, body)));
  const command = async (id: string, name: string) => Vehicles.entity.parse(data(await request("POST", `/${id}/${name}`)));
  const list = async (query = "") => Vehicles.listResult.parse(data(await request("GET", query)));
  async function upload() {
    const body = new FormData();
    body.append("file", new Blob(["original file bytes"]), "зураг.any-format");
    const response = await fetch(`${origin}/api/files/upload`, { method: "POST", body });
    assert.equal(response.status, 201);
    return Files.uploadResult.parse(await response.json());
  }
  async function usage(id: string) { return (await orm.select().from(schema.files).where(eq(schema.files.id, id)))[0]!.usage; }
  const ids = { brand: randomUUID(), brand2: randomUUID(), model: randomUUID(), model2: randomUUID(), variant: randomUUID(), variant2: randomUUID(), color: randomUUID(), body: randomUUID(), branch: randomUUID(), location: randomUUID(), feature: randomUUID(), feature2: randomUUID() };
  await orm.insert(schema.vehicleBrands).values([{ id: ids.brand, name: "Alpha maker" }, { id: ids.brand2, name: "Beta maker" }]);
  await orm.insert(schema.vehicleModels).values([{ id: ids.model, brandId: ids.brand, name: "Model Alpha" }, { id: ids.model2, brandId: ids.brand2, name: "Model Beta" }]);
  await orm.insert(schema.vehicleVariants).values([{ id: ids.variant, modelId: ids.model, name: "Variant Alpha" }, { id: ids.variant2, modelId: ids.model2, name: "Variant Beta" }]);
  await orm.insert(schema.colors).values({ id: ids.color, name: "White" });
  await orm.insert(schema.vehicleBodyTypes).values({ id: ids.body, name: "SUV" });
  await orm.insert(schema.branches).values({ id: ids.branch, name: "Company branch" });
  await orm.insert(schema.locations).values({ id: ids.location, name: "Physical location" });
  await orm.insert(schema.vehicleFeatures).values([{ id: ids.feature, name: "Feature one" }, { id: ids.feature2, name: "Feature two" }]);
  const file = await upload();
  const valid = (extra: Partial<Vehicles.CreateBody> = {}): Vehicles.CreateBody => ({
    title: "Complete vehicle", brandId: ids.brand, modelId: ids.model, variantId: ids.variant, manufactureYear: 2020,
    bodyTypeId: ids.body, fuelType: "gasoline", engineCapacityCc: 3000, transmission: "automatic", drivetrain: "awd",
    steeringPosition: "left", exteriorColorId: ids.color, condition: "used", mileageKm: 0,
    saleStatus: "available", arrivalStatus: "in_stock", branchId: ids.branch, locationId: ids.location,
    priceDisplayMode: "show_price", price: 84_500_000, currency: "MNT", mainImageId: file.id, ...extra,
  });

  await t.test("title-only draft and strict admin detail/list round trip", async () => {
    assert.deepEqual(await list(), { items: [], total: 0, limit: 50, offset: 0 });
    const row = await create({ title: "  Draft  ", description: " ", content: "<p>" + "x".repeat(6000) + "</p>", vin: " unrestricted ! ", internalNote: "internal" });
    assert.equal(row.title, "Draft");
    assert.equal(row.publicationStatus, "draft");
    assert.equal(row.firstPublishedAt, null);
    assert.equal(row.isFeatured, false);
    assert.equal(row.mileageKm, null);
    assert.equal(row.financingAvailable, null);
    assert.equal(row.description, null);
    assert.equal(row.itemTitle, null);
    assert.equal(row.vin, " unrestricted ! ");
    assert.deepEqual(row.images, []);
    assert.deepEqual(await get(row.id.toUpperCase()), row);
    const summary = await list("?limit=1");
    assert.equal(summary.total, 1);
    for (const key of ["content", "vin", "internalNote", "images", "featureIds"]) assert.equal(key in summary.items[0]!, false);
    const changed = await patch(row.id, { description: "Short", content: null, isFeatured: true });
    assert.equal(changed.vin, row.vin);
    assert.equal(changed.content, null);
    assert.equal(changed.createdAt, row.createdAt);
    assert.ok(Date.parse(changed.updatedAt) >= Date.parse(row.updatedAt));
  });

  await t.test("invalid input, missing identities and non-vehicle products do not write", async () => {
    const before = (await list()).total;
    for (const body of [{}, { title: " " }, { title: "x", publicationStatus: "published" }, { title: "x", price: 0 }, { title: "x", images: [{ fileId: file.id, sortOrder: 0 }, { fileId: file.id, sortOrder: 1 }] }]) {
      failure(await request("POST", "", body), 400, "DTI_BODY_VALIDATE_ERROR");
    }
    failure(await request("GET", "/bad-id"), 400, "DTI_PATH_PARAMS_VALIDATE_ERROR");
    failure(await request("GET", `/${randomUUID()}`), 404, "VEHICLE_NOT_FOUND");
    failure(await request("PATCH", `/${randomUUID()}`, { title: "Missing" }), 404, "VEHICLE_NOT_FOUND");
    failure(await request("POST", `/${randomUUID()}/archive`), 404, "VEHICLE_NOT_FOUND");
    failure(await request("GET", "?priceMin=2&priceMax=1"), 400, "DTI_QUERY_VALIDATE_ERROR");
    const partId = randomUUID();
    await orm.transaction(async (tx) => {
      await tx.insert(schema.products).values({ id: partId, productType: "part", title: "Other product" });
      await tx.insert(schema.parts).values({ productId: partId });
    });
    failure(await request("GET", `/${partId}`), 404, "VEHICLE_NOT_FOUND");
    failure(await request("PATCH", `/${partId}`, { title: "Do not change" }), 404, "VEHICLE_NOT_FOUND");
    assert.equal((await list()).total, before);
    await assert.rejects(di.resolve(VehicleService).create({ title: "bad", price: -1 }), { code: "VEHICLE_INVALID_INPUT" });
    await assert.rejects(di.resolve(VehicleService).create({ title: "bad", publicationStatus: "published" } as unknown as Vehicles.CreateBody), { code: "VEHICLE_INVALID_INPUT" });
  });

  await t.test("publish validates completeness; hide/archive/restore preserve first publication and sold state", async () => {
    const draft = await create({ title: "Incomplete" });
    failure(await request("POST", `/${draft.id}/publish`), 409, "VEHICLE_PUBLICATION_INVALID");
    assert.deepEqual(await get(draft.id), draft);
    const row = await create(valid());
    const published = await command(row.id, "publish");
    assert.equal(published.publicationStatus, "published");
    assert.ok(published.firstPublishedAt);
    failure(await request("POST", `/${row.id}/publish`), 409, "VEHICLE_INVALID_TRANSITION");
    failure(await request("PATCH", `/${row.id}`, { locationId: null }), 409, "VEHICLE_PUBLICATION_INVALID");
    failure(await request("PATCH", `/${row.id}`, { mainImageId: null }), 409, "VEHICLE_PUBLICATION_INVALID");
    assert.deepEqual(await get(row.id), published);
    const sold = await patch(row.id, { saleStatus: "sold" });
    assert.equal(sold.publicationStatus, "published");
    assert.equal((await command(row.id, "hide")).publicationStatus, "hidden");
    assert.equal((await command(row.id, "publish")).firstPublishedAt, published.firstPublishedAt);
    assert.equal((await command(row.id, "archive")).publicationStatus, "archived");
    failure(await request("POST", `/${row.id}/publish`), 409, "VEHICLE_INVALID_TRANSITION");
    const restored = await command(row.id, "restore");
    assert.equal(restored.publicationStatus, "hidden");
    assert.equal(restored.saleStatus, "sold");
    assert.equal(restored.firstPublishedAt, published.firstPublishedAt);
    assert.ok((await list("?publicationStatus=hidden&saleStatus=sold")).items.some((i) => i.id === row.id));
    assert.equal((await request("DELETE", `/${row.id}`)).status, 404);
  });

  await t.test("conditional EV/used/price/location requirements use merged stored state", async () => {
    const row = await create(valid({ fuelType: "electric", engineCapacityCc: null, transmission: null, condition: "new", mileageKm: null, arrivalStatus: "in_transit", locationId: null, priceDisplayMode: "inquire", price: null, currency: null }));
    await command(row.id, "publish");
    failure(await request("PATCH", `/${row.id}`, { engineCapacityCc: 1 }), 400, "VEHICLE_INVALID_INPUT");
    failure(await request("PATCH", `/${row.id}`, { condition: "used" }), 409, "VEHICLE_PUBLICATION_INVALID");
    failure(await request("PATCH", `/${row.id}`, { arrivalStatus: "in_stock" }), 409, "VEHICLE_PUBLICATION_INVALID");
    failure(await request("PATCH", `/${row.id}`, { price: 100 }), 409, "VEHICLE_PUBLICATION_INVALID");
    const changed = await patch(row.id, { price: 100, currency: "MNT", condition: "used", mileageKm: 0, arrivalStatus: "in_stock", locationId: ids.location });
    assert.equal(changed.priceDisplayMode, "inquire");
    assert.equal(changed.price, 100);
    failure(await request("PATCH", `/${row.id}`, { importYear: 2019 }), 400, "VEHICLE_INVALID_INPUT");
  });

  await t.test("parent changes clear retained descendants and reject explicitly mismatched references", async () => {
    const row = await create(valid());
    const changed = await patch(row.id, { brandId: ids.brand2 });
    assert.equal(changed.modelId, null);
    assert.equal(changed.variantId, null);
    failure(await request("PATCH", `/${row.id}`, { modelId: ids.model }), 400, "VEHICLE_REFERENCE_MISMATCH");
    const selected = await patch(row.id, { modelId: ids.model2, variantId: ids.variant2 });
    assert.equal(selected.brandId, ids.brand2);
    failure(await request("PATCH", `/${row.id}`, { exteriorColorId: randomUUID() }), 400, "VEHICLE_REFERENCE_NOT_FOUND");
    assert.deepEqual(await get(row.id), selected);
  });

  await t.test("inactive retained references can be edited and published, but new selections cannot", async () => {
    const row = await create(valid({ featureIds: [ids.feature] }));
    await orm.update(schema.vehicleBrands).set({ isActive: false }).where(eq(schema.vehicleBrands.id, ids.brand));
    await orm.update(schema.colors).set({ isActive: false }).where(eq(schema.colors.id, ids.color));
    await orm.update(schema.vehicleFeatures).set({ isActive: false }).where(eq(schema.vehicleFeatures.id, ids.feature));
    try {
      const edited = await patch(row.id, { title: "Retained inactive", featureIds: [ids.feature] });
      assert.equal(edited.exteriorColorId, ids.color);
      await command(row.id, "publish");
      failure(await request("POST", "", valid()), 409, "VEHICLE_REFERENCE_INACTIVE");
      const plain = await create({ title: "Plain" });
      failure(await request("PATCH", `/${plain.id}`, { featureIds: [ids.feature] }), 409, "VEHICLE_REFERENCE_INACTIVE");
      await patch(row.id, { featureIds: [] });
      failure(await request("PATCH", `/${row.id}`, { featureIds: [ids.feature] }), 409, "VEHICLE_REFERENCE_INACTIVE");
      const modelLess = await create({ title: "No model" });
      // A newly selected model may not use an inactive ancestor even if its own flag is active.
      failure(await request("PATCH", `/${modelLess.id}`, { brandId: ids.brand, modelId: ids.model }), 409, "VEHICLE_REFERENCE_INACTIVE");
    } finally {
      await orm.update(schema.vehicleBrands).set({ isActive: true }).where(eq(schema.vehicleBrands.id, ids.brand));
      await orm.update(schema.colors).set({ isActive: true }).where(eq(schema.colors.id, ids.color));
      await orm.update(schema.vehicleFeatures).set({ isActive: true }).where(eq(schema.vehicleFeatures.id, ids.feature));
    }
  });

  await t.test("gallery order and IDs persist; usage represents each consumer once across main/item/gallery", async () => {
    const image = await upload();
    const second = await upload();
    const foreignKey = randomUUID();
    await db.query("UPDATE files SET usage = ARRAY[$1::uuid] WHERE id=$2", [foreignKey, image.id]);
    const a = await create({ title: "Shared A", mainImageId: image.id, itemImageId: image.id, images: [{ fileId: image.id, sortOrder: 10 }, { fileId: second.id, sortOrder: 0 }], featureIds: [ids.feature, ids.feature2] });
    const b = await create({ title: "Shared B", mainImageId: image.id });
    assert.deepEqual(new Set(await usage(image.id)), new Set([foreignKey, a.id, b.id]));
    assert.equal((await usage(image.id)).length, 3);
    const galleryId = a.images.find((i) => i.fileId === image.id)!.id;
    const reordered = await patch(a.id, { images: [{ fileId: image.id, sortOrder: 0 }, { fileId: second.id, sortOrder: 1 }], featureIds: [ids.feature2] });
    assert.equal(reordered.images[0]!.id, galleryId);
    assert.deepEqual(reordered.featureIds, [ids.feature2]);
    await patch(a.id, { images: [], mainImageId: null, featureIds: [] });
    assert.ok((await usage(image.id)).includes(a.id));
    assert.deepEqual(await usage(second.id), []);
    await patch(a.id, { itemImageId: null });
    assert.deepEqual(new Set(await usage(image.id)), new Set([foreignKey, b.id]));
    const beforeArchive = await usage(image.id);
    await command(b.id, "archive");
    assert.deepEqual(await usage(image.id), beforeArchive);
    await patch(b.id, { mainImageId: null });
    assert.deepEqual(await usage(image.id), [foreignKey]);
    const stored = (await orm.select().from(schema.files).where(eq(schema.files.id, image.id)))[0]!;
    assert.equal(await readFile(path.join(folder, stored.filePath), "utf8"), "original file bytes");
  });

  await t.test("missing files and late DB rejection roll back products, links, usage and metadata", async () => {
    const before = (await list()).total;
    failure(await request("POST", "", { title: "Missing file", mainImageId: randomUUID() }), 400, "VEHICLE_FILE_NOT_FOUND");
    const missing = await upload();
    const stored = (await orm.select().from(schema.files).where(eq(schema.files.id, missing.id)))[0]!;
    const disk = path.resolve(folder, stored.filePath);
    assert.ok(disk.startsWith(path.resolve(folder) + path.sep));
    await rm(disk);
    failure(await request("POST", "", { title: "Missing disk", mainImageId: missing.id }), 409, "VEHICLE_FILE_UNAVAILABLE");
    const rejected = await upload();
    await db.exec("ALTER TABLE files ADD CONSTRAINT reject_vehicle_usage CHECK (cardinality(usage)=0) NOT VALID");
    try { failure(await request("POST", "", { title: "Late rejection", mainImageId: rejected.id, images: [{ fileId: rejected.id, sortOrder: 0 }], featureIds: [ids.feature] }), 400, "VEHICLE_INVALID_INPUT"); }
    finally { await db.exec("ALTER TABLE files DROP CONSTRAINT reject_vehicle_usage"); }
    assert.equal((await list()).total, before);
    assert.deepEqual(await usage(rejected.id), []);
    assert.equal((await orm.select().from(schema.productImages).where(eq(schema.productImages.fileId, rejected.id))).length, 0);
    const row = await create({ title: "Rollback update" });
    failure(await request("PATCH", `/${row.id}`, { title: "Must roll back", images: [{ fileId: rejected.id, sortOrder: 0 }], featureIds: [randomUUID()] }), 400, "VEHICLE_REFERENCE_NOT_FOUND");
    assert.deepEqual(await get(row.id), row);
    assert.deepEqual(await usage(rejected.id), []);
  });

  await t.test("admin search/filter/count/pagination and numeric null-last ordering are consistent", async () => {
    const a = await create(valid({ title: "Query sample A", price: 100, priceDisplayMode: "inquire", manufactureYear: 2020, mileageKm: 10, isFeatured: true }));
    const b = await create(valid({ title: "Query sample B", price: 200, manufactureYear: 2021, mileageKm: 20 }));
    const c = await create({ title: "Query sample C", price: null });
    await command(b.id, "archive");
    const filtered = await list(`?search=query%20sample&brandId=${ids.brand}&modelId=${ids.model}&priceMin=50&priceMax=150&isFeatured=true`);
    assert.deepEqual(filtered.items.map((i) => i.id), [a.id]);
    assert.equal(filtered.total, 1);
    assert.equal(filtered.items[0]!.price, 100);
    const first = await list("?search=Query%20sample&sort=price_desc&limit=1&offset=0");
    assert.equal(first.total, 3);
    assert.equal(first.items[0]!.id, b.id);
    assert.deepEqual((await list("?search=Query%20sample&sort=price_desc")).items.map((i) => i.id), [b.id, a.id, c.id]);
    assert.deepEqual((await list("?search=Query%20sample&sort=price_asc")).items.map((i) => i.id), [a.id, b.id, c.id]);
    assert.deepEqual((await list("?search=Query%20sample&sort=year_desc")).items.map((i) => i.id), [b.id, a.id, c.id]);
    assert.equal((await list("?search=Query%20sample&limit=1&offset=100")).total, 3);
    assert.equal((await list("?search=Query%20sample&limit=1&offset=100")).items.length, 0);
    assert.ok((await list("?search=Alpha%20maker")).items.some((i) => i.id === a.id));
    const literal = await create({ title: "Literal %_ marker" });
    assert.deepEqual((await list("?search=%25_")).items.map((i) => i.id), [literal.id]);
    assert.equal((await list(`?locationId=${ids.branch}`)).total, 0);
  });

  await t.test("concurrent requests preserve independent patches and shared file consumers", async () => {
    const image = await upload();
    const [a, b] = await Promise.all([create({ title: "Parallel A", mainImageId: image.id }), create({ title: "Parallel B", mainImageId: image.id })]);
    assert.deepEqual(new Set(await usage(image.id)), new Set([a.id, b.id]));
    await Promise.all([patch(a.id, { title: "New title" }), patch(a.id, { description: "New description" })]);
    const current = await get(a.id);
    assert.equal(current.title, "New title");
    assert.equal(current.description, "New description");
    await Promise.all([patch(a.id, { mainImageId: null }), patch(b.id, { mainImageId: null })]);
    assert.deepEqual(await usage(image.id), []);
  });

  await t.test("all scalar fields, UUID case and direct-service validation preserve the contract", async () => {
    const row = await create(valid({
      title: "All fields", description: "Short summary", content: "<p>Details</p>", itemTitle: "Card title", itemDesc: "Card summary",
      itemImageId: file.id.toUpperCase(), importYear: 2022, vin: "  duplicate VIN  ", interiorColorId: ids.color,
      seatCount: 7, conditionDescription: "Condition notes", financingAvailable: false, isFeatured: true, internalNote: "Private note",
    }));
    assert.equal(row.itemImageId, file.id);
    assert.equal(row.itemImage!.id, file.id);
    assert.equal(row.seatCount, 7);
    assert.equal(row.interiorColorId, ids.color);
    assert.equal(row.importYear, 2022);
    assert.equal(row.conditionDescription, "Condition notes");
    assert.equal(row.financingAvailable, false);
    assert.equal(row.internalNote, "Private note");
    assert.equal((await create({ title: "Duplicate VIN", vin: row.vin })).vin, row.vin);
    const service = di.resolve(VehicleService);
    for (const body of [
      { title: "Bad future", manufactureYear: new Date().getUTCFullYear() + 1 },
      { title: "Bad relation", modelId: ids.model },
      { title: "Repeated feature", featureIds: [ids.feature, ids.feature.toUpperCase()] },
      { title: "Repeated file", images: [{ fileId: file.id, sortOrder: 0 }, { fileId: file.id.toUpperCase(), sortOrder: 1 }] },
    ]) await assert.rejects(service.create(body));
    await assert.rejects(service.update(row.id, { title: undefined }), { code: "VEHICLE_INVALID_INPUT" });
    const updated = await service.update(row.id, { title: undefined, description: "Direct patch" });
    assert.equal(updated.title, row.title);
    assert.equal(updated.description, "Direct patch");
    failure(await request("POST", `/${row.id}/hide`), 409, "VEHICLE_INVALID_TRANSITION");
    await command(row.id, "archive");
    failure(await request("POST", `/${row.id}/archive`), 409, "VEHICLE_INVALID_TRANSITION");
  });

  await t.test("late update failure restores old links, scalar values and usage", async () => {
    const first = await upload();
    const second = await upload();
    const row = await create({ title: "Late update", mainImageId: first.id, images: [{ fileId: first.id, sortOrder: 0 }], featureIds: [ids.feature] });
    await db.exec("ALTER TABLE files ADD CONSTRAINT reject_update_usage CHECK (cardinality(usage)=0) NOT VALID");
    try {
      failure(await request("PATCH", `/${row.id}`, { title: "Not saved", mainImageId: second.id, images: [{ fileId: second.id, sortOrder: 0 }], featureIds: [ids.feature2] }), 400, "VEHICLE_INVALID_INPUT");
    } finally { await db.exec("ALTER TABLE files DROP CONSTRAINT reject_update_usage"); }
    assert.deepEqual(await get(row.id), row);
    assert.deepEqual(await usage(first.id), [row.id]);
    assert.deepEqual(await usage(second.id), []);
    const stored = (await orm.select().from(schema.files).where(eq(schema.files.id, first.id)))[0]!;
    const disk = path.resolve(folder, stored.filePath);
    assert.ok(disk.startsWith(path.resolve(folder) + path.sep));
    await rm(disk);
    // Missing physical storage must not prevent taking a record out of circulation.
    assert.equal((await command(row.id, "archive")).publicationStatus, "archived");
  });

  await t.test("unexpected service failures return safe error envelopes", async (context) => {
    const mocked = context.mock.method(VehicleService.prototype, "list", async () => { throw new Error(`private: ${folder}`); });
    try { failure(await request("GET"), 500, "UNKNOWN_ERROR"); }
    finally { mocked.mock.restore(); }
    await db.close();
    failure(await request("GET"), 500, "VEHICLE_STORAGE_ERROR");
  });
});
