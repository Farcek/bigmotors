import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import NotFoundPage from "../src/app/not-found";

test("shared 404 has a generic heading and catalog/home recovery links", () => {
  const html = renderToStaticMarkup(<NotFoundPage />);
  assert.match(html, /aria-labelledby="not-found-title"/);
  assert.match(html, /<h1[^>]*>Хуудас олдсонгүй<\/h1>/);
  assert.match(html, />404<\/p>/);
  assert.match(html, /href="\/vehicles"/);
  assert.match(html, /href="\/"/);
  assert.doesNotMatch(html, /Автомашин олдсонгүй|зарагдсан|<form/);
});

test("unknown pages and missing vehicles use the same 404 inside the shared layout", async () => {
  const base = process.env.WEBSITE_TEST_URL ?? "http://127.0.0.1:64400";
  for (const path of ["/missing/404-check", "/vehicles/00000000-0000-4000-8000-000000000001", "/vehicles/invalid"]) {
    const response = await fetch(new URL(path, base));
    assert.equal(response.status, 404);
    const html = await response.text();
    // Async notFound() can send a 404 shell with the shared UI in the RSC payload.
    const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1];
    if (main !== undefined) {
      assert.match(html, /<header\b/);
      assert.match(html, /<footer\b/);
      assert.match(main, />404<\/p>/);
    } else {
      assert.match(html, /NEXT_HTTP_ERROR_FALLBACK;404/);
      assert.match(html, /not-found-title/);
    }
    assert.match(main ?? html, /Хуудас олдсонгүй/);
    assert.match(main ?? html, /Автомашин үзэх/);
    assert.doesNotMatch(main ?? html, /Автомашин олдсонгүй|зарагдсан/);
  }
});
