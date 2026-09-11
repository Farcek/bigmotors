import assert from "node:assert/strict";
import { test } from "node:test";
import { MantineProvider } from "@mantine/core";
import { renderToStaticMarkup } from "react-dom/server";
import { createMemoryRouter, RouterProvider } from "react-router";
import { ReferenceForm } from "../src/pages/references/ReferenceForm";
import { HierarchyColumn } from "../src/pages/references/vehicle-hierarchy/HierarchyColumn";
import { listAll, type ReferenceRow } from "../src/pages/references/model";
import { canCreate, levels, selectBrand, selectModel, selection } from "../src/pages/references/vehicle-hierarchy/model";
import { routes } from "../src/router";

const brandId = "00000000-0000-4000-8000-000000000001";
const modelId = "00000000-0000-4000-8000-000000000002";
const otherId = "00000000-0000-4000-8000-000000000003";
const brand: ReferenceRow = { id: brandId, name: "QA Brand", description: null, isActive: true, sortOrder: 0, createdAt: "2026-09-12T00:00:00.000Z", updatedAt: "2026-09-12T00:00:00.000Z" };
const model = { ...brand, id: modelId, name: "QA Model", brandId };

test("rows expose a single menu trigger independently of row selection", () => {
  const html = renderToStaticMarkup(<MantineProvider env="test"><HierarchyColumn level="brand" title="Марк" context="Бүх марк"
    rows={[brand]} loading={false} error="" disabled={false} addDisabled={false} onRefresh={() => {}} onAdd={() => {}}
    onSelect={() => {}} onEdit={() => {}} onDelete={() => {}} /></MantineProvider>);
  assert.match(html, /aria-label="QA Brand үйлдэл"/);
  assert.match(html, /aria-haspopup="menu"/);
  assert.match(html, /aria-label="QA Brand сонгох"/);
  assert.doesNotMatch(html, /aria-label="QA Brand (засах|устгах)"/);
});

test("brand selection resets the model; invalid or parentless URL selections are ignored", () => {
  const params = new URLSearchParams({ brandId, modelId, other: "keep" });
  assert.deepEqual(selection(params), { brandId, modelId });
  assert.equal(selectBrand(params, otherId).get("modelId"), null);
  assert.equal(selectBrand(params, otherId).get("other"), "keep");
  assert.equal(params.get("brandId"), brandId);
  assert.deepEqual(selection(selectBrand(params, null)), { brandId: null, modelId: null });
  assert.deepEqual(selection(new URLSearchParams({ modelId })), { brandId: null, modelId: null });
  assert.deepEqual(selection(new URLSearchParams({ brandId: "invalid", modelId })), { brandId: null, modelId: null });
  assert.deepEqual(selection(selectModel(params, otherId)), { brandId, modelId: otherId });
});

test("Mantine rows retain selection semantics and variants only expose the action menu", () => {
  const common = { context: "QA Brand", rows: [brand], loading: false, error: "", disabled: false, addDisabled: false,
    onRefresh: () => {}, onAdd: () => {}, onEdit: () => {}, onDelete: () => {} };
  const selected = renderToStaticMarkup(<MantineProvider env="test"><HierarchyColumn {...common} level="brand" title="Марк"
    selectedId={brandId} onSelect={() => {}} /></MantineProvider>);
  assert.match(selected, /aria-pressed="true"/);
  assert.match(selected, /role="listitem"/);
  assert.match(selected, /title="QA Brand"/);
  assert.doesNotMatch(selected, /class="hierarchy-/);
  const variant = renderToStaticMarkup(<MantineProvider env="test"><HierarchyColumn {...common} level="variant" title="Хувилбар" /></MantineProvider>);
  assert.match(variant, /aria-label="QA Brand үйлдэл"/);
  assert.doesNotMatch(variant, /aria-pressed|QA Brand сонгох/);
});

test("creation requires active and matching ancestors but root brands have no parent requirement", () => {
  assert.equal(canCreate("brand"), true);
  assert.equal(canCreate("model"), false);
  assert.equal(canCreate("model", brand), true);
  assert.equal(canCreate("model", { ...brand, isActive: false }), false);
  assert.equal(canCreate("variant", brand), false);
  assert.equal(canCreate("variant", brand, model), true);
  assert.equal(canCreate("variant", brand, { ...model, brandId: otherId }), false);
  assert.equal(canCreate("variant", brand, { ...model, isActive: false }), false);
  assert.equal(canCreate("variant", { ...brand, isActive: false }, model), false);
});

test("every batch of a column's list request keeps its parent filter", async () => {
  const queries: unknown[] = [];
  const def = { ...levels.model.definition, list: async (query: unknown) => {
    queries.push(query);
    return queries.length === 1 ? Array.from({ length: 100 }, () => model) : [model];
  } };
  await listAll(def, new AbortController().signal, { brandId });
  assert.deepEqual(queries, [{ brandId, limit: 100, offset: 0 }, { brandId, limit: 100, offset: 100 }]);
});

test("new variant form prefills and locks model while displaying brand context", () => {
  const html = renderToStaticMarkup(<MantineProvider env="test"><ReferenceForm definition={levels.variant.definition}
    fixedParent={{ value: modelId, label: model.name, disabled: false }} contextFields={[{ label: "Автомашины марк", value: brand.name }]}
    options={[]} optionsLoading={false} optionsError="" reloadOptions={() => {}} saving={false} onSavingChange={() => {}} onSave={async () => {}} onCancel={() => {}} /></MantineProvider>);
  assert.match(html, /value="QA Model"[^>]*disabled|disabled[^>]*value="QA Model"/);
  assert.match(html, /value="QA Brand"[^>]*readonly|readonly[^>]*value="QA Brand"/i);
  assert.doesNotMatch(html, /aria-label="Сонголт шинэчлэх"/);
  assert.ok(html.includes(`value="${modelId}"`));
});

test("direct entry renders three columns and preserves query across navigation", async (t) => {
  const router = createMemoryRouter(routes, { initialEntries: ["/"] });
  t.after(() => router.dispose());
  await router.navigate(`/references/vehicle-hierarchy?brandId=${brandId}&modelId=${modelId}`);
  const html = renderToStaticMarkup(<MantineProvider env="test"><RouterProvider router={router} /></MantineProvider>);
  for (const title of ["Марк", "Загвар", "Хувилбар"]) {
    assert.ok(html.includes(`aria-label="${title} багана"`));
    assert.ok(html.includes(`aria-label="${title} нэмэх"`));
    assert.ok(html.includes(`aria-label="${title} шинэчлэх"`));
  }
  await router.navigate("/references");
  await router.navigate(-1);
  assert.deepEqual(selection(new URLSearchParams(router.state.location.search)), { brandId, modelId });
});
