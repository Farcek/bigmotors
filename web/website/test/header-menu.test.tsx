import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { HeaderMenu } from "../src/components/header/menu";

test("header menu starts closed and exposes a labelled native modal and static navigation", () => {
  const html = renderToStaticMarkup(<HeaderMenu className="trigger" logo={<a href="/">BigMotors LLC</a>} icon={<span>Menu</span>} />);
  assert.match(html, /aria-haspopup="dialog"/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /<dialog[^>]*aria-label="Үндсэн цэс"[^>]*aria-modal="true"/);
  assert.doesNotMatch(html, /<dialog[^>]*\bopen(?:\s|=|>)/);
  assert.match(html, /aria-label="Цэс хаах"/);
  assert.match(html, /aria-label="Үндсэн цэсний холбоосууд"/);
  for (const href of ["/vehicles", "/parts", "/tires", "#footer-about", "#footer-address"]) assert.ok(html.includes(`href="${href}"`));
  assert.match(html, /БЗД 16-р хороолол/);
  assert.doesNotMatch(html, /20 орчим жилийн|mailto:|tel:|href="#"/);
});
