import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

// Run after next build with WEBSITE_TEST_FILE_PROXY=1; no real DB/storage or API is used.
test("production Next file route proxies without a Website DB or volume", {
  skip: process.env.WEBSITE_TEST_FILE_PROXY !== "1", timeout: 60_000,
}, async (t) => {
  const id = "7593bf0b-4d2b-4d93-abfe-cc6a42e761b9";
  const bytes = Buffer.from([0, 255, 128, 42]);
  const upstream = createServer((req, res) => {
    assert.equal(req.url, `/files/${id}/file`);
    assert.equal(req.headers.cookie, undefined);
    res.writeHead(200, { "Content-Type": "image/jpeg", "Content-Length": bytes.length });
    res.end(req.method === "HEAD" ? undefined : bytes);
  });
  t.after(() => { upstream.closeAllConnections(); upstream.close(); });
  upstream.listen(0, "127.0.0.1");
  await once(upstream, "listening");
  const address = upstream.address();
  assert.ok(address && typeof address !== "string");
  const next = createRequire(import.meta.url).resolve("next/dist/bin/next");
  const child = spawn(process.execPath, [next, "start", "--hostname", "127.0.0.1", "--port", "0"], {
    cwd: fileURLToPath(new URL("../", import.meta.url)),
    env: {
      ...process.env, NODE_ENV: "production", NO_COLOR: "1",
      FILES_API_BASE_URL: `http://127.0.0.1:${address.port}`,
      DATABASE_URL: "invalid-test-database", FILES_ROOT: "/nonexistent-file-proxy-test",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      const closed = once(child, "close");
      child.kill();
      await closed;
    }
  });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });
  let baseUrl: string | undefined;
  for (let attempt = 0; attempt < 200; attempt++) {
    baseUrl = output.match(/http:\/\/127\.0\.0\.1:\d+/)?.[0];
    if (baseUrl && output.includes("Ready")) break;
    assert.equal(child.exitCode, null, output);
    await delay(100);
  }
  assert.ok(baseUrl && output.includes("Ready"), output);
  for (const method of ["GET", "HEAD"]) {
    const response: Response = await fetch(`${baseUrl}/files/${id}/wrong.html`, { method, headers: { Cookie: "private=value" } });
    assert.equal(response.status, 200, output);
    assert.equal(response.headers.get("content-type"), "image/jpeg");
    assert.equal(response.headers.get("content-length"), String(bytes.length));
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), method === "HEAD" ? Buffer.alloc(0) : bytes);
  }
  const invalid = await fetch(`${baseUrl}/files/invalid/file`);
  assert.equal(invalid.status, 400);
  assert.equal((await invalid.json()).error.code, "FILE_INVALID_ID");
});
