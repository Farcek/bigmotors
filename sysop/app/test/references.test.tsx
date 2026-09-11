import assert from "node:assert/strict";
import { test } from "node:test";
import { MantineProvider } from "@mantine/core";
import { DTIError } from "@napp/dti-core";
import { renderToStaticMarkup } from "react-dom/server";
import { matchRoutes } from "react-router";
import { referenceDefinitions } from "../src/pages/references/definitions";
import { ReferenceForm } from "../src/pages/references/ReferenceForm";
import { formPayload, initialValues, listAll, listState, parentOptions, referenceError, validateForm, type ReferenceRow } from "../src/pages/references/model";
import { routes } from "../src/router";

const id = "00000000-0000-4000-8000-000000000001";
const parentId = "00000000-0000-4000-8000-000000000002";
const base: ReferenceRow = { id, name: "QA", description: null, sortOrder: 0, isActive: false, createdAt: "2026-09-12T00:00:00.000Z", updatedAt: "2026-09-12T00:00:00.000Z" };

for (const def of Object.values(referenceDefinitions)) {
  test(`${def.slug}: route, validation, create/update/delete contracts`, async (t) => {
    assert.equal(matchRoutes(routes, `/references/${def.slug}`)?.at(-1)?.route.id, def.slug);
    const row = { ...base, ...(def.parent ? { [def.parent.key]: parentId } : {}) };
    const values = { ...initialValues(def, row), name: " QA " };
    assert.equal(values.isActive, false);
    assert.deepEqual(validateForm(def, values, false), {});
    assert.ok(validateForm(def, { ...values, name: " " }, false).name);
    assert.ok(validateForm(def, { ...values, description: "x".repeat(513) }, false).description);
    assert.ok(validateForm(def, { ...values, sortOrder: 2147483648 }, false).sortOrder);
    assert.ok(validateForm(def, { ...values, sortOrder: "" }, false).sortOrder);
    if (def.parent && !def.parent.optional) assert.ok(validateForm(def, { ...values, parent: null }, false).parent);
    const editing = formPayload(def, values, true);
    assert.deepEqual(Object.keys(editing).sort(), ["description", "isActive", "name", "sortOrder"]);
    const calls: string[] = [];
    t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(String(input), "http://localhost");
      const method = init?.method ?? "GET";
      assert.equal(init?.cache, "no-store");
      assert.equal(url.pathname, `/api/${def.slug}${method === "PATCH" || method === "DELETE" ? `/${id}` : ""}`);
      calls.push(method);
      if (method === "POST" || method === "PATCH") {
        const body = JSON.parse(String(init?.body));
        assert.equal(body.name, "QA");
        assert.equal(body.description, null);
        assert.equal(body.isActive, false);
        if (def.parent) assert.equal(body[def.parent.key], method === "POST" ? parentId : undefined);
      }
      return new Response(JSON.stringify({ success: true, data: method === "GET" ? [row] : row }));
    });
    assert.equal((await def.list({ limit: 21, offset: 0 }))[0].id, id);
    await def.create(formPayload(def, values, false));
    await def.update(id, editing);
    await def.remove(id);
    assert.deepEqual(calls, ["GET", "POST", "PATCH", "DELETE"]);
  });
}

test("parent creation options include ancestry and reject inactive, missing or cyclic ancestry", () => {
  const brand = { ...base, id: parentId, name: "Brand", isActive: true };
  const model = { ...base, name: "Model", brandId: parentId, isActive: true };
  assert.deepEqual(parentOptions([model], [brand]), [{ value: id, label: "Brand / Model", disabled: false }]);
  assert.equal(parentOptions([model, model], [brand]).length, 1);
  assert.equal(parentOptions([model], [{ ...brand, isActive: false }])[0].disabled, true);
  assert.equal(parentOptions([model])[0].disabled, true);
  assert.equal(parentOptions([{ ...model, brandId: id }])[0].disabled, true);
  const category = { ...base, isActive: true, parentId };
  assert.equal(parentOptions([category, { ...brand, parentId: null }])[0].disabled, false);
  assert.equal(parentOptions([category, { ...brand, parentId: id }])[0].disabled, true);
});

test("lookup loading paginates beyond the first 100 rows and supports cancellation", async () => {
  const offsets: number[] = [];
  const def = { ...referenceDefinitions.branches, list: async (query: unknown) => {
    const { offset } = query as { offset: number };
    offsets.push(offset);
    return Array.from({ length: offset === 0 ? 100 : 1 }, () => base);
  } };
  assert.equal((await listAll(def, new AbortController().signal)).length, 101);
  assert.deepEqual(offsets, [0, 100]);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(listAll(def, controller.signal));
  assert.deepEqual(offsets, [0, 100]);
});

test("query normalizes invalid state and keeps rootOnly mutually exclusive with parentId", () => {
  const def = referenceDefinitions["part-categories"];
  const state = listState(def, new URLSearchParams(`page=2&parentId=${parentId}&rootOnly=true&isActive=false`));
  assert.equal(state.rootOnly, false);
  assert.deepEqual(state.query, { limit: 21, offset: 20, isActive: false, parentId });
  assert.equal(listState(def, new URLSearchParams("rootOnly=true")).rootOnly, true);
  assert.equal(listState(def, new URLSearchParams("parentId=invalid&page=-1&isActive=no")).parent, null);
  assert.equal(listState(def, new URLSearchParams("page=1.5")).page, 1);
});

test("errors hide internal details and explain parent and deletion constraints", () => {
  for (const code of ["VEHICLE_MODEL_PARENT_INACTIVE", "PART_CATEGORY_PARENT_NOT_FOUND", "BRANCH_IN_USE", "TIRE_MODEL_NAME_CONFLICT"]) {
    const message = referenceError(new DTIError("private", { code }));
    assert.doesNotMatch(message, /private/);
    assert.notEqual(message, referenceError(new Error("private")));
  }
  assert.doesNotMatch(referenceError(new DTIError("private", { code: "DB_SECRET" })), /private|DB_SECRET/);
});

test("editing preserves immutable parent and a root category can be created without one", () => {
  const def = referenceDefinitions["part-categories"];
  const values = { ...initialValues(def), name: "Root" };
  assert.deepEqual(validateForm(def, values, false), {});
  assert.equal((def.createSchema.parse(formPayload(def, values, false)) as { parentId: null }).parentId, null);
  const html = renderToStaticMarkup(<MantineProvider env="test"><ReferenceForm definition={def} row={{ ...base, parentId }} options={[{ value: parentId, label: "Parent", disabled: true }]} optionsLoading={false} optionsError="" reloadOptions={() => {}} saving={false} onSavingChange={() => {}} onSave={async () => {}} onCancel={() => {}} /></MantineProvider>);
  assert.match(html, /Дээд ангилал/);
  assert.match(html, /value="Parent"[^>]*disabled|disabled[^>]*value="Parent"/);
});
