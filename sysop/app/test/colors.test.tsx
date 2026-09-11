import assert from "node:assert/strict";
import { test } from "node:test";
import { Colors } from "@bigmotors/sysop-dti";
import { DTIError } from "@napp/dti-core";
import { MantineProvider } from "@mantine/core";
import { renderToStaticMarkup } from "react-dom/server";
import { ColorForm } from "../src/pages/colors/ColorForm";
import { apiClient } from "../src/api/client";
import { colorErrorMessage, colorInitialValues, colorListState, validateColorForm } from "../src/pages/colors/model";

test("color defaults and editing preserve false, zero and nullable fields", () => {
  assert.deepEqual(colorInitialValues(), { name: "", hexCode: "", description: "", sortOrder: 0, isActive: true });
  const color = Colors.entity.parse({ id: "00000000-0000-4000-8000-000000000001", name: "White", hexCode: null, description: null, sortOrder: 0, isActive: false, createdAt: "2026-09-12T00:00:00.000Z", updatedAt: "2026-09-12T00:00:00.000Z" });
  assert.deepEqual(colorInitialValues(color), { name: "White", hexCode: "", description: "", sortOrder: 0, isActive: false });
});

test("color validation follows the shared contract and field boundaries", () => {
  const valid = { ...colorInitialValues(), name: "White" };
  assert.deepEqual(validateColorForm(valid), {});
  for (const [field, value] of [["name", "  "], ["name", "x".repeat(256)], ["hexCode", "#fff"], ["description", "x".repeat(513)], ["sortOrder", ""], ["sortOrder", 1.5], ["sortOrder", 2147483648], ["sortOrder", -2147483649]] as const) {
    assert.ok(validateColorForm({ ...valid, [field]: value })[field], `${field}: ${value}`);
  }
  assert.deepEqual(validateColorForm({ ...valid, name: "x".repeat(255), description: "x".repeat(512), hexCode: "#aAbB09", sortOrder: -2147483648 }), {});
});

test("payload trims text and sends null when optional fields are cleared", () => {
  assert.deepEqual(Colors.createBody.parse({ ...colorInitialValues(), name: " White ", description: "  ", hexCode: " " }), { name: "White", description: null, hexCode: null, sortOrder: 0, isActive: true });
});

test("list query is bounded and rejects unsupported filter values", () => {
  for (const page of ["0", "-1", "NaN", "1.5", "Infinity"]) assert.equal(colorListState(new URLSearchParams({ page })).page, 1);
  assert.deepEqual(colorListState(new URLSearchParams("page=2&isActive=false")), { page: 2, status: "false" });
  assert.equal(colorListState(new URLSearchParams("isActive=unknown")).status, "");
  assert.ok((colorListState(new URLSearchParams("page=9007199254740991")).page - 1) * 20 <= 2147483647);
});

test("server errors are actionable and do not expose internal details", () => {
  assert.match(colorErrorMessage(new DTIError("private", { code: "COLOR_NAME_CONFLICT" })), /Ижил нэртэй/);
  assert.match(colorErrorMessage(new DTIError("private", { code: "COLOR_IN_USE" })), /идэвхгүй/);
  assert.match(colorErrorMessage(new DTIError("private", { status: 403 })), /эрхгүй/);
  assert.doesNotMatch(colorErrorMessage(new Error("private password")), /private|password/);
});

test("form renders labelled fields and a pending submit state", () => {
  const html = renderToStaticMarkup(<MantineProvider env="test"><ColorForm saving onSavingChange={() => {}} onCancel={() => {}} onSave={async () => {}} /></MantineProvider>);
  for (const label of ["Өнгөний нэр", "HEX код", "Дараалал", "Тайлбар", "Идэвхтэй", "Хадгалах"]) assert.ok(html.includes(label));
  assert.match(html, /disabled/);
  assert.match(html, /maxlength="255"/i);
  assert.match(html, /maxlength="512"/i);
});

test("DTI client calls fetch without binding its receiver and preserves request options", async (t) => {
  let calls = 0;
  const controller = new AbortController();
  t.mock.method(globalThis, "fetch", async function (this: unknown, input: string | URL | Request, init?: RequestInit) {
    assert.ok(this === undefined || this === globalThis);
    assert.equal(input, "/api/colors?limit=21&offset=0&isActive=false");
    assert.equal(init?.cache, "no-store");
    assert.equal(init?.signal, controller.signal);
    assert.equal(init?.method, "GET");
    calls++;
    return new Response(JSON.stringify({ success: true, data: [] }), { headers: { "Content-Type": "application/json" } });
  });
  assert.deepEqual(await apiClient.call(Colors.list, { query: { limit: 21, offset: 0, isActive: false } }, { signal: controller.signal }), []);
  assert.equal(calls, 1);
});
