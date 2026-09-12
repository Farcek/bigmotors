import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { migrationConfig } from "../src/migrations.js";
import { resetDatabaseSql } from "../src/reset-sql.js";

test("reset CLI requires DBConfig DATABASE_URL, not migration credentials", () => {
  const result = spawnSync(process.execPath, ["--import=tsx", "src/reset.ts"], {
    cwd: fileURLToPath(new URL("../", import.meta.url)),
    env: { ...process.env, DATABASE_URL: "", DB_CONNECTION_STRING: "postgres://secret@unused.invalid/db" },
    encoding: "utf8", timeout: 10_000,
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /DATABASE_URL is not defined/);
  assert.doesNotMatch(result.stderr, /secret|unused/);
});

test("reset drops populated catalog, file usage, triggers and migration history; migrations can run again", async () => {
  const db = new PGlite();
  try {
    await migrate(drizzle(db), migrationConfig);
    await db.exec(`
      INSERT INTO colors (name) VALUES ('Reset test');
      INSERT INTO files (file_path, original_name, usage)
      VALUES ('uploads/test', 'test.png', ARRAY['00000000-0000-4000-8000-000000000001'::uuid]);
      BEGIN;
      INSERT INTO products (id, product_type, title)
      VALUES ('00000000-0000-4000-8000-000000000001', 'vehicle', 'Reset test vehicle');
      INSERT INTO vehicles (product_id) VALUES ('00000000-0000-4000-8000-000000000001');
      COMMIT;
    `);
    await db.exec(resetDatabaseSql);
    assert.deepEqual((await db.query("SELECT tablename FROM pg_tables WHERE schemaname IN ('public', 'drizzle')")).rows, []);
    assert.deepEqual((await db.query("SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public'")).rows, []);
    await migrate(drizzle(db), migrationConfig);
    assert.deepEqual((await db.query("SELECT * FROM colors")).rows, []);
    assert.deepEqual((await db.query("SELECT * FROM products")).rows, []);
    assert.deepEqual((await db.query("SELECT * FROM files")).rows, []);
    assert.equal((await db.query("SELECT * FROM drizzle.__drizzle_migrations")).rows.length, readMigrationFiles(migrationConfig).length);
  } finally { await db.close(); }
});

test("reset is repeatable on an empty database", async () => {
  const db = new PGlite();
  try {
    await db.exec(resetDatabaseSql);
    await db.exec(resetDatabaseSql);
    assert.deepEqual((await db.query("SELECT nspname FROM pg_namespace WHERE nspname = 'public'")).rows, [{ nspname: "public" }]);
  } finally { await db.close(); }
});
