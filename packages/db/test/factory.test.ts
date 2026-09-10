import assert from "node:assert/strict";
import { test } from "node:test";
import { Container, DIResolveError } from "@napp/di";
import { TKN_ENV } from "@bigmotors/core";
import { createDb, createPgPool, TKN_DB, TKN_PG_POOL } from "../src/db.js";
import { DBConfig } from "../src/config.js";
import { diDBCoreProviders, diDBServiceProviders } from "../src/di.js";
import { ColorService } from "../src/service/color.js";
import { BranchService } from "../src/service/branch.js";

test("DB factory wraps the caller-owned pool without connecting or reading app configuration", async () => {
  const pool = createPgPool({
    DATABASE_URL: "postgresql://example:example@localhost:1/example",
    DATABASE_POOL_MIN: 0,
    DATABASE_POOL_MAX: 10
  });
  try {
    const db = createDb(pool);
    assert.equal(db.$client, pool);
    assert.equal(pool.totalCount, 0);
    assert.ok(db.query.products);
    assert.ok(db.query.adminProfiles);
  } finally {
    await pool.end();
  }
});

test("DB modules resolve config, pool, schema and services without connecting", async () => {
  const container = new Container("db-modules-test");
  container.asValue(TKN_ENV, {
    DATABASE_URL: "postgresql://example:example@localhost:1/example",
    DATABASE_POOL_MIN: "2",
    DATABASE_POOL_MAX: "5",
  }).registryModule(diDBCoreProviders(), diDBServiceProviders());

  const pools = new Set<ReturnType<typeof createPgPool>>();
  try {
    const pool = container.resolve(TKN_PG_POOL);
    pools.add(pool);
    const db = container.resolve(TKN_DB);
    pools.add(db.$client);
    const repeatedPool = container.resolve(TKN_PG_POOL);
    pools.add(repeatedPool);
    const config = container.resolve(DBConfig);
    assert.equal(pool.options.connectionString, config.DATABASE_URL);
    assert.equal(pool.options.min, 2);
    assert.equal(pool.options.max, 5);
    assert.equal(db.$client, pool);
    assert.equal(repeatedPool, pool);
    assert.equal(container.resolve(TKN_DB), db);
    assert.ok(db.query.products);
    assert.ok(db.query.adminProfiles);
    const colors = container.resolve(ColorService);
    const branches = container.resolve(BranchService);
    assert.ok(colors instanceof ColorService);
    assert.ok(branches instanceof BranchService);
    assert.equal(container.resolve(ColorService), colors);
    assert.equal(container.resolve(BranchService), branches);
    assert.equal(pool.totalCount, 0);
  } finally {
    try { container.destroy(); } finally {
      for (const pool of pools) await pool.end();
    }
  }
});

test("DB service providers require an explicitly registered database", () => {
  const container = new Container("missing-db-test");
  try {
    container.registryModule(diDBServiceProviders());
    for (const service of [ColorService, BranchService]) {
      assert.throws(() => container.resolve<ColorService | BranchService>(service), DIResolveError);
    }
  } finally {
    container.destroy();
  }
});
