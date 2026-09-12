import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { Files, Vehicles } from "@bigmotors/sysop-dti";
import { demoMarker, demoVehicleBody, demoVehicles, escapeHtml } from "../src/dev/vehicle-data.js";

test("20 demo fixtures are distinct, clearly labeled, attributable and valid vehicle inputs", () => {
  assert.equal(demoVehicles.length, 20);
  assert.equal(new Set(demoVehicles.map((car) => demoMarker(car.key))).size, 20);
  assert.equal(new Set(demoVehicles.map((car) => car.image.url)).size, 20);
  for (const car of demoVehicles) {
    const body = Vehicles.createBody.parse(demoVehicleBody(car, {
      brandId: randomUUID(), modelId: randomUUID(), bodyTypeId: randomUUID(), exteriorColorId: randomUUID(),
    }));
    assert.match(body.title, /^\[DEMO-\d{2}\]/);
    assert.ok(body.description?.includes("Бодит худалдаанд"));
    assert.ok(body.internalNote?.startsWith(demoMarker(car.key) + "\n"));
    assert.ok(body.content?.includes(car.image.author));
    assert.equal("publicationStatus" in body, false);
    assert.equal(new URL(car.image.url).hostname, "upload.wikimedia.org");
    assert.equal(new URL(car.image.source).hostname, "commons.wikimedia.org");
    assert.equal(new URL(car.image.licenseUrl).hostname, "creativecommons.org");
    assert.ok(car.image.bytes < 20 * 1024 * 1024);
    Files.uploadMetadata.parse({ description: `${car.image.author} | ${car.image.license} | ${car.image.source} | ${car.image.licenseUrl} | Original, unchanged.` });
  }
});

test("photo credits are escaped when embedded in HTML", () => {
  assert.equal(escapeHtml('<img src="x" onerror=\'test\'>&'), "&lt;img src=&quot;x&quot; onerror=&#39;test&#39;&gt;&amp;");
});

test("demo import refuses production before connecting to any API", () => {
  const result = spawnSync(process.execPath, ["--import=tsx", "src/dev/seed-vehicles.ts"], {
    cwd: fileURLToPath(new URL("../", import.meta.url)),
    env: { ...process.env, NODE_ENV: "production" }, encoding: "utf8", timeout: 10_000,
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Demo vehicles are development-only/);
});
