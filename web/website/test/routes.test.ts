import assert from "node:assert/strict";
import { test } from "node:test";

const baseUrl = process.env.WEBSITE_TEST_URL ?? "http://127.0.0.1:64400";
const id = "00000000-0000-4000-8000-000000000001";

test("home renders its own content instead of Page module JSON inside shared layout", async () => {
  const response = await fetch(new URL("/", baseUrl));
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Бүтээгдэхүүний каталог/);
  assert.match(html, /Автомашин, сэлбэг хэрэгсэл, дугуй/);
  assert.doesNotMatch(html, /<pre\b/);
  assert.match(html, /<header\b/); assert.match(html, /<footer\b/);
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
