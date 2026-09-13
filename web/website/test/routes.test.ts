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

for (const path of ["/vehicles", "/vehicles?sort=price_asc&page=2"]) {
  test(`vehicle catalog ${path} renders the same live records as its API`, async () => {
    const response = await fetch(new URL(path, baseUrl));
    assert.equal(response.status, 200);
    const html = await response.text();
    const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1] ?? "";
    assert.match(main, /Автомашины шүүлтүүр/);
    assert.doesNotMatch(main, /Автомашины жагсаалт|Жишээ өгөгдөл|Шинэ болон хуучин/);
    const query = new URL(path, baseUrl).search;
    const data = await (await fetch(new URL(`/api/vehicles/search${query}`, baseUrl))).json();
    assert.equal((main.match(/<article\b/g) ?? []).length, data.items.length);
    for (const item of data.items) assert.ok(main.includes(`/vehicles/${item.id}`));
    assert.doesNotMatch(main, /\/demo\/vehicles\/|ui-demo-/);
  });
}

test("vehicle preview initializes URL filters in server HTML and renders bad input without crashing", async () => {
  const valid = await fetch(new URL("/vehicles?fuel=cng&transmission=amt&price_min=20000000&price_max=50000000&sort=price_desc", baseUrl));
  assert.equal(valid.status, 200);
  const main = (await valid.text()).match(/<main\b[^>]*>([\s\S]*?)<\/main>/)![1];
  assert.match(main, /name="fuel"[^>]*checked=""[^>]*value="cng"/);
  assert.match(main, /name="transmission"[^>]*checked=""[^>]*value="amt"/);
  assert.match(main, /name="price_min"[^>]*value="20000000"/);
  assert.match(main, /value="price_desc" selected=""/);
  const invalid = await fetch(new URL("/vehicles?price_min=100&price_max=10&fuel=gasoline&fuel=diesel", baseUrl));
  assert.equal(invalid.status, 200);
  const html = await invalid.text();
  assert.match(html, /Дээд утга доод утгаас бага/);
  assert.match(html, /зөвхөн нэг утга/);
});

test("catalog endpoint accepts bounded page sizes, sorting, filters, and rejects unsupported inputs", async () => {
  for (const size of [12, 18, 24, 36]) {
    const response = await fetch(new URL(`/api/vehicles/search?page_size=${size}&sort=price_asc&page=4`, baseUrl));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const data = await response.json();
    assert.equal(data.pageSize, size);
    assert.ok(data.items.length <= size);
    assert.equal(data.pageCount, Math.ceil(data.total / size));
    assert.ok(data.page <= Math.max(1, data.pageCount));
    const prices = data.items.filter((item: { price: number | null }) => item.price !== null).map((item: { price: number }) => item.price);
    assert.deepEqual(prices, [...prices].sort((a: number, b: number) => a - b));
  }
  for (const query of ["page_size=1000", "page=0", "page=1000000", "page=1&page=2", "fuel=gasoline&fuel=diesel", "columns=5", "sort=sql", "publicationStatus=draft", "price_min=10&price_max=1"]) {
    assert.equal((await fetch(new URL(`/api/vehicles/search?${query}`, baseUrl))).status, 400);
  }
  assert.equal((await fetch(new URL("/api/vehicles/search", baseUrl), { method: "POST" })).status, 405);
});

for (const path of [`/vehicles/${id}`, "/parts", `/parts/${id}`, "/tires", `/tires/${id}`]) {
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
