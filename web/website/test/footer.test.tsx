import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { SiteFooter } from "../src/components/footer";

test("static footer provides four menu groups, supplied address and company introduction", () => {
  const html = renderToStaticMarkup(<SiteFooter />);
  assert.equal((html.match(/<h2\b/g) ?? []).length, 4);
  assert.match(html, /<nav aria-label="Footer цэс"/);
  for (const href of ["/vehicles", "/parts", "/tires", "/vehicles?condition=new", "/vehicles?fuel=electric", "#footer-address", "#footer-about"]) assert.ok(html.includes(`href="${href}"`), href);
  assert.match(html, /БЗД 16-р хороолол/);
  assert.match(html, /Да Хүрээ явах зам дагуу BIG Motors auto showroom/);
  assert.equal((html.match(/автомашины дилер компани/g) ?? []).length, 1);
  assert.doesNotMatch(html, /COMPANY NAME|mailto:|tel:|href="#"/);
  assert.match(html, /id="footer-address"/); assert.match(html, /id="footer-about"/);
});
