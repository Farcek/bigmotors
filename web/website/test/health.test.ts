import assert from "node:assert/strict";
import test from "node:test";
import { dynamic, GET } from "../src/app/api/health/route";

test("health is dynamic, uncached and independent of DB/content", async () => {
  assert.equal(dynamic, "force-dynamic");
  const response = GET();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await response.json(), { status: "ok", service: "@bigmotors/website" });
});
