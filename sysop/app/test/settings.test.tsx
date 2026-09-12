import assert from "node:assert/strict";
import { test } from "node:test";
import { MantineProvider } from "@mantine/core";
import { renderToStaticMarkup } from "react-dom/server";
import { Pages } from "@bigmotors/sysop-dti";
import { SettingsForm } from "../src/pages/settings/SettingsForm";
import { ADMIN_SETTING_KEYS, loadPublishedPages, settingsEntries, settingsValidation, settingsValues } from "../src/pages/settings/model";

const page: Pages.ListEntity = { id: "00000000-0000-4000-8000-000000000001", title: "Home", slug: "home", description: null, mainImageId: null, status: "published", publishedAt: "2026-09-13T00:00:00Z", createdAt: "2026-09-13T00:00:00Z", updatedAt: "2026-09-13T00:00:00Z" };
test("settings form manages only the three core keys", () => {
  assert.deepEqual(ADMIN_SETTING_KEYS, ["homepage", "siteTitle", "adminEmail"]);
  const values = settingsValues([{ key: "unknown", value: "keep" }, { key: "siteTitle", value: "Title" }]);
  assert.deepEqual(values, { homepage: "", siteTitle: "Title", adminEmail: "" });
  assert.equal(settingsEntries(values).length, 3); assert.ok(!settingsEntries(values).some(row => row.key === "unknown"));
  assert.deepEqual(settingsValidation({ ...values, homepage: page.id, adminEmail: "admin@example.com" }, [page], ""), {});
  assert.ok(settingsValidation({ ...values, adminEmail: "bad" }, [], "").adminEmail);
  assert.ok(settingsValidation({ ...values, homepage: "missing" }, [], "").homepage);
  assert.deepEqual(settingsValidation({ ...values, homepage: "retained" }, [], "retained"), {});
  const html = renderToStaticMarkup(<MantineProvider env="test"><SettingsForm entries={[]} pages={[page]} onSave={async entries => entries} onBusy={() => {}} /></MantineProvider>);
  for (const label of ["Нүүр хуудас", "Сайтын гарчиг", "Админы имэйл"]) assert.ok(html.includes(label));
  assert.match(html, /type="email"/); assert.doesNotMatch(html, /facebook|instagram|contact_phone/);
});
test("homepage options load beyond 100 rows and honor cancellation", async () => {
  const offsets: number[] = [];
  const rows = await loadPublishedPages(async offset => {
    offsets.push(offset);
    return offset === 0 ? Array.from({length:100}, (_, i) => ({ ...page, id: `page-${i}` })) : [{ ...page, id: "last" }, { ...page, id: "draft", status: "draft" }];
  }, new AbortController().signal);
  assert.deepEqual(offsets, [0,100]); assert.equal(rows.length, 101); assert.ok(rows.some(row => row.id === "last"));
  const controller = new AbortController(); controller.abort();
  await assert.rejects(loadPublishedPages(async () => { throw new Error("Should not fetch"); }, controller.signal), { name: "AbortError" });
});
