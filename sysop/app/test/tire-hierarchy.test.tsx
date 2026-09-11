import assert from "node:assert/strict";
import { test } from "node:test";
import { MantineProvider } from "@mantine/core";
import { renderToStaticMarkup } from "react-dom/server";
import { createMemoryRouter, matchRoutes, RouterProvider } from "react-router";
import { ReferenceForm } from "../src/pages/references/ReferenceForm";
import { formPayload, initialValues, listAll, type ReferenceRow } from "../src/pages/references/model";
import { canCreate, levels, selectBrand, selectedBrandId } from "../src/pages/references/tire-hierarchy/model";
import { routes } from "../src/router";

const brandId = "00000000-0000-4000-8000-000000000001";
const brand: ReferenceRow = { id: brandId, name: "QA Tire Brand", description: null, isActive: true, sortOrder: 0,
  createdAt: "2026-09-12T00:00:00.000Z", updatedAt: "2026-09-12T00:00:00.000Z" };

test("tire selection validates IDs and preserves unrelated query parameters", () => {
  const params = new URLSearchParams({ other: "keep" });
  assert.equal(selectedBrandId(params), null);
  assert.equal(selectedBrandId(new URLSearchParams({ brandId: "invalid" })), null);
  const selected = selectBrand(params, brandId);
  assert.equal(selectedBrandId(selected), brandId);
  assert.equal(selected.get("other"), "keep");
  assert.equal(params.has("brandId"), false);
  assert.equal(selectBrand(selected, null).toString(), "other=keep");
});

test("tire model creation needs an active brand and uses tire contracts", () => {
  assert.equal(canCreate("brand"), true);
  assert.equal(canCreate("model"), false);
  assert.equal(canCreate("model", brand), true);
  assert.equal(canCreate("model", { ...brand, isActive: false }), false);
  assert.equal(levels.brand.definition.slug, "tire-brands");
  assert.equal(levels.model.definition.slug, "tire-models");
  const values = { ...initialValues(levels.model.definition), name: "QA Model", parent: brandId };
  const payload = formPayload(levels.model.definition, values, false);
  assert.ok("brandId" in payload);
  assert.equal(payload.brandId, brandId);
  assert.equal("brandId" in formPayload(levels.model.definition, values, true), false);
});

test("tire model form prefills and locks the brand without a parent refresh control", () => {
  const html = renderToStaticMarkup(<MantineProvider env="test"><ReferenceForm definition={levels.model.definition}
    fixedParent={{ value: brandId, label: brand.name, disabled: false }} options={[]} optionsLoading={false} optionsError=""
    reloadOptions={() => {}} saving={false} onSavingChange={() => {}} onSave={async () => {}} onCancel={() => {}} /></MantineProvider>);
  assert.match(html, /value="QA Tire Brand"[^>]*disabled|disabled[^>]*value="QA Tire Brand"/);
  assert.ok(html.includes(`value="${brandId}"`));
  assert.doesNotMatch(html, /aria-label="Сонголт шинэчлэх"/);
});

test("all tire model batches retain the selected brand filter", async () => {
  const queries: unknown[] = [];
  const model = { ...brand, brandId };
  const definition = { ...levels.model.definition, list: async (query: unknown) => {
    queries.push(query);
    return queries.length === 1 ? Array.from({ length: 100 }, () => model) : [model];
  } };
  assert.equal((await listAll(definition, new AbortController().signal, { brandId })).length, 101);
  assert.deepEqual(queries, [{ brandId, limit: 100, offset: 0 }, { brandId, limit: 100, offset: 100 }]);
});

test("tire hierarchy renders two columns, restores URL history and keeps old routes", async (t) => {
  const router = createMemoryRouter(routes, { initialEntries: ["/"] });
  t.after(() => router.dispose());
  await router.navigate(`/references/tire-hierarchy?brandId=${brandId}`);
  const html = renderToStaticMarkup(<MantineProvider env="test"><RouterProvider router={router} /></MantineProvider>);
  for (const title of ["Брэнд", "Загвар"]) {
    for (const suffix of ["багана", "нэмэх", "шинэчлэх"]) assert.ok(html.includes(`aria-label="${title} ${suffix}"`));
  }
  assert.doesNotMatch(html, /Хувилбар багана|Марк сонгоно уу/);
  await router.navigate("/references");
  await router.navigate(-1);
  assert.equal(selectedBrandId(new URLSearchParams(router.state.location.search)), brandId);
  for (const path of ["/references/tire-brands", "/references/tire-models"]) {
    assert.notEqual(matchRoutes(routes, path)?.at(-1)?.route.id, "not-found");
  }
});
