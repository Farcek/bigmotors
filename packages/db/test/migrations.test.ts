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
  assert.equal(migrations.length, 5);
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

test("restoring hooks preserves existing data and fixes first publication after regenerated baseline", async () => {
  const folder = await mkdtemp(join(tmpdir(), "bigmotors-hooks-upgrade-"));
  const db = new PGlite();
  try {
    await mkdir(join(folder, "meta"));
    const journal = JSON.parse(await readFile(new URL("../migrations/meta/_journal.json", import.meta.url), "utf8"));
    await writeFile(join(folder, "meta/_journal.json"), JSON.stringify({ ...journal, entries: journal.entries.slice(0, 1) }));
    await writeFile(join(folder, "0000_init.sql"), await readFile(new URL("../migrations/0000_init.sql", import.meta.url)));
    const orm = drizzle(db);
    await migrate(orm, { ...migrationConfig, migrationsFolder: folder });
    const { rows: [brand] } = await db.query<{ id: string }>("INSERT INTO vehicle_brands (name) VALUES ('Test brand') RETURNING id");
    const { rows: [model] } = await db.query<{ id: string }>("INSERT INTO vehicle_models (name,brand_id) VALUES ('Test model',$1) RETURNING id", [brand!.id]);
    const { rows: [body] } = await db.query<{ id: string }>("INSERT INTO vehicle_body_types (name) VALUES ('Test body') RETURNING id");
    const { rows: [color] } = await db.query<{ id: string }>("INSERT INTO colors (name,hex_code) VALUES ('Existing color','#aBc123') RETURNING id");
    const { rows: [location] } = await db.query<{ id: string }>("INSERT INTO locations (name) VALUES ('Test location') RETURNING id");
    const { rows: [file] } = await db.query<{ id: string }>("INSERT INTO files (file_path,original_name,title) VALUES ('uploads/test.jpg','test.jpg','Keep title') RETURNING id");
    const { rows: [product] } = await db.query<{ id: string }>("INSERT INTO products (product_type,title,main_image_id,price_display_mode,price,currency) VALUES ('vehicle','Existing vehicle',$1,'inquire',20000000,'MNT') RETURNING id", [file!.id]);
    await db.query(`INSERT INTO vehicles
      (product_id,brand_id,model_id,manufacture_year,body_type_id,fuel_type,engine_capacity_cc,transmission,
       drivetrain,steering_position,exterior_color_id,condition,sale_status,arrival_status,mileage_km,location_id)
      VALUES ($1,$2,$3,2010,$4,'gasoline',2000,'automatic','rwd','left',$5,'used','available','in_stock',100000,$6)`,
      [product!.id,brand!.id,model!.id,body!.id,color!.id,location!.id]);
    await db.query("INSERT INTO product_images (product_id,file_id,sort_order) VALUES ($1,$2,7)", [product!.id,file!.id]);
    await db.query("UPDATE files SET usage=ARRAY[$1::uuid] WHERE id=$2", [product!.id,file!.id]);
    await assert.rejects(db.query("UPDATE products SET publication_status='published' WHERE id=$1", [product!.id]),
      (error: unknown) => typeof error === "object" && error !== null && "constraint" in error && error.constraint === "products_published_required");
    const snapshots = new Map<string, unknown>();
    for (const table of ["products", "vehicles", "files", "product_images", "colors"]) {
      snapshots.set(table, (await db.query(`SELECT * FROM ${table} ORDER BY 1`)).rows);
    }
    await migrate(orm, migrationConfig);
    for (const [table, rows] of snapshots) assert.deepEqual((await db.query(`SELECT * FROM ${table} ORDER BY 1`)).rows, rows);
    const { rows: [published] } = await db.query<{ first_published_at: Date }>(
      "UPDATE products SET publication_status='published' WHERE id=$1 RETURNING first_published_at", [product!.id]);
    assert.ok(published!.first_published_at);
    await db.query("UPDATE products SET publication_status='hidden' WHERE id=$1", [product!.id]);
    await db.query("UPDATE products SET publication_status='published' WHERE id=$1", [product!.id]);
    const current = await db.query("SELECT first_published_at FROM products WHERE id=$1", [product!.id]);
    assert.deepEqual(current.rows, [published]);
    await migrate(orm, migrationConfig);
    assert.equal((await db.query("SELECT * FROM drizzle.__drizzle_migrations")).rows.length, readMigrationFiles(migrationConfig).length);
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
