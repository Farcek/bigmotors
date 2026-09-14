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
  const response = await request(admin, "/api/vehicles?limit=1&offset=0");
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.success, true);
  assert.deepEqual(body.data.items, []);
  assert.equal(body.data.limit, 1);
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
    const head = await request(origin, `/files/${file.id}/another-name.txt`, { method: "HEAD" });
    assert.equal(head.status, 200);
    assert.equal(head.headers.get("content-length"), String(Buffer.byteLength("docker-upload-check")));
    assert.equal(await head.text(), "");
  }
});

test("admin renders its runtime upstream and system DNS without root privileges", () => {
  const args = ["compose", "-p", "bigmotors-docker-check", "-f", "infra/docker-compose.yml", "-f", "infra/test/compose.yml", "exec", "-T", "sysop-app"];
  const run = (...command: string[]) => execFileSync("docker", [...args, ...command], { encoding: "utf8", timeout: 30_000 });
  assert.equal(run("id", "-u").trim(), "101");
  const config = run("cat", "/tmp/nginx.conf");
  assert.match(config, /http:\/\/sysop-proxy-check:4000\//);
  assert.match(config, /proxy_pass \$api\$request_uri;/);
  assert.match(config, /proxy_ssl_verify on;/);
  assert.doesNotMatch(config, /\$\{SYSOP_API_BASE_URL\}|\$\{NGINX_LOCAL_RESOLVERS\}|ipv6=off/);
  const resolvers = run("cat", "/etc/resolv.conf").split("\n")
    .filter((line) => line.startsWith("nameserver ")).map((line) => line.trim().split(/\s+/)[1]);
  assert.ok(resolvers.length);
  for (const resolver of resolvers) assert.ok(config.includes(resolver.includes(":") ? `[${resolver}]` : resolver));
});

test("invalid admin runtime origins return 502 without falling back to the default backend", async () => {
  for (const origin of ["", "http://sysop-proxy-check:4000/api", "http://sysop-proxy-check:4000?query=1"]) {
    const name = `bigmotors-admin-proxy-check-${crypto.randomUUID()}`;
    try {
      execFileSync("docker", ["run", "-d", "--rm", "--name", name,
        "--network", "bigmotors-docker-check_default", "-p", "127.0.0.1::8080",
        "-e", `SYSOP_API_BASE_URL=${origin}`, "bigmotors-docker-check-sysop-app"], { timeout: 30_000 });
      const [container] = JSON.parse(execFileSync("docker", ["inspect", name], { encoding: "utf8", timeout: 30_000 }));
      const base = `http://127.0.0.1:${container.NetworkSettings.Ports["8080/tcp"][0].HostPort}`;
      let ready = false;
      for (let attempt = 0; attempt < 40; attempt++) {
        try { ready = (await request(base, "/health")).status === 200; } catch { /* Startup can precede listening. */ }
        if (ready) break;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      assert.ok(ready, "Temporary admin container did not start");
      for (const path of ["/api/vehicles", "/files/00000000-0000-4000-8000-000000000001/file"]) {
        assert.equal((await request(base, path)).status, 502, origin);
      }
    } finally {
      execFileSync("docker", ["rm", "-f", name], { timeout: 30_000, stdio: "ignore" });
    }
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
