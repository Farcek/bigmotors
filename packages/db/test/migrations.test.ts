import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { PgDialect } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { migrationConfig } from "../src/migrations.js";
import { schemaHooks } from "../src/schema-hooks.js";
import { testDatabase } from "./support/database.js";

test("standalone CLI uses DBConfig validation before connecting", () => {
  const result = spawnSync(process.execPath, ["--import=tsx", "src/migrate.ts"], {
    cwd: fileURLToPath(new URL("../", import.meta.url)),
    env: { ...process.env, DATABASE_URL: "postgres://secret@unused.invalid/db", DATABASE_POOL_MIN: "invalid", DB_CONNECTION_STRING: "" },
    encoding: "utf8",
    timeout: 10_000,
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /DATABASE_POOL_MIN must be a non-negative safe integer/);
  assert.ok(!result.stderr.includes("secret"));
});

test("standalone CLI refuses missing credentials before connecting", () => {
  const result = spawnSync(process.execPath, ["--import=tsx", "src/migrate.ts"], {
    cwd: fileURLToPath(new URL("../", import.meta.url)),
    env: { ...process.env, DATABASE_URL: "", DB_CONNECTION_STRING: "postgres://secret@unused.invalid/db", MIGRATION_DATABASE_URL: "postgres://secret@unused.invalid/db" },
    encoding: "utf8",
    timeout: 10_000,
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /DATABASE_URL is not defined in the environment/);
  assert.ok(!result.stderr.includes("secret"));
});

test("migration history contains every current trigger definition", () => {
  const migrations = readMigrationFiles(migrationConfig);
  const definitions = migrations.flatMap((migration) => migration.sql).join("\n").replaceAll("CREATE OR REPLACE FUNCTION", "CREATE FUNCTION");
  for (const hook of schemaHooks) assert.ok(definitions.includes(new PgDialect().sqlToQuery(hook).sql));
  assert.equal(migrations.length, 4);
});

test("migrating twice does not reapply SQL or duplicate the migration history", async () => {
  const db = await testDatabase();
  try {
    await db.query("INSERT INTO branches (name) VALUES ('Migration test branch')");
    await migrate(drizzle(db), migrationConfig);
    const history = await db.query("SELECT * FROM drizzle.__drizzle_migrations");
    assert.equal(history.rows.length, readMigrationFiles(migrationConfig).length);
    const rows = await db.query("SELECT * FROM branches WHERE name='Migration test branch'");
    assert.equal(rows.rows.length, 1);
  } finally {
    await db.close();
  }
});

test("additive migrations preserve existing colors, branches and product links without guessing locations", async () => {
  const folder = await mkdtemp(join(tmpdir(), "bigmotors-color-upgrade-"));
  const db = new PGlite();
  try {
    await mkdir(join(folder, "meta"));
    const journal = JSON.parse(await readFile(new URL("../migrations/meta/_journal.json", import.meta.url), "utf8"));
    await writeFile(join(folder, "meta/_journal.json"), JSON.stringify({ ...journal, entries: journal.entries.slice(0, 1) }));
    await writeFile(join(folder, "0000_initial_catalog.sql"), await readFile(new URL("../migrations/0000_initial_catalog.sql", import.meta.url)));
    const orm = drizzle(db);
    await migrate(orm, { ...migrationConfig, migrationsFolder: folder });
    const { rows: [color] } = await db.query<{ id: string }>("INSERT INTO colors (name) VALUES ('Existing color') RETURNING id");
    const { rows: [branch] } = await db.query<{ id: string }>("INSERT INTO branches (name) VALUES ('Existing company branch') RETURNING id");
    await db.exec("BEGIN");
    const { rows: [product] } = await db.query<{ id: string }>("INSERT INTO products (product_type,title) VALUES ('vehicle','Existing vehicle') RETURNING id");
    await db.query("INSERT INTO vehicles (product_id, exterior_color_id, interior_color_id, branch_id) VALUES ($1, $2, $2, $3)", [product!.id, color!.id, branch!.id]);
    for (const [type, table] of [["part", "parts"], ["tire", "tires"]] as const) {
      const { rows: [item] } = await db.query<{ id: string }>("INSERT INTO products (product_type,title) VALUES ($1,'Existing product') RETURNING id", [type]);
      await db.query(`INSERT INTO ${table} (product_id, branch_id) VALUES ($1, $2)`, [item!.id, branch!.id]);
    }
    await db.exec("COMMIT");
    const { rows: [image] } = await db.query<{ id: string }>(`INSERT INTO product_images
      (product_id,file_path,original_name,title,description,sort_order,created_at,updated_at)
      VALUES ($1,'products/existing.unknown','original.unknown','Existing title','Existing description',7,'2025-01-02Z','2025-02-03Z') RETURNING id`, [product!.id]);
    const { rows: [gallery] } = await db.query<{ id: string }>(`INSERT INTO product_images
      (product_id,file_path,original_name,sort_order) VALUES ($1,'products/gallery.bin','gallery.bin',2) RETURNING id`, [product!.id]);
    await db.query("UPDATE products SET main_image_id=$2,item_image_id=$2 WHERE id=$1", [product!.id, image!.id]);
    const beforeProduct = await db.query("SELECT main_image_id,item_image_id,updated_at FROM products WHERE id=$1", [product!.id]);
    const beforeFiles = await db.query("SELECT id,file_path,original_name,title,description,created_at,updated_at,ARRAY[product_id] AS usage FROM product_images ORDER BY id");
    await migrate(orm, migrationConfig);
    assert.deepEqual((await db.query("SELECT * FROM files ORDER BY id")).rows, beforeFiles.rows);
    assert.deepEqual((await db.query("SELECT main_image_id,item_image_id,updated_at FROM products WHERE id=$1", [product!.id])).rows, beforeProduct.rows);
    assert.deepEqual((await db.query("SELECT id,product_id,file_id,sort_order FROM product_images ORDER BY sort_order")).rows, [
      { id: gallery!.id, product_id: product!.id, file_id: gallery!.id, sort_order: 2 },
      { id: image!.id, product_id: product!.id, file_id: image!.id, sort_order: 7 },
    ]);
    // Removed timestamp columns must not leave a broken gallery update trigger.
    await db.query("UPDATE product_images SET sort_order=8 WHERE id=$1", [image!.id]);
    await db.query("UPDATE files SET title='Updated after migration' WHERE id=$1", [image!.id]);
    const result = await db.query("SELECT c.name, c.hex_code, v.exterior_color_id, v.interior_color_id FROM colors c JOIN vehicles v ON v.exterior_color_id=c.id");
    assert.deepEqual(result.rows, [{ name: "Existing color", hex_code: null, exterior_color_id: color!.id, interior_color_id: color!.id }]);
    for (const table of ["vehicles", "parts", "tires"]) {
      const rows = await db.query(`SELECT branch_id,location_id FROM ${table}`);
      assert.deepEqual(rows.rows, [{ branch_id: branch!.id, location_id: null }]);
    }
    assert.equal((await db.query("SELECT * FROM locations")).rows.length, 0);
    await db.query("UPDATE colors SET hex_code='#aBc123' WHERE id=$1", [color!.id]);
    await migrate(orm, migrationConfig);
    const history = await db.query("SELECT * FROM drizzle.__drizzle_migrations");
    assert.equal(history.rows.length, readMigrationFiles(migrationConfig).length);
    assert.equal((await db.query<{ hex_code: string }>("SELECT hex_code FROM colors")).rows[0]?.hex_code, "#aBc123");
  } finally {
    await db.close();
    await rm(folder, { recursive: true, force: true });
  }
});

test("failed SQL rolls back DDL and does not mark the migration applied", async () => {
  const folder = await mkdtemp(join(tmpdir(), "bigmotors-migration-test-"));
  const db = new PGlite();
  try {
    await mkdir(join(folder, "meta"));
    await writeFile(join(folder, "meta/_journal.json"), JSON.stringify({
      version: "7", dialect: "postgresql",
      entries: [{ idx: 0, version: "7", when: 1, tag: "0000_failure", breakpoints: true }],
    }));
    await writeFile(join(folder, "0000_failure.sql"), "CREATE TABLE rollback_probe (id int);\n--> statement-breakpoint\nSELECT missing_migration_function();");
    await assert.rejects(migrate(drizzle(db), { ...migrationConfig, migrationsFolder: folder }));
    const tables = await db.query("SELECT * FROM pg_tables WHERE schemaname='public' AND tablename='rollback_probe'");
    assert.equal(tables.rows.length, 0);
    const history = await db.query("SELECT * FROM drizzle.__drizzle_migrations");
    assert.equal(history.rows.length, 0);
  } finally {
    await db.close();
    await rm(folder, { recursive: true, force: true });
  }
});
