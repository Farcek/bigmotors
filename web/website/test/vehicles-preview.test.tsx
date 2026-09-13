import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { VehiclesPreview } from "../src/components/vehicles.preview";
import { DEMO_LOOKUPS } from "./fixtures/vehicle-lookups";
import type { VehicleCatalogResult } from "../src/components/vehicles.preview/model";

const result: VehicleCatalogResult = { total: 6, page: 1, pageCount: 1, pageSize: 24, brandCounts: {}, items: Array.from({ length: 6 }, (_, i) => ({ id: `test-${i}`, title: `Vehicle ${i}`, imageUrl: `/test-image-${i}.jpg` })) };

test("catalog renders server-provided cards and real lookup props", () => {
  const html = renderToStaticMarkup(<VehiclesPreview lookups={DEMO_LOOKUPS} initialResult={result} />);
  for (const label of ["МАРК", "ЗАГВАР", "ХУВИЛБАР", "ТӨРӨЛ", "ҮНЭ (₮)", "ҮЙЛДВЭРЛЭСЭН ОН", "ТҮЛШ", "ХУРДНЫ ХАЙРЦАГ", "ГҮЙЛТ (КМ)", "ХӨДӨЛГҮҮР (CC)"]) assert.ok(html.includes(label));
  assert.equal((html.match(/<article\b/g) ?? []).length, 6);
  assert.match(html, /aria-controls="vehicle-preview-filters"/);
  assert.match(html, /aria-expanded="false"/);
  assert.doesNotMatch(html, /\/api\/|\/files\//);
  assert.doesNotMatch(html, /Хуудасны зам|Нүүр хуудас|overflow-y-auto|max-h-|sticky/);
  assert.doesNotMatch(html, /type="checkbox"/);
  for (const label of ["ХӨТЛӨГЧ", "Урд (FWD)", "Хойд (RWD)", "Бүх дугуй (AWD)", "4 дугуй (4WD)"]) assert.ok(html.includes(label));
  assert.doesNotMatch(html, /Автомашины жагсаалт|Жишээ өгөгдөл|Шинэ болон хуучин/);
  assert.match(html, /aria-label="Grid баганын тоо"/);
  for (const count of [2, 3, 4, 6]) assert.ok(html.includes(`aria-label="${count} багана"`));
  assert.ok(html.indexOf('aria-label="Grid баганын тоо"') < html.indexOf('Эрэмбэлэх'));
  assert.match(html, /min-h-dvh bg-search-surface text-search-text/);
  assert.doesNotMatch(html, /text-section-dark-text|bg-section-dark-bg|peer-checked:text-primary/);
  const cards = html.match(/<article\b[^>]*>/g) ?? [];
  assert.ok(cards.every((card) => card.includes("border border-catalog-border")));
});

test("preview brand is single-select and dependent selects start disabled", () => {
  const html = renderToStaticMarkup(<VehiclesPreview lookups={DEMO_LOOKUPS} />);
  const brands = html.match(/<input\b[^>]*name="brand"[^>]*>/g) ?? [];
  assert.equal(brands.length, 7);
  assert.ok(brands.every((input) => input.includes('type="radio"')));
  assert.equal(brands.filter((input) => input.includes('checked=""')).length, 1);
  for (const name of ["model", "variant"]) assert.match(html, new RegExp(`<select[^>]*name="${name}"[^>]*disabled=""`));
});
