import assert from "node:assert/strict";
import { test } from "node:test";
import { TKN_ENV } from "@bigmotors/core";
import { BranchService, ColorService, DBConfig, TKN_DB, TKN_PG_POOL, type BigMotorsDb } from "@bigmotors/db";
import { DIProviderError } from "@napp/di";
import { ConfigSysop } from "../src/config.js";
import { createContainer } from "../src/di.js";

test("server container wires environment, config and DB modules without connecting", async () => {
  const env = {
    HOST: "127.0.0.1", PORT: "4100",
    DATABASE_URL: "postgresql://example:example@localhost:1/example",
    DATABASE_POOL_MIN: "0", DATABASE_POOL_MAX: "3",
  };
  const di = createContainer({ env });
  let pool: BigMotorsDb["$client"] | undefined;
  try {
    assert.equal(di.resolve(TKN_ENV), env);
    assert.equal(di.resolve(ConfigSysop).PORT, 4100);
    assert.equal(di.resolve(DBConfig).DATABASE_URL, env.DATABASE_URL);
    pool = di.resolve(TKN_PG_POOL);
    assert.equal(di.resolve(TKN_DB).$client, pool);
    assert.equal(pool.options.max, 3);
    assert.ok(di.resolve(ColorService) instanceof ColorService);
    assert.ok(di.resolve(BranchService) instanceof BranchService);
    assert.equal(di.resolve(ColorService), di.resolve(ColorService));
    assert.equal(pool.totalCount, 0);
  } finally {
    try { di.destroy(); } finally { await pool?.end(); }
  }
});

test("server configuration does not eagerly require database credentials", () => {
  const di = createContainer({ env: {} });
  try {
    assert.equal(di.resolve(ConfigSysop).PORT, 4000);
    assert.throws(() => di.resolve(DBConfig), DIProviderError);
  } finally {
    di.destroy();
  }
});
