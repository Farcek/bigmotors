import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import HomeSearchGrid from "../src/components/home.search.grid/index";
import { getVehicleSearchHref, homePageCount, readHomeSearchFilters } from "../src/components/home.searcher/model";

test("all vehicles link preserves filters, zero and URL encoding without home pagination", () => {
  const data = new FormData();
  data.set("mileage_min", "0");
  data.set("fuel", "hybrid");
  data.set("model", "загвар & 1");
  data.set("price_min", "  ");
  data.set("page", "3");
  data.set("columns", "6");
  const url = new URL(getVehicleSearchHref(readHomeSearchFilters(data)), "https://example.test");
  assert.equal(url.pathname, "/vehicles");
  assert.equal(url.searchParams.get("model"), "загвар & 1");
  assert.equal(url.searchParams.get("mileage_min"), "0");
  assert.equal(url.searchParams.get("fuel"), "hybrid");
  assert.equal(url.searchParams.has("price_min"), false);
  assert.equal(url.searchParams.has("page"), false);
  assert.equal(url.searchParams.has("columns"), false);
  assert.equal(getVehicleSearchHref({}), "/vehicles");
});

test("grid controls cap pagination to three and do not render vehicle cards", () => {
  const noop = () => {};
  const html = renderToStaticMarkup(<HomeSearchGrid filters={{ condition: "used" }} page={2} pageCount={12} columns={4} onConditionChange={noop} onPageChange={noop} onColumnsChange={noop} />);
  assert.equal((html.match(/aria-label="\d-р хуудас"/g) ?? []).length, 3);
  assert.match(html, /aria-label="2-р хуудас"[^>]*aria-current="page"/);
  assert.match(html, /aria-label="4 багана"[^>]*aria-pressed="true"/);
  assert.match(html, /href="\/vehicles\?condition=used"/);
  assert.doesNotMatch(html, /<article|<img/);
  assert.equal(homePageCount(0), 0);
  assert.equal(homePageCount(1), 1);
  assert.equal(homePageCount(2), 2);
  assert.equal(homePageCount(100), 3);
  assert.equal(homePageCount(Number.NaN), 0);
});
