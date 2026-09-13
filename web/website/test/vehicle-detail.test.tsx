import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { VehicleDetail } from "../src/components/vehicle.detail";
import { VehicleGallery } from "../src/components/vehicle.detail/gallery";
import { VehicleActions } from "../src/components/vehicle.detail/actions";
import { demoVehicles, getDemoVehicle } from "./fixtures/vehicle-detail";
import { vehicleSpecifications, type VehicleDetailData } from "../src/components/vehicle.detail/model";

const empty: VehicleDetailData = { id: "empty", title: "Автомашин", photos: [], features: [] };

test("detail actions contain only compare and share", () => {
  const html = renderToStaticMarkup(<VehicleActions title="Toyota 4Runner" />);
  assert.equal((html.match(/<button\b/g) ?? []).length, 2);
  assert.equal((html.match(/aria-pressed="false"/g) ?? []).length, 1);
  for (const label of ["Харьцуулах", "Хуваалцах"]) assert.ok(html.includes(label));
  assert.doesNotMatch(html, /Хадгалах|Хэвлэх/);
  assert.match(html, /role="status"/);
  assert.doesNotMatch(html, /Холбоос хууллаа/);
});

test("detail uses schema fields, keeps zero mileage, and omits absent or electric engine values", () => {
  assert.deepEqual(vehicleSpecifications(empty), []);
  assert.deepEqual(vehicleSpecifications({ ...empty, mileageKm: 0, fuelType: "electric", engineCapacityCc: 4000 }), [["Гүйлт", "0 км"], ["Түлш", "Цахилгаан"]]);
  const rows = vehicleSpecifications(getDemoVehicle("demo-4runner"));
  assert.ok(rows.some(([label, value]) => label === "Хөтлөгч" && value === "4WD"));
});

test("detail renders optional content, real company address and existing related cards", () => {
  const html = renderToStaticMarkup(<VehicleDetail item={demoVehicles[0]!} related={demoVehicles.slice(1)} />);
  for (const text of ["Техникийн үзүүлэлт", "Тоноглол", "Тайлбар", "БЗД 16-р хороолол", "Танд санал болгох"]) assert.ok(html.includes(text));
  assert.equal((html.match(/<article\b/g) ?? []).length, 4);
  assert.match(html, /href="\/vehicles\/demo-rav4"/);
  assert.doesNotMatch(html, /Автомашинууд/);
  assert.ok(html.indexOf("Автомашины зургууд") < html.indexOf("<h1"));
  assert.ok(html.indexOf("145,000,000") < html.indexOf("Автомашины үйлдлүүд"));
  assert.doesNotMatch(html, /<form|tel:|Verified Dealer|9999|<iframe/);
});

test("missing detail fields render no empty feature, description, related or pricing sections", () => {
  const html = renderToStaticMarkup(<VehicleDetail item={empty} />);
  assert.match(html, /зураг байхгүй|Үзүүлэлт оруулаагүй/);
  assert.doesNotMatch(html, /vehicle-features-heading|vehicle-description-heading|vehicle-related-heading|Лизингээр|₮|undefined|null/);
});

test("inquiry price stays private and description is escaped, not executed", () => {
  const html = renderToStaticMarkup(<VehicleDetail item={{ ...empty, priceDisplayMode: "inquire", price: 123456789, description: "<script>alert(1)</script>" }} />);
  assert.match(html, /Үнэ асуух/);
  assert.doesNotMatch(html, /123456789|123,456,789|<script/);
  assert.match(html, /&lt;script&gt;/);
});

test("gallery hides meaningless controls for one image and provides accessible multi-image controls", () => {
  const photo = demoVehicles[0]!.photos[0]!;
  const one = renderToStaticMarkup(<VehicleGallery title="Car" photos={[photo]} />);
  assert.match(one, /Зураг томруулах/);
  assert.match(one, /aspect-\[4\/3\]/);
  assert.doesNotMatch(one, /aspect-\[3\/2\]|lg:grid-cols/);
  assert.match(renderToStaticMarkup(<VehicleGallery title="Car" photos={[]} />), /aspect-\[4\/3\]/);
  assert.doesNotMatch(one, /Өмнөх зураг|Дараах зураг|aria-pressed/);
  const many = renderToStaticMarkup(<VehicleGallery title="Car" photos={[photo, { ...photo, alt: "Second test photo" }]} />);
  assert.match(many, /aria-pressed="true"/);
  assert.match(many, /aria-label="Зураг 2"/);
  assert.match(many, /Өмнөх зураг/);
  assert.match(many, /aria-modal="true"/);
  assert.match(many, /lg:grid-cols-\[minmax\(0,1fr\)_88px\]/);
  assert.match(many, /lg:overflow-y-auto/);
});

test("detail only offers a video when the URL is a valid YouTube link", () => {
  const valid = renderToStaticMarkup(<VehicleDetail item={{ ...empty, youtubeUrl: "https://youtu.be/dQw4w9WgXcQ" }} />);
  assert.match(valid, /YouTube|Видео/);
  const invalid = renderToStaticMarkup(<VehicleDetail item={{ ...empty, youtubeUrl: "javascript:alert(1)" }} />);
  assert.doesNotMatch(invalid, /javascript:|Видео/);
});
