import assert from "node:assert/strict";
import { test } from "node:test";

const baseUrl = process.env.WEBSITE_TEST_URL ?? "http://127.0.0.1:64400";
const expectHomeError = process.env.WEBSITE_TEST_HOME_ERROR === "1";
const id = "00000000-0000-4000-8000-000000000001";

test("home renders gallery JSON or the explicitly expected production error", async () => {
  const response = await fetch(new URL("/", baseUrl));
  assert.equal(response.status, expectHomeError ? 500 : 200);
  const html = await response.text();
  if (expectHomeError) {
    assert.doesNotMatch(html, /Gallery not found|gallery key: home/);
    return;
  }
  assert.match(html, /<header\b/); assert.match(html, /<footer\b/);
  const pre = html.match(/<pre\b[^>]*>([\s\S]*?)<\/pre>/)?.[1];
  assert.notEqual(pre, undefined);
  const text = pre!.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  const gallery = JSON.parse(text);
  assert.notEqual(gallery, null);
  assert.equal(gallery.key, "home");
  assert.ok(Array.isArray(gallery.items));
});

for (const path of ["/vehicles", `/vehicles/${id}`, "/parts", `/parts/${id}`, "/tires", `/tires/${id}`, "/vehicles?sort=price_asc&page=2"]) {
  test(`empty route ${path} retains layout without rendering data`, async () => {
    const response = await fetch(new URL(path, baseUrl));
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /<header\b/); assert.match(html, /<footer\b/);
    const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1];
    assert.notEqual(main, undefined);
    assert.equal(main!.replace(/<!--[\s\S]*?-->/g, "").trim(), "");
    assert.match(html, /name="robots" content="noindex, nofollow"/);
  });
}

for (const path of ["/missing/nested/path", "/vehicles/example/extra", "/api", "/files", `/missing-${crypto.randomUUID()}`]) {
  test(`unmatched or reserved URL ${path} returns 404`, async () => {
    const response = await fetch(new URL(path, baseUrl));
    assert.equal(response.status, 404);
    assert.match(await response.text(), /Хуудас олдсонгүй/);
  });
}

test("file route is explicitly unimplemented; GET/HEAD do not claim a file exists", async () => {
  const url = new URL(`/files/${id}/${encodeURIComponent("image name.jpg")}`, baseUrl);
  const response = await fetch(url);
  assert.equal(response.status, 501); assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal((await response.json()).error.code, "FILE_READ_NOT_IMPLEMENTED");
  const head = await fetch(url, { method: "HEAD" });
  assert.equal(head.status, 501); assert.equal(await head.text(), "");
  assert.equal((await fetch(url, { method: "POST" })).status, 405);
});
