import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";

const website = "http://127.0.0.1:65400";
const admin = "http://127.0.0.1:65403";
const server = "http://127.0.0.1:65402";

function inContainer(service: string, script: string) {
  return execFileSync("docker", [
    "compose", "-p", "bigmotors-docker-check", "-f", "infra/docker-compose.yml",
    "-f", "infra/test/compose.yml", "exec", "-T", service, "node", "-e", script,
  ], { encoding: "utf8", timeout: 30_000 });
}

async function request(origin: string, pathname: string, init?: RequestInit) {
  return fetch(origin + pathname, { ...init, signal: AbortSignal.timeout(15_000) });
}

test("all container health endpoints respond", async () => {
  for (const [origin, pathname] of [[website, "/api/health"], [admin, "/health"], [server, "/health"]]) {
    const response = await request(origin, pathname);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).status, "ok");
  }
});

test("admin SPA deep links and bundled assets are served", async () => {
  const response = await request(admin, "/website/home");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /id="root"/);
  const asset = html.match(/src="([^"]+\.js)"/)?.[1];
  assert.ok(asset);
  assert.equal((await request(admin, asset)).status, 200);
  assert.equal((await request(admin, "/assets/missing.js")).status, 404);
});

test("admin proxy reaches the migrated DB", async () => {
  const response = await request(admin, "/api/vehicles");
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.success, true);
  assert.deepEqual(body.data.items, []);
});

test("website standalone reaches the migrated DB", async () => {
  const response = await request(website, "/api/vehicles");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /application\/json/);
  const listing = await request(website, "/vehicles");
  assert.equal(listing.status, 200);
  const html = await listing.text();
  const asset = html.match(/src="([^"]+\/_next\/static\/[^"]+\.js)"/)?.[1]
    ?? html.match(/src="(\/_next\/static\/[^"]+\.js)"/)?.[1];
  assert.ok(asset);
  assert.equal((await request(website, asset)).status, 200);
});

test("missing files are API 404s, not admin SPA fallbacks", async () => {
  const path = "/files/00000000-0000-4000-8000-000000000001/missing.jpg";
  for (const origin of [website, admin]) {
    const response = await request(origin, path);
    assert.equal(response.status, 404);
  }
});

test("anonymous production upload is readable through both services", async () => {
  const data = new FormData();
  data.append("file", new Blob(["docker-upload-check"]), "check.txt");
  const response = await request(admin, "/api/files/upload", { method: "POST", body: data });
  assert.equal(response.status, 201);
  const file = await response.json();
  for (const origin of [admin, website]) {
    const read = await request(origin, `/files/${file.id}/check.txt`);
    assert.equal(read.status, 200);
    assert.equal(await read.text(), "docker-upload-check");
  }
});

test("Node runtimes are non-root and Website can only read shared files", () => {
  for (const service of ["website", "sysop-server"]) {
    assert.equal(inContainer(service, "process.stdout.write(String(process.getuid()))"), "1000");
  }
  const filename = `/files/.docker-check-${crypto.randomUUID()}`;
  const path = JSON.stringify(filename);
  try {
    inContainer("sysop-server", `require('node:fs').writeFileSync(${path}, 'shared-file-check')`);
    assert.equal(inContainer("website", `process.stdout.write(require('node:fs').readFileSync(${path}))`), "shared-file-check");
    assert.equal(inContainer("website", `try { require('node:fs').writeFileSync(${path}, 'blocked'); process.exit(1); } catch (e) { process.stdout.write(e.code); }`), "EROFS");
  } finally {
    inContainer("sysop-server", `require('node:fs').rmSync(${path}, { force: true })`);
  }
});
