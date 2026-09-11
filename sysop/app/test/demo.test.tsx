import assert from "node:assert/strict";
import { test } from "node:test";
import { MantineProvider } from "@mantine/core";
import { renderToStaticMarkup } from "react-dom/server";
import { createMemoryRouter, RouterProvider } from "react-router";
import { routes } from "../src/router";
import { getDemoList, initialDemoProducts } from "../src/pages/demo/data";

test("demo search, category and active filters compose", () => {
  const result = getDemoList(initialDemoProducts, new URLSearchParams("q=TOYOTA&category=vehicle&status=active"));
  assert.equal(result.total, 1);
  assert.equal(result.rows[0].id, "demo-001");
  assert.equal(getDemoList(initialDemoProducts, new URLSearchParams("q=missing-record")).total, 0);
  assert.equal(getDemoList(initialDemoProducts, new URLSearchParams("q=demo-003")).rows[0].title, "Toyota Prius 50");
});

test("demo price sort does not mutate fixtures and pagination is bounded", () => {
  const originalIds = initialDemoProducts.map((item) => item.id);
  const result = getDemoList(initialDemoProducts, new URLSearchParams("sort=price-asc"));
  assert.equal(result.rows[0].price, 32000);
  assert.equal(result.rows.length, 5);
  assert.equal(result.pages, 3);
  assert.equal(getDemoList(initialDemoProducts, new URLSearchParams("sort=price-desc")).rows[0].price, 285000000);
  assert.deepEqual(initialDemoProducts.map((item) => item.id), originalIds);
  assert.equal(getDemoList(initialDemoProducts, new URLSearchParams("page=9999")).rows.length, 2);
  for (const page of ["-1", "0", "nope", "1.5", "Infinity"]) {
    assert.equal(getDemoList(initialDemoProducts, new URLSearchParams({ page })).page, 1);
  }
});

test("invalid filters fall back and empty/deleted pages remain usable", () => {
  const result = getDemoList(initialDemoProducts, new URLSearchParams("category=unknown&status=unknown&sort=unknown"));
  assert.equal(result.total, 12);
  assert.equal(result.category, "");
  assert.equal(result.sort, "default");
  const empty = getDemoList([], new URLSearchParams("page=3"));
  assert.equal(empty.page, 1);
  assert.equal(empty.pages, 1);
  assert.deepEqual(empty.rows, []);
  const removed = getDemoList(initialDemoProducts.slice(0, 10), new URLSearchParams("page=3"));
  assert.equal(removed.page, 2);
});

for (const [url, heading, content] of [
  ["/demo", "UI Demo", "Нийт бүртгэл"],
  ["/demo/list", "Жишээ жагсаалт", "Toyota Land Cruiser 300"],
  ["/demo/form", "Жишээ форм", "Бүртгэл нэмэх"],
  ["/demo/form?id=demo-001", "Жишээ форм", "Бүртгэл засах"],
  ["/demo/form?id=not-found", "Жишээ форм", "Жишээ бүртгэл олдсонгүй"],
]) {
  test(`demo direct entry ${url}`, async (t) => {
    const router = createMemoryRouter(routes, { initialEntries: [url] });
    t.after(() => router.dispose());
    await router.navigate(url, { replace: true });
    const html = renderToStaticMarkup(<MantineProvider env="test"><RouterProvider router={router} /></MantineProvider>);
    assert.match(html, new RegExp(`<h1[^>]*>${heading}</h1>`));
    assert.ok(html.includes(content));
    assert.ok(html.includes("Жишээ өгөгдөл"));
    assert.equal(html.match(/class="demo-body(?=["\s])/g)?.length, 1);
    assert.equal(html.includes("demo-body-form"), url.startsWith("/demo/form"));
    assert.match(html, /<a[^>]*aria-current="page"[^>]*href="\/demo"/);
  });
}
