import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MantineProvider } from "@mantine/core";
import { PageForm } from "../src/pages/pages/PageForm";
import { pageError, pageFormValues, pageNumber, pagePayload, validatePageForm } from "../src/pages/pages/model";

test("page form JSON validation, publication and payload preserve nested values", () => {
  const values = { ...pageFormValues(), title: "A", slug: "a" };
  assert.deepEqual(validatePageForm(values), {});
  assert.deepEqual(pagePayload(values).content, {});
  assert.ok(validatePageForm({ ...values, status: "published" }).content);
  for (const content of ["", "{", "null", "[]", '"text"']) assert.ok(validatePageForm({ ...values, content }).content);
  assert.ok(validatePageForm({ ...values, meta: "false" }).meta);
  assert.ok(validatePageForm({ ...values, slug: "bad/slug" }).slug);
  const content = { blocks: [{ text: "Text", enabled: false, count: 0 }], value: null };
  const published = { ...values, status: "published" as const, content: JSON.stringify(content) };
  assert.deepEqual(validatePageForm(published), {}); assert.deepEqual(pagePayload(published).content, content);
  assert.equal(pagePayload({ ...values, description: " " }).description, null);
  assert.equal(pagePayload(values).mainImageId, null);
});
test("page form uses three tabs with JSON inputs and no builder", () => {
  const html = renderToStaticMarkup(<MantineProvider env="test"><PageForm onSave={async () => {}} onCancel={() => {}} /></MantineProvider>);
  for (const label of ["Үндсэн", "Агуулга", "Meta", "Гарчиг", "Slug", "Төлөв", "Хадгалах"]) assert.ok(html.includes(label));
  assert.equal((html.match(/role="tab"/g) ?? []).length, 3);
  assert.doesNotMatch(html, /contenteditable|Puck/);
  assert.ok(html.includes("Агуулга (JSON)"));
});
test("page list state bounds pagination and hides internal errors", () => {
  for (const page of ["-1", "0", "NaN", "1.5"]) assert.equal(pageNumber(new URLSearchParams({page})), 1);
  assert.equal(pageNumber(new URLSearchParams("page=2")), 2);
  assert.doesNotMatch(pageError(new Error("secret")), /secret/);
});
