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
import { migrationConfig, migrationConnectionString } from "../src/migrations.js";
import { schemaHooks } from "../src/schema-hooks.js";
import { testDatabase } from "./support/database.js";

test("migration credentials must be explicit and validation errors do not expose secrets", () => {
  assert.throws(() => migrationConnectionString({ DATABASE_URL: "postgres://do-not-use/other" }), /is required/);
  assert.throws(() => migrationConnectionString({ MIGRATION_DATABASE_URL: " " }), /is required/);
  for (const value of ["secret-invalid-url", "https://example.test/db", "postgres://localhost/"]) {
    assert.throws(() => migrationConnectionString({ MIGRATION_DATABASE_URL: value }), (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.ok(!error.message.includes(value));
      return true;
    });
  }
  const url = "postgresql://migration:example@localhost:5432/bigmotors";
  assert.equal(migrationConnectionString({ MIGRATION_DATABASE_URL: url }), url);
});

test("standalone CLI refuses missing credentials before connecting", () => {
  const result = spawnSync(process.execPath, ["--import=tsx", "src/migrate.ts"], {
    cwd: fileURLToPath(new URL("../", import.meta.url)),
    env: { ...process.env, MIGRATION_DATABASE_URL: "", DATABASE_URL: "postgres://secret/unused" },
    encoding: "utf8",
    timeout: 10_000,
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /MIGRATION_DATABASE_URL is required/);
  assert.ok(!result.stderr.includes("secret"));
});

test("initial migration freezes every required trigger definition", async () => {
  const initial = await readFile(new URL("../migrations/0000_initial_catalog.sql", import.meta.url), "utf8");
  for (const hook of schemaHooks) assert.ok(initial.includes(new PgDialect().sqlToQuery(hook).sql));
  assert.equal(readMigrationFiles(migrationConfig).length, 1);
});

test("migrating twice does not reapply SQL or duplicate the migration history", async () => {
  const db = await testDatabase();
  try {
    await db.query("INSERT INTO branches (name) VALUES ('Migration test branch')");
    await migrate(drizzle(db), migrationConfig);
    const history = await db.query("SELECT * FROM drizzle.__drizzle_migrations");
    assert.equal(history.rows.length, 1);
    const rows = await db.query("SELECT * FROM branches WHERE name='Migration test branch'");
    assert.equal(rows.rows.length, 1);
  } finally {
    await db.close();
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
