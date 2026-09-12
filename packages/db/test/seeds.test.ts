import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { TKN_DB } from "../src/db.js";
import { allReferenceSeeds, companySeeds, seedId, seedTables, type ReferenceSeed } from "../src/seeds/data.js";
import { seedReferences } from "../src/seeds/run.js";
import { testDatabase } from "./support/database.js";
import { testServiceContainer } from "./support/di.js";

test("seed manifest covers all public reference groups without invented company data", () => {
  assert.equal(new Set(allReferenceSeeds.map((row) => row.key)).size, allReferenceSeeds.length);
  const names = new Set<string>();
  for (const row of allReferenceSeeds) {
    const key = JSON.stringify([row.table, row.parentKey ?? null, row.name.trim().toLowerCase()]);
    assert.ok(!names.has(key), key);
    names.add(key);
    assert.match(seedId(row.key), /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-8[\da-f]{3}-[\da-f]{12}$/);
  }
  assert.deepEqual(companySeeds, []);
  for (const table of seedTables.filter((name) => name !== "branches" && name !== "locations")) {
    assert.ok(allReferenceSeeds.some((row) => row.table === table), table);
  }
});

test("all seeds apply once, preserve edits and unrelated rows, and leave products empty", async () => {
  const db = await testDatabase();
  const container = testServiceContainer(db);
  try {
    const orm = container.resolve(TKN_DB);
    const first = await seedReferences(orm);
    assert.equal(Object.values(first).reduce((n, row) => n + row.inserted, 0), allReferenceSeeds.length);
    assert.equal(Object.values(first).reduce((n, row) => n + row.skipped, 0), 0);
    await db.query("UPDATE colors SET name='Edited color', hex_code='#123456',description='Keep me',sort_order=42,is_active=false WHERE id=$1", [seedId(1)]);
    await db.query("UPDATE vehicle_brands SET name='Edited Toyota' WHERE id=$1", [seedId(1001)]);
    await db.query("INSERT INTO colors (name) VALUES ('Unrelated color')");
    const snapshots = new Map<string, unknown>();
    for (const table of seedTables) snapshots.set(table, (await db.query(`SELECT * FROM ${table} ORDER BY id`)).rows);
    const second = await seedReferences(orm);
    assert.equal(Object.values(second).reduce((n, row) => n + row.inserted, 0), 0);
    for (const table of seedTables) assert.deepEqual((await db.query(`SELECT * FROM ${table} ORDER BY id`)).rows, snapshots.get(table), table);
    for (const table of ["products", "files", "branches", "locations", "vehicle_feature_links"]) {
      assert.deepEqual((await db.query(`SELECT * FROM ${table}`)).rows, []);
    }
    const variant = await db.query("SELECT m.brand_id,v.model_id FROM vehicle_variants v JOIN vehicle_models m ON m.id=v.model_id WHERE v.id=$1", [seedId(3001)]);
    assert.deepEqual(variant.rows, [{ brand_id: seedId(1001), model_id: seedId(1101) }]);
  } finally {
    container.destroy();
    await db.close();
  }
});

test("seed reuses existing normalized names and parent IDs and skips inactive ancestor subtrees", async () => {
  const db = await testDatabase();
  const container = testServiceContainer(db);
  try {
    const orm = container.resolve(TKN_DB);
    const brand = (await db.query<{ id: string }>("INSERT INTO vehicle_brands (name) VALUES ('  tOyOtA  ') RETURNING id")).rows[0]!;
    const rows: ReferenceSeed[] = [
      { key: 1001, table: "vehicle_brands", name: "Toyota" },
      { key: 1101, table: "vehicle_models", name: "Land Cruiser 250", parentKey: 1001 },
      { key: 3001, table: "vehicle_variants", name: "GX", parentKey: 1101 },
      { key: 4001, table: "part_categories", name: "Root" },
      { key: 4101, table: "part_categories", name: "Child", parentKey: 4001 },
      { key: 4102, table: "part_categories", name: "Grandchild", parentKey: 4101 },
      { key: 8001, table: "branches", name: "Test company branch" },
      { key: 9001, table: "locations", name: "Test storage location" },
    ];
    const first = await seedReferences(orm, rows);
    assert.equal(first.vehicle_brands.existing, 1);
    assert.equal(first.branches.inserted, 1);
    assert.equal(first.locations.inserted, 1);
    assert.deepEqual((await db.query("SELECT brand_id FROM vehicle_models")).rows, [{ brand_id: brand.id }]);
    await db.query("UPDATE vehicle_brands SET is_active=false WHERE id=$1", [brand.id]);
    await db.query("UPDATE part_categories SET is_active=false WHERE id=$1", [seedId(4001)]);
    const second = await seedReferences(orm, [...rows,
      { key: 1102, table: "vehicle_models", name: "New model", parentKey: 1001 },
      { key: 4103, table: "part_categories", name: "New category", parentKey: 4102 },
    ]);
    assert.equal(second.vehicle_models.skipped, 2);
    assert.equal(second.vehicle_variants.skipped, 1);
    assert.equal(second.part_categories.skipped, 3);
    assert.deepEqual((await db.query("SELECT id FROM vehicle_models ORDER BY id")).rows, [{ id: seedId(1101) }]);
  } finally {
    container.destroy();
    await db.close();
  }
});

test("same child name is allowed under separate parents and stable IDs with changed parent fail atomically", async () => {
  const db = await testDatabase();
  const container = testServiceContainer(db);
  try {
    const orm = container.resolve(TKN_DB);
    const rows: ReferenceSeed[] = [
      { key: 4001, table: "part_categories", name: "Root A" },
      { key: 4002, table: "part_categories", name: "Root B" },
      { key: 4101, table: "part_categories", name: "Same name", parentKey: 4001 },
      { key: 4102, table: "part_categories", name: "Same name", parentKey: 4002 },
    ];
    await seedReferences(orm, rows);
    assert.equal((await db.query("SELECT * FROM part_categories")).rows.length, 4);
    await assert.rejects(seedReferences(orm, [
      { key: 1, table: "colors", name: "Must roll back" },
      ...rows.map((row) => row.key === 4101 ? { ...row, parentKey: 4002 } : row),
    ]), /Invalid reference seed/);
    assert.deepEqual((await db.query("SELECT * FROM colors")).rows, []);
    await assert.rejects(seedReferences(orm, [rows[2]!]), /Invalid reference seed/);
  } finally {
    container.destroy();
    await db.close();
  }
});

test("seed CLI requires DBConfig DATABASE_URL and never falls back to legacy credentials", () => {
  const result = spawnSync(process.execPath, ["--import=tsx", "src/seed.ts"], {
    cwd: fileURLToPath(new URL("../", import.meta.url)),
    env: { ...process.env, DATABASE_URL: "", DB_CONNECTION_STRING: "postgres://secret@unused.invalid/db" },
    encoding: "utf8", timeout: 10_000,
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /DATABASE_URL is not defined/);
  assert.ok(!result.stderr.includes("secret"));
});
