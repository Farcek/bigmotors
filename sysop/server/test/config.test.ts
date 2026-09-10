import assert from "node:assert/strict";
import { test } from "node:test";
import { readServerConfig } from "../src/config.js";

test("configuration defaults to loopback port 4000", () => {
  assert.deepEqual(readServerConfig({}), { host: "127.0.0.1", port: 4000 });
});

test("configuration accepts explicit host and port boundaries", () => {
  for (const port of [1, 4100, 65535]) {
    assert.deepEqual(readServerConfig({ HOST: "0.0.0.0", PORT: String(port) }), {
      host: "0.0.0.0", port,
    });
  }
});

test("configuration rejects invalid ports without exposing their values", () => {
  for (const port of ["", "0", "-1", "65536", "4000.5", "4e3", " 4000 ", "secret", "NaN"]) {
    assert.throws(() => readServerConfig({ PORT: port }), {
      code: "CONFIG_INVALID",
      message: "PORT must be an integer from 1 to 65535.",
    });
  }
});

test("configuration rejects an explicitly empty host", () => {
  assert.throws(() => readServerConfig({ HOST: "  " }), { code: "CONFIG_INVALID" });
});
