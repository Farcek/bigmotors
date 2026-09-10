import assert from "node:assert/strict";
import { test } from "node:test";
import { DIProviderError } from "@napp/di";
import { NappError } from "@napp/error";
import { ConfigSysop } from "../src/config.js";
import { createContainer } from "../src/di.js";

function resolveConfig(env: NodeJS.ProcessEnv) {
  const di = createContainer({ env });
  try { return di.resolve(ConfigSysop); } finally { di.destroy(); }
}

function configError(message?: string) {
  return (error: unknown) => {
    assert.ok(error instanceof DIProviderError);
    assert.ok(error.cause instanceof NappError);
    assert.equal(error.cause.code, "SYSOP_CONFIG_INVALID");
    if (message) assert.equal(error.cause.message, message);
    return true;
  };
}

test("configuration defaults to loopback port 4000", () => {
  const config = resolveConfig({});
  assert.equal(config.HOST, "127.0.0.1");
  assert.equal(config.PORT, 4000);
});

test("configuration accepts explicit host and port boundaries", () => {
  for (const port of [1, 4100, 65535]) {
    const config = resolveConfig({ HOST: " 0.0.0.0 ", PORT: String(port) });
    assert.equal(config.HOST, "0.0.0.0");
    assert.equal(config.PORT, port);
  }
});

test("configuration rejects invalid ports without exposing their values", () => {
  for (const port of ["", "0", "-1", "65536", "4000.5", "4e3", " 4000 ", "secret", "NaN"]) {
    assert.throws(() => resolveConfig({ PORT: port }),
      configError("PORT must be an integer from 1 to 65535."));
  }
});

test("configuration rejects an explicitly empty host", () => {
  assert.throws(() => resolveConfig({ HOST: "  " }), configError());
});
