import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { test } from "node:test";
import { proxyFileResponse } from "../src/server/file-proxy-response.ts";

const id = "7593bf0b-4d2b-4d93-abfe-cc6a42e761b9";
const request = (method = "GET") => new Request(`http://website/files/${id}/anything.html?target=private`, {
  method, headers: { Cookie: "private=cookie", Authorization: "Bearer secret", Range: "bytes=0-1" },
});

test("proxy forwards only validated width and preserves variant cache headers", async () => {
  for (const method of ["GET", "HEAD"]) {
    const response = await proxyFileResponse(new Request(`http://website/files/${id}/image?w=480&target=private`, { method }), id, "http://server", async (url) => {
      assert.equal(String(url), `http://server/files/${id}/file?w=480`);
      return new Response(method === "HEAD" ? null : "webp", { headers: { "Content-Type": "image/webp", "Content-Length": "4" } });
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "public, max-age=3600");
    assert.equal(await response.text(), method === "HEAD" ? "" : "webp");
  }
  for (const query of ["w=123", "w=480&w=800", "w="]) {
    const response = await proxyFileResponse(new Request(`http://website/files/${id}/image?${query}`), id, "http://server", async () => { throw new Error("Should not fetch"); });
    assert.equal(response.status, 400);
    assert.equal((await response.json() as { error: { code: string } }).error.code, "FILE_IMAGE_INVALID_WIDTH");
  }
  for (const status of [413, 415, 503]) {
    const response = await proxyFileResponse(new Request(`http://website/files/${id}/image?w=480`), id, "http://server", async () => new Response("private", { status }));
    assert.equal(response.status, status);
    assert.doesNotMatch(await response.text(), /private/);
  }
});

test("file proxy GET/HEAD preserve bytes and safe headers without forwarding user credentials", async (t) => {
  const bytes = Buffer.from([0, 255, 128, 3, 42]);
  const server = createServer((req, res) => {
    assert.equal(req.url, `/files/${id}/file`);
    assert.equal(req.headers.cookie, undefined);
    assert.equal(req.headers.authorization, undefined);
    assert.equal(req.headers.range, undefined);
    assert.equal(req.headers["accept-encoding"], "identity");
    res.writeHead(200, {
      "Content-Type": "image/jpeg", "Content-Length": bytes.length,
      "Set-Cookie": "upstream=private", "Cache-Control": "public, max-age=100",
    });
    res.end(req.method === "HEAD" ? undefined : bytes);
  });
  t.after(() => { server.closeAllConnections(); server.close(); });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  for (const method of ["GET", "HEAD"]) {
    const response = await proxyFileResponse(request(method), id, `http://127.0.0.1:${address.port}/`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "image/jpeg");
    assert.equal(response.headers.get("content-length"), String(bytes.length));
    assert.equal(response.headers.get("set-cookie"), null);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.match(response.headers.get("content-security-policy")!, /sandbox/);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), method === "HEAD" ? Buffer.alloc(0) : bytes);
  }
});

test("invalid configuration and unsafe IDs never connect or reveal secrets", async () => {
  const neverFetch: typeof fetch = async () => { throw new Error("Unexpected fetch"); };
  for (const origin of ["", "not a URL", "file:///data", "https://user:secret@server", "https://server/api", "https://server?token=secret", "https://server/#secret"]) {
    const response = await proxyFileResponse(request(), id, origin, neverFetch);
    assert.equal(response.status, 500);
    assert.doesNotMatch(await response.text(), /secret|Unexpected/);
  }
  for (const unsafeId of ["..", "../health", "%2e%2e", "a/b", "a\\b", "invalid"]) {
    const response = await proxyFileResponse(request(), unsafeId, "http://server", neverFetch);
    assert.equal(response.status, 400);
  }
});

test("errors are sanitized and redirects are not followed, including HEAD", async () => {
  for (const [status, expected] of [[400, 400], [404, 404], [301, 502], [401, 502], [500, 502], [503, 502], [206, 502]]) {
    for (const method of ["GET", "HEAD"]) {
      let cancelled = false;
      const fetcher: typeof fetch = async (_url, options) => {
        assert.equal(options?.redirect, "manual");
        assert.equal(options?.cache, "no-store");
        return new Response(new ReadableStream({ cancel() { cancelled = true; } }), {
          status, headers: { Location: "http://private/secret", "Set-Cookie": "secret" },
        });
      };
      const response = await proxyFileResponse(request(method), id, "http://server", fetcher);
      assert.equal(cancelled, true);
      assert.equal(response.status, expected);
      assert.equal(response.headers.get("location"), null);
      const text = await response.text();
      if (method === "HEAD") assert.equal(text, "");
      assert.doesNotMatch(text, /private|secret/);
    }
  }
  const response = await proxyFileResponse(request(), id, "http://server", async () => { throw new Error("secret network address"); });
  assert.equal(response.status, 502);
  assert.doesNotMatch(await response.text(), /secret/);
});

test("downloads preserve disposition; decoded streams omit encoded length and propagate cancellation", async () => {
  let cancelled = false;
  const disposition = "attachment; filename=download.svg";
  const fetcher: typeof fetch = async () => new Response(new ReadableStream({ cancel() { cancelled = true; } }), {
    headers: { "Content-Disposition": disposition, "Content-Encoding": "gzip", "Content-Length": "20" },
  });
  const response = await proxyFileResponse(request(), id, "http://server", fetcher);
  assert.equal(response.headers.get("content-disposition"), disposition);
  assert.equal(response.headers.get("content-type"), "application/octet-stream");
  assert.equal(response.headers.get("content-encoding"), null);
  assert.equal(response.headers.get("content-length"), null);
  await response.body!.cancel();
  assert.equal(cancelled, true);
});

test("empty files and request cancellation are handled without a local disk fallback", async () => {
  const empty = await proxyFileResponse(request(), id, "http://server", async () => new Response(null, { headers: { "Content-Length": "0" } }));
  assert.equal(empty.status, 200);
  assert.equal(empty.headers.get("content-length"), "0");
  assert.equal(await empty.text(), "");
  const controller = new AbortController();
  controller.abort();
  const aborted = await proxyFileResponse(new Request(request(), { signal: controller.signal }), id, "http://server", async (_url, options) => {
    assert.equal(options?.signal?.aborted, true);
    throw options?.signal?.reason;
  });
  assert.equal(aborted.status, 502);
});

test("upstream timeout returns a sanitized 504 for GET and HEAD", async (t) => {
  t.mock.method(AbortSignal, "timeout", (milliseconds: number) => {
    assert.equal(milliseconds, 120_000);
    return AbortSignal.abort(new DOMException("private upstream", "TimeoutError"));
  });
  for (const method of ["GET", "HEAD"]) {
    const response = await proxyFileResponse(request(method), id, "http://server", async (_url, options) => {
      throw options?.signal?.reason;
    });
    assert.equal(response.status, 504);
    const text = await response.text();
    if (method === "HEAD") assert.equal(text, "");
    assert.doesNotMatch(text, /private/);
  }
});
