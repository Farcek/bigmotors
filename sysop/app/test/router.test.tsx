import assert from "node:assert/strict";
import { test } from "node:test";
import { MantineProvider } from "@mantine/core";
import { renderToStaticMarkup } from "react-dom/server";
import { createMemoryRouter, matchRoutes, RouterProvider } from "react-router";
import { navigationSections } from "../src/navigation";
import { routes } from "../src/router";

function render(router: ReturnType<typeof createMemoryRouter>) {
  return renderToStaticMarkup(
    <MantineProvider env="test">
      <RouterProvider router={router} />
    </MantineProvider>,
  );
}

test("only implemented URLs resolve to pages; unknown and prefix URLs resolve to 404", () => {
  for (const [path, id] of [
    ["/", "home"],
    ["/references", "references"],
    ["/references/", "references"],
    ["/references?q=blue&page=2", "references"],
    ["/demo", "demo-index"],
    ["/demo/list", "demo-list"],
    ["/demo/form?id=demo-001", "demo-form"],
    ["/demo/missing", "not-found"],
    ["/references-other", "not-found"],
    ["/references/colors", "not-found"],
    ["/vehicles", "not-found"],
    ["/missing", "not-found"],
  ]) {
    assert.equal(matchRoutes(routes, path)?.at(-1)?.route.id, id, path);
  }
});

test("enabled menu destinations are implemented, not catch-all routes", () => {
  for (const section of navigationSections) {
    for (const item of section.items) {
      if ("disabled" in item && item.disabled) continue;
      const matches = matchRoutes(routes, item.href);
      assert.ok(matches);
      assert.notEqual(matches.at(-1)?.route.id, "not-found");
    }
  }
});

test("home renders inside the admin layout with exactly one active menu link", (t) => {
  const router = createMemoryRouter(routes, { initialEntries: ["/"] });
  t.after(() => router.dispose());
  const html = render(router);
  assert.match(html, /BigMotors Sysop/);
  assert.match(html, /<h1[^>]*>Home<\/h1>/);
  assert.match(html, /<a[^>]*aria-current="page"[^>]*href="\/"/);
  assert.equal(html.match(/aria-current="page"/g)?.length, 1);
  assert.doesNotMatch(html, /<a[^>]*href="\/vehicles"/);
});

test("references supports direct entry and displays its title and active menu", (t) => {
  const router = createMemoryRouter(routes, { initialEntries: ["/references"] });
  t.after(() => router.dispose());
  const html = render(router);
  assert.match(html, /<h1[^>]*>Лавлах<\/h1>/);
  assert.match(html, /Автомашины марк/);
  assert.match(html, /<a[^>]*aria-current="page"[^>]*href="\/references"/);
  assert.equal(html.match(/aria-current="page"/g)?.length, 1);
});

test("navigation, back and forward preserve URL query and route selection", async (t) => {
  const router = createMemoryRouter(routes, { initialEntries: ["/"] });
  t.after(() => router.dispose());
  await router.navigate("/references?q=blue&page=2");
  assert.equal(router.state.matches.at(-1)?.route.id, "references");
  assert.equal(router.state.location.search, "?q=blue&page=2");
  await router.navigate(-1);
  assert.equal(router.state.matches.at(-1)?.route.id, "home");
  await router.navigate(1);
  assert.equal(router.state.matches.at(-1)?.route.id, "references");
  assert.equal(router.state.location.search, "?q=blue&page=2");
});

test("404 keeps the layout and offers a home link", (t) => {
  const router = createMemoryRouter(routes, { initialEntries: ["/missing"] });
  t.after(() => router.dispose());
  const html = render(router);
  assert.match(html, /BigMotors Sysop/);
  assert.match(html, /<h1[^>]*>Хуудас олдсонгүй<\/h1>/);
  assert.match(html, /404/);
  assert.match(html, /Нүүр рүү очих/);
  assert.doesNotMatch(html, /aria-current="page"/);
});

test("route failures render a safe fallback without exposing the error", async (t) => {
  const router = createMemoryRouter([
    {
      ...routes[0],
      index: false,
      children: [
        ...routes[0].children!,
        {
          path: "broken",
          loader() { throw new Error("private-error-details"); },
        },
      ],
    },
  ]);
  t.after(() => router.dispose());
  await router.navigate("/broken");
  assert.ok(router.state.errors);
  const html = render(router);
  assert.match(html, /Хуудас ачаалж чадсангүй/);
  assert.match(html, /Нүүр рүү очих/);
  assert.doesNotMatch(html, /private-error-details/);
});
