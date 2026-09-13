import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import HomeCarousel from "../src/components/home.carousel/index";
import { toHomeSlides } from "../src/server/home-slides";

const item = {
  id: "item-1", imageId: "00000000-0000-4000-8000-000000000001", originalName: "зураг 1.jpg",
  label: "<p>Шинэ</p>", title: "<p>BigMotors <strong>каталог</strong></p>", desc: "<p>Тайлбар <a href='/vehicles'>үзэх</a></p>",
  linkUrl: "/vehicles", linkLabel: "Каталог үзэх",
};

test("home slide mapping keeps order, encodes file names and supplies only presentation fields", () => {
  const slides = toHomeSlides([item, { ...item, id: "item-2", linkUrl: null, linkLabel: null }]);
  assert.deepEqual(slides.map((slide) => slide.id), ["item-1", "item-2"]);
  assert.equal(slides[0]!.imageUrl, `/files/${item.imageId}/${encodeURIComponent(item.originalName)}`);
  assert.equal(slides[0]!.titleHtml, item.title);
  assert.equal(slides[0]!.linkUrl, "/vehicles");
  assert.equal(slides[1]!.linkUrl, null);
  assert.equal(slides[1]!.linkLabel, "Дэлгэрэнгүй");
  assert.equal("imageId" in slides[0]!, false);
});

test("gallery HTML allows editor formatting but strips executable content, attributes and unsafe links", () => {
  const [slide] = toHomeSlides([{
    ...item,
    title: '<p onclick="evil()" style="color:red">Title<strong>bold</strong><script>alert(1)</script><img src=x onerror=evil()></p>',
    desc: '<iframe srcdoc="bad"></iframe><svg onload="evil()"></svg><a href="javascript:evil()">bad</a><a href="//evil.test">bad</a><a href="/vehicles">safe</a>',
    label: '<p class="hidden">Label</p>', linkUrl: "javascript:evil()", linkLabel: '<img src=x onerror="evil()">',
  }]);
  assert.equal(slide!.titleHtml, "<p>Title<strong>bold</strong></p>");
  assert.equal(slide!.labelHtml, "<p>Label</p>");
  assert.equal(slide!.linkUrl, null);
  assert.doesNotMatch(slide!.descriptionHtml, /iframe|svg|javascript|onload|evil\.test/);
  assert.match(slide!.descriptionHtml, /href="\/vehicles"/);
  assert.equal(toHomeSlides([{ ...item, title: "<p><br></p>", label: "<p>&nbsp;</p>" }])[0]!.titleHtml, "");
  assert.equal(toHomeSlides([{ ...item, label: "<p>&nbsp;</p>" }])[0]!.labelHtml, "");
});

test("carousel SSR renders real images, sanitized HTML, CTA and hides inactive slide controls", () => {
  const slides = toHomeSlides([item, { ...item, id: "item-2" }]);
  const html = renderToStaticMarkup(<HomeCarousel slides={slides} />);
  assert.match(html, /aria-roledescription="carousel"/);
  assert.equal((html.match(/aria-roledescription="slide"/g) ?? []).length, 2);
  assert.equal((html.match(/inert=""/g) ?? []).length, 2);
  assert.match(html, /data-carousel-preview/);
  assert.match(html, /loading="eager"/); assert.match(html, /loading="lazy"/);
  assert.match(html, /fetchPriority="high"/i);
  assert.match(html, /<strong>каталог<\/strong>/);
  assert.match(html, /Каталог үзэх/); assert.match(html, /Дараах зураг/);
  assert.match(html, /aria-live="polite"/);
});

test("empty, single and large galleries render appropriate controls and optional content", () => {
  assert.equal(renderToStaticMarkup(<HomeCarousel slides={[]} />), "");
  const single = renderToStaticMarkup(<HomeCarousel slides={toHomeSlides([{ ...item, linkUrl: null, title: null, label: null, desc: null }])} />);
  assert.doesNotMatch(single, /<button|<a\s|<select|role="heading"/);
  assert.doesNotMatch(single, /data-carousel-preview/);
  assert.match(single, /<img/);
  const many = renderToStaticMarkup(<HomeCarousel slides={toHomeSlides(Array.from({ length: 10 }, (_, i) => ({ ...item, id: String(i) })))} />);
  assert.match(many, /<select[^>]+aria-label="Зураг сонгох"/);
  assert.equal((many.match(/<option\b/g) ?? []).length, 10);
  const fallback = renderToStaticMarkup(<HomeCarousel slides={toHomeSlides([{ ...item, linkLabel: "" }])} />);
  assert.match(fallback, /Дэлгэрэнгүй/);
});
