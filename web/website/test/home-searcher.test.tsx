import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import HomeSearcher from "../src/components/home.searcher/index";

test("home search UI starts collapsed, uses accessible fields and has no navigation target", () => {
  const html = renderToStaticMarkup(<HomeSearcher />);
  assert.match(html, /aria-label="Автомашин хайх"/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /hidden=""/);
  assert.match(html, /type="submit"/);
  assert.match(html, /type="reset"/);
  assert.match(html, /aria-label="Гүйлт \(км\): доод"/);
  assert.match(html, /aria-label="Гүйлт \(км\): дээд"/);
  assert.match(html, /name="brand" disabled=""/);
  assert.match(html, /name="model" disabled=""/);
  assert.doesNotMatch(html, /action=|href=|\/vehicles/);
});
