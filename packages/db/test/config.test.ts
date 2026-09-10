import assert from "node:assert/strict";
import { test } from "node:test";
import { Container, DIProviderError } from "@napp/di";
import NappError from "@napp/error";
import { TKN_ENV } from "@bigmotors/core";
import { DBConfig } from "../src/config.js";
import { diDBCoreProviders } from "../src/di.js";

const DATABASE_URL = "postgresql://example:example@localhost:1/example";

function resolveConfig(env: NodeJS.ProcessEnv): DBConfig {
  const container = new Container("config-test");
  try {
    container.asValue(TKN_ENV, env).registryModule(diDBCoreProviders());
    return container.resolve(DBConfig);
  } finally {
    container.destroy();
  }
}

test("DBConfig uses default pool limits and trims the connection string", () => {
  const config = resolveConfig({ DATABASE_URL: ` ${DATABASE_URL} ` });
  assert.equal(config.DATABASE_URL, DATABASE_URL);
  assert.equal(config.DATABASE_POOL_MIN, 0);
  assert.equal(config.DATABASE_POOL_MAX, 10);
});

test("DBConfig resolves the environment through its DI token", () => {
  const container = new Container("config-test");
  try {
    container.asValue(TKN_ENV, {
      DATABASE_URL,
      DATABASE_POOL_MIN: "5",
      DATABASE_POOL_MAX: "5",
    }).registryModule(diDBCoreProviders());
    const config = container.resolve(DBConfig);
    assert.ok(config instanceof DBConfig);
    assert.equal(config.DATABASE_URL, DATABASE_URL);
    assert.equal(config.DATABASE_POOL_MIN, 5);
    assert.equal(config.DATABASE_POOL_MAX, 5);
  } finally {
    container.destroy();
  }
});

function rejectsConfig(env: NodeJS.ProcessEnv, code: string) {
  assert.throws(() => resolveConfig(env), (error: unknown) => {
    assert.ok(error instanceof DIProviderError);
    assert.ok(error.cause instanceof NappError);
    assert.equal(error.cause.code, code);
    assert.equal(error.cause.message.includes(DATABASE_URL), false);
    return true;
  });
}

test("DBConfig rejects a missing, empty or whitespace connection string", () => {
  for (const value of [undefined, "", "   "]) {
    rejectsConfig({ DATABASE_URL: value }, "DATABASE_URL_NOT_DEFINED");
  }
});

test("DBConfig rejects invalid pool sizes", () => {
  for (const field of ["DATABASE_POOL_MIN", "DATABASE_POOL_MAX"] as const) {
    for (const value of ["", "   ", "abc", "NaN", "Infinity", "-Infinity", "1.5", "-1", "9007199254740992"]) {
      rejectsConfig({ DATABASE_URL, [field]: value }, `${field}_INVALID`);
    }
  }
  rejectsConfig({ DATABASE_URL, DATABASE_POOL_MAX: "0" }, "DATABASE_POOL_MAX_INVALID");
});

test("DBConfig rejects a minimum exceeding the maximum", () => {
  rejectsConfig({ DATABASE_URL, DATABASE_POOL_MIN: "11" }, "DATABASE_POOL_MIN_EXCEEDS_MAX");
});
