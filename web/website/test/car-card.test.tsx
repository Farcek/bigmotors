import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { getYouTubeVideoUrl } from "@bigmotors/core";
import CarCardItem from "../src/components/car.card/index";
import { formatCarPrice, resolveCarCard, type CarCardData } from "../src/components/car.card/model";

const item: CarCardData = { id: "car-1", title: "Автомашин", description: "Үндсэн тайлбар", imageUrl: "/files/image/original.jpg" };

test("card resolves item overrides independently without changing the input", () => {
  assert.deepEqual(resolveCarCard({ ...item, itemTitle: " Карт ", itemDesc: " ", itemImageUrl: "/files/item/item.jpg" }), {
    title: "Карт", description: item.description, imageUrl: "/files/item/item.jpg", href: "/vehicles/car-1",
  });
  assert.equal(item.title, "Автомашин");
});

test("card omits absent details, optional actions and preserves real zero mileage", () => {
  const html = renderToStaticMarkup(<CarCardItem item={{ id: "1", title: "Test", mileageKm: 0 }} />);
  assert.match(html, /0 км/);
  assert.match(html, /зураг байхгүй/);
  assert.doesNotMatch(html, /<button|Лизингтэй|YouTube|Үнэ асуух|₮/);
  assert.doesNotMatch(html, /undefined|null/);
});

test("price format is opt-in and inquiry mode never exposes the stored price", () => {
  assert.equal(formatCarPrice(84_500_000), "84,500,000");
  assert.equal(formatCarPrice(84_500_000, true), "84.5 сая");
  assert.equal(formatCarPrice(500_000, true), "500,000");
  assert.equal(formatCarPrice(999_999_999, true), "1 тэрбум");
  const priced = { ...item, price: 84_500_000, priceDisplayMode: "show_price" as const };
  assert.match(renderToStaticMarkup(<CarCardItem item={priced} compactPrice />), /84.5 сая/);
  const inquiry = renderToStaticMarkup(<CarCardItem item={{ ...priced, priceDisplayMode: "inquire" }} />);
  assert.match(inquiry, /Үнэ асуух/);
  assert.doesNotMatch(inquiry, /84,500,000|84.5/);
});

test("spec limits apply after missing values are omitted and zero removes the section", () => {
  const data: CarCardData = { ...item, manufactureYear: 2020, mileageKm: 0, transmission: "automatic", engineCapacityCc: 2000 };
  for (const count of [0, 2, 3, 4]) {
    const html = renderToStaticMarkup(<CarCardItem item={data} maxSpecCount={count} />);
    assert.equal((html.match(/<dt>/g) ?? []).length, count);
    if (count === 0) assert.doesNotMatch(html, /<dl/);
  }
  const sparse = renderToStaticMarkup(<CarCardItem item={{ ...data, manufactureYear: null }} maxSpecCount={2} />);
  assert.match(sparse, /0 км/);
  assert.match(sparse, /Хурдны хайрцаг/);
  assert.doesNotMatch(sparse, /2,000 cc/);
  assert.equal((renderToStaticMarkup(<CarCardItem item={data} />).match(/<dt>/g) ?? []).length, 4);
});

test("hiding badges removes the empty footer but preserves favorite and price", () => {
  const data: CarCardData = { ...item, fuelType: "hybrid", financingAvailable: true, priceDisplayMode: "inquire" };
  const html = renderToStaticMarkup(<CarCardItem item={data} showBadges={false} />);
  assert.doesNotMatch(html, /Лизингтэй|Хайбрид|bg-card-subtle px-4 py-3/);
  assert.match(html, /Үнэ асуух/);
  const favorite = renderToStaticMarkup(<CarCardItem item={data} showBadges={false} favorite={{ selected: true, onToggle() {} }} />);
  assert.match(favorite, /aria-pressed="true"/);
  assert.doesNotMatch(favorite, /Лизингтэй|Хайбрид/);
});

test("fuel badge replaces barter; media and favorite actions are independent links/buttons", () => {
  const html = renderToStaticMarkup(<CarCardItem item={{ ...item, fuelType: "hybrid", imageCount: 8, financingAvailable: true, youtubeUrl: "https://youtu.be/abcdefghijk" }} favorite={{ selected: true, onToggle() {} }} />);
  assert.match(html, /Лизингтэй/); assert.match(html, /Хайбрид/);
  assert.doesNotMatch(html, /Бартер/);
  assert.match(html, /8 зураг/);
  assert.match(html, /aria-pressed="true"/);
  assert.match(html, /href="https:\/\/www.youtube.com\/watch\?v=abcdefghijk"/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.doesNotMatch(html, /<iframe/);
});

test("YouTube resolver accepts only individual videos on exact allowed HTTPS hosts", () => {
  for (const url of ["https://youtu.be/abcdefghijk?t=30", "https://www.youtube.com/watch?v=abcdefghijk&list=x", "https://m.youtube.com/shorts/abcdefghijk", "https://youtube.com/embed/abcdefghijk", "https://youtube.com/live/abcdefghijk"]) assert.equal(getYouTubeVideoUrl(url), "https://www.youtube.com/watch?v=abcdefghijk");
  for (const url of ["", "javascript:alert(1)", "https://youtube.com.evil.test/watch?v=abcdefghijk", "https://evil.test/abcdefghijk", "https://youtube.com/playlist?list=x", "https://youtu.be/short", "https://user@youtube.com/watch?v=abcdefghijk", "http://youtu.be/abcdefghijk", "https://youtube.com:8443/watch?v=abcdefghijk"]) assert.equal(getYouTubeVideoUrl(url), null);
});
