import assert from "node:assert/strict";
import { test } from "node:test";

const baseUrl = process.env.WEBSITE_TEST_URL ?? "http://127.0.0.1:64400";
const expectHomeError = process.env.WEBSITE_TEST_HOME_ERROR === "1";
const id = "00000000-0000-4000-8000-000000000001";

test("public lookup endpoint returns only public reference fields without caching", async () => {
  const response = await fetch(new URL("/api/vehicles/lookups", baseUrl));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const data = await response.json();
  assert.deepEqual(Object.keys(data).sort(), ["brands", "categories", "colors", "models", "variants"]);
  for (const [key, rows] of Object.entries(data)) {
    assert.ok(Array.isArray(rows));
    for (const row of rows) {
      const expected = key === "models" ? ["brandId", "id", "name"] : key === "variants" ? ["id", "modelId", "name"] : ["id", "name"];
      assert.deepEqual(Object.keys(row).sort(), expected);
    }
  }
});

test("home renders gallery carousel or the explicitly expected production error", async () => {
  const response = await fetch(new URL("/", baseUrl));
  assert.equal(response.status, expectHomeError ? 500 : 200);
  const html = await response.text();
  if (expectHomeError) {
    assert.doesNotMatch(html, /Gallery not found|Gallery is empty|gallery key: home/);
    return;
  }
  assert.match(html, /<header\b/); assert.match(html, /<footer\b/);
  assert.match(html, /aria-roledescription="carousel"/);
  assert.match(html, /aria-roledescription="slide"/);
  assert.match(html, /<img[^>]+src="\/files\//);
  assert.doesNotMatch(html, /<pre\b/);
  assert.match(html, /Автомашины хайлтын үр дүн/);
});

test("public vehicle API is bounded, uncached and never accepts admin visibility overrides", async () => {
  const response = await fetch(new URL("/api/vehicles", baseUrl));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const data = await response.json();
  assert.ok(data.items.length <= 12); assert.ok(data.pageCount <= 3); assert.equal(data.pageSize, 12);
  for (const item of data.items) {
    for (const key of ["vin", "internalNote", "filePath", "usage", "publicationStatus", "content"]) assert.equal(key in item, false);
    if (item.priceDisplayMode === "inquire") assert.equal(item.price, null);
  }
  for (const query of ["page=4", "page=1&page=2", "publicationStatus=draft", "price_min=10&price_max=1", "limit=1000", "brand=invalid"]) assert.equal((await fetch(new URL(`/api/vehicles?${query}`, baseUrl))).status, 400);
  assert.equal((await fetch(new URL("/api/vehicles", baseUrl), { method: "POST" })).status, 405);
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

test("file route returns missing and invalid ID errors without claiming a file exists", async () => {
  const url = new URL(`/files/${id}/${encodeURIComponent("image name.jpg")}`, baseUrl);
  const response = await fetch(url);
  assert.equal(response.status, 404); assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal((await response.json()).error.code, "FILE_NOT_FOUND");
  const head = await fetch(url, { method: "HEAD" });
  assert.equal(head.status, 404); assert.equal(await head.text(), "");
  assert.equal((await fetch(new URL("/files/invalid/anything", baseUrl))).status, 400);
  assert.equal((await fetch(url, { method: "POST" })).status, 405);
});
