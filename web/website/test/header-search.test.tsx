import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { HeaderSearch } from "../src/components/header/search";
import HomeSearcher from "../src/components/home.searcher";

test("header search starts closed with only the four basic filter groups", () => {
  const html = renderToStaticMarkup(<HeaderSearch className="trigger" logo={<a href="/">BigMotors LLC</a>} icon={<span>Search</span>} />);
  assert.match(html, /aria-haspopup="dialog"/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /<dialog[^>]*aria-label="Автомашины хайлт"[^>]*aria-modal="true"/);
  assert.doesNotMatch(html, /<dialog[^>]*\bopen(?:\s|=|>)/);
  assert.match(html, /aria-label="Хайлт хаах"/);
  for (const name of ["brand", "model", "mileage_min", "mileage_max", "engine_min", "engine_max"]) assert.ok(html.includes(`name="${name}"`));
  assert.doesNotMatch(html, /Дэлгэрэнгүй хайлт|Цэвэрлэх|name="price_min"|name="fuel"/);
});

test("home search keeps its advanced controls by default", () => {
  const html = renderToStaticMarkup(<HomeSearcher />);
  assert.match(html, /Дэлгэрэнгүй хайлт/);
  assert.match(html, /Цэвэрлэх/);
  assert.match(html, /name="price_min"/);
});
