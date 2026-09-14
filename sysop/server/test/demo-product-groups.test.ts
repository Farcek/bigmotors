import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { HomeProductGroups } from "@bigmotors/sysop-dti";
import { demoVehicles, demoVehicleBody } from "../src/dev/vehicle-data.js";
import { demoGroupMarker, planDemoProductGroups, indexDemoProductGroups, importDemoProductGroups } from "../src/dev/product-group-data.js";

const refs = { brandId: randomUUID(), modelId: randomUUID(), bodyTypeId: randomUUID(), exteriorColorId: randomUUID() };
const vehicles = demoVehicles.map((car) => ({ car, body: demoVehicleBody(car, refs) }));
const plans = planDemoProductGroups(vehicles);
const images = new Map<number, string>(demoVehicles.map((car) => [car.key, randomUUID()]));
function entity(body: HomeProductGroups.CreateBody): HomeProductGroups.Entity {
  return HomeProductGroups.entity.parse({ ...body, id: randomUUID(), imageId: body.imageId ?? null,
    description: body.description ?? null, sortOrder: body.sortOrder ?? 0, isActive: body.isActive ?? true,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
}

test("ten demo groups share the search contract with eight active, two inactive and stable markers", () => {
  assert.equal(plans.length, 10);
  assert.equal(plans.filter((item) => item.body.isActive).length, 8);
  assert.equal(plans.filter((item) => !item.body.isActive).length, 2);
  assert.equal(new Set(plans.map((item) => demoGroupMarker(item.key))).size, 10);
  assert.deepEqual(plans.map((item) => item.body.sortOrder), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  for (const item of plans) {
    HomeProductGroups.createBody.parse(item.body);
    assert.ok(item.body.description?.startsWith(demoGroupMarker(item.key) + "\n"));
    assert.ok(images.has(item.vehicleKey));
    assert.ok(Object.values(item.body.filters).every((value) => typeof value === "string"));
  }
  assert.deepEqual(plans[2]!.body.filters, { brand: refs.brandId, model: refs.modelId });
  assert.deepEqual(plans[3]!.body.filters, { category: refs.bodyTypeId });
  assert.deepEqual(plans[7]!.body.filters, { engine_max: "2000" });
});

test("create groups once, reuse vehicle images and preserve user edits on rerun", async () => {
  const existing = indexDemoProductGroups([]);
  const summary = { created: 0, skipped: 0 };
  await importDemoProductGroups({ planned: plans, existing, imageIds: images, summary, create: async (body) => entity(body) });
  assert.deepEqual(summary, { created: 10, skipped: 0 });
  for (const item of plans) assert.equal(existing.get(demoGroupMarker(item.key))?.imageId, images.get(item.vehicleKey));
  const first = existing.get(demoGroupMarker(1))!;
  first.title = "User edited title"; first.isActive = false; first.imageId = null;
  const before = structuredClone([...existing.values()]);
  const next = { created: 0, skipped: 0 };
  await importDemoProductGroups({ planned: plans, existing: indexDemoProductGroups(before), imageIds: new Map(), summary: next,
    create: async () => { assert.fail("Existing groups must not be rewritten"); } });
  assert.deepEqual(next, { created: 0, skipped: 10 });
  assert.deepEqual([...existing.values()], before);
});

test("duplicate owned markers fail preflight; same titles without markers are unrelated", () => {
  const row = entity(plans[0]!.body);
  assert.throws(() => indexDemoProductGroups([row, { ...row, id: randomUUID() }]), /Duplicate demo group marker/);
  assert.equal(indexDemoProductGroups([{ ...row, description: null }]).size, 0);
  assert.throws(() => planDemoProductGroups([]), /Missing demo vehicle/);
  assert.throws(() => planDemoProductGroups(vehicles.map((item) => ({ ...item, body: { ...item.body, brandId: null } }))), /Missing brand/);
});

test("all missing group images are checked before any writes", async () => {
  const incomplete = new Map(images); incomplete.delete(plans[9]!.vehicleKey);
  let writes = 0;
  await assert.rejects(importDemoProductGroups({ planned: plans, existing: new Map(), imageIds: incomplete,
    summary: { created: 0, skipped: 0 }, create: async (body) => { writes++; return entity(body); } }), /Missing demo image/);
  assert.equal(writes, 0);
});

test("interrupted import resumes only missing groups, including an uncertain successful create", async () => {
  const persisted: HomeProductGroups.Entity[] = [];
  const summary = { created: 0, skipped: 0 };
  await assert.rejects(importDemoProductGroups({ planned: plans, existing: new Map(), imageIds: images, summary,
    create: async (body) => {
      const row = entity(body); persisted.push(row);
      if (persisted.length === 4) throw new Error("Response lost after commit");
      return row;
    } }), /Response lost/);
  assert.deepEqual(summary, { created: 3, skipped: 0 });
  const next = { created: 0, skipped: 0 };
  await importDemoProductGroups({ planned: plans, existing: indexDemoProductGroups(persisted), imageIds: images, summary: next,
    create: async (body) => { const row = entity(body); persisted.push(row); return row; } });
  assert.deepEqual(next, { created: 6, skipped: 4 });
  assert.equal(persisted.length, 10);
});
