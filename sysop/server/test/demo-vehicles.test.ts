import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { Files, Vehicles } from "@bigmotors/sysop-dti";
import { demoMarker, demoVehicleBody, demoVehicles, escapeHtml } from "../src/dev/vehicle-data.js";
import { readDemoImportConfig } from "../src/dev/import-config.js";

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

test("demo import rejects an invalid target before connecting, without leaking credentials", () => {
  const result = spawnSync(process.execPath, ["--import=tsx", "src/dev/seed-vehicles.ts"], {
    cwd: fileURLToPath(new URL("../", import.meta.url)),
    env: { ...process.env, NODE_ENV: "production", DEMO_API_BASE_URL: "https://name:secret@example.test" }, encoding: "utf8", timeout: 10_000,
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /DEMO_API_BASE_URL must be/);
  assert.ok(!result.stderr.includes("secret"));
});

test("demo config accepts remote origins in any runtime and retains the local default", () => {
  assert.deepEqual(readDemoImportConfig({ PORT: "64402" }), { origin: "http://127.0.0.1:64402", maxBytes: 20971520 });
  assert.deepEqual(readDemoImportConfig({ NODE_ENV: "production", PORT: "invalid", DEMO_API_BASE_URL: " https://api.example.test/ ", FILE_UPLOAD_MAX_BYTES: "8" }), { origin: "https://api.example.test", maxBytes: 8 });
  assert.equal(readDemoImportConfig({ DEMO_API_BASE_URL: "http://sysop-server.railway.internal:4000" }).origin, "http://sysop-server.railway.internal:4000");
  for (const value of ["", " ", "invalid", "file:///tmp/image", "https://x.test/api", "https://x.test?key=x", "https://x.test/#x", "https://user:password@x.test"]) {
    assert.throws(() => readDemoImportConfig({ DEMO_API_BASE_URL: value }), /DEMO_API_BASE_URL must be/);
  }
});

test("production CLI uses the configured API without auth and checks references before writing", async (t) => {
  const requests: string[] = [];
  const server = createServer((req, res) => {
    assert.equal(req.method, "GET");
    assert.equal(req.headers.authorization, undefined);
    requests.push(req.url!);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true, data: [] }));
  });
  t.after(() => { server.closeAllConnections(); server.close(); });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const child = spawn(process.execPath, ["--import=tsx", "src/dev/seed-vehicles.ts"], {
    cwd: fileURLToPath(new URL("../", import.meta.url)),
    env: { ...process.env, NODE_ENV: "production", DEMO_API_BASE_URL: `http://127.0.0.1:${address.port}`, FILE_UPLOAD_MAX_BYTES: "20971520" },
    stdio: ["ignore", "pipe", "pipe"], timeout: 15_000,
  });
  t.after(() => child.kill());
  let stderr = "";
  child.stderr.setEncoding("utf8").on("data", (data) => { stderr += data; });
  child.stdout.resume();
  const [code] = await once(child, "close");
  assert.equal(code, 1);
  assert.match(stderr, /Missing active reference/);
  assert.deepEqual(requests, ["/api/vehicle-brands?limit=100&offset=0", "/api/vehicle-models?limit=100&offset=0", "/api/vehicle-body-types?limit=100&offset=0", "/api/colors?limit=100&offset=0"]);
});
