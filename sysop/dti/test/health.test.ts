import assert from "node:assert/strict";
import { test } from "node:test";
import { Health } from "../src/index.js";

test("health action describes the existing public liveness route", () => {
  assert.equal(Health.check.name, "healthCheck");
  assert.equal(Health.check.path, "/health");
  assert.equal(Health.check.method, "GET");
  assert.equal(Health.check.body, undefined);
  assert.equal(Health.check.query, Health.query);
  assert.equal(Health.check.result, Health.result);
});

test("health query accepts only an empty object", () => {
  assert.deepEqual(Health.query.parse({}), {});
  for (const input of [undefined, null, [], "", { token: "unexpected" }]) {
    assert.equal(Health.query.safeParse(input).success, false);
  }
});

test("health result accepts the server liveness payload", () => {
  const payload: Health.Result = {
    status: "ok",
    service: "@bigmotors/sysop-server",
  };
  assert.deepEqual(Health.result.parse(payload), payload);
});

test("health result rejects missing, incorrect and extra fields", () => {
  for (const input of [
    undefined,
    null,
    {},
    { status: "ok" },
    { service: "@bigmotors/sysop-server" },
    { status: "ready", service: "@bigmotors/sysop-server" },
    { status: "ok", service: "@chip-crm/server" },
    { status: "ok", service: "@bigmotors/sysop-server", database: "secret" },
  ]) {
    assert.equal(Health.result.safeParse(input).success, false);
  }
});
