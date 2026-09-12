import assert from "node:assert/strict";
import { test } from "node:test";
import { MantineProvider } from "@mantine/core";
import { renderToStaticMarkup } from "react-dom/server";
import { SettingsForm } from "../src/pages/settings/SettingsForm";
import { ADMIN_SETTING_KEYS, settingsEntries, settingsValidation, settingsValues } from "../src/pages/settings/model";

test("settings form manages two keys and ignores legacy homepage values", () => {
  assert.deepEqual(ADMIN_SETTING_KEYS, ["siteTitle", "adminEmail"]);
  const entries = [{ key: "homepage", value: "legacy-page-id" }, { key: "unknown", value: "keep" }, { key: "siteTitle", value: "Title" }];
  const values = settingsValues(entries);
  assert.deepEqual(values, { siteTitle: "Title", adminEmail: "" });
  assert.deepEqual(settingsEntries(values), [{ key: "siteTitle", value: "Title" }, { key: "adminEmail", value: "" }]);
  const html = renderToStaticMarkup(<MantineProvider env="test"><SettingsForm entries={entries} onSave={async entries => entries} onBusy={() => {}} /></MantineProvider>);
  for (const label of ["Сайтын гарчиг", "Админы имэйл"]) assert.ok(html.includes(label));
  assert.match(html, /type="email"/);
  assert.doesNotMatch(html, /Нүүр хуудас|legacy-page-id|combobox|facebook|instagram|contact_phone/);
});

test("remaining settings keep email validation and length limits", () => {
  const values = settingsValues([]);
  assert.deepEqual(settingsValidation(values), {});
  assert.deepEqual(settingsValidation({ ...values, adminEmail: "admin@example.com" }), {});
  assert.ok(settingsValidation({ ...values, adminEmail: "bad" }).adminEmail);
  assert.ok(settingsValidation({ ...values, siteTitle: "a".repeat(256) }).siteTitle);
  assert.deepEqual(settingsValidation({ ...values, siteTitle: "a".repeat(255) }), {});
});
