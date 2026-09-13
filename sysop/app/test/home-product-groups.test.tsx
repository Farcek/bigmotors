import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MantineProvider } from "@mantine/core";
import { GroupForm } from "../src/pages/website-home/GroupForm";
import { groupError, groupErrors, groupInitialValues, groupPage, groupRawBody } from "../src/pages/website-home/model";
import { navigationSections } from "../src/navigation";
import { routes } from "../src/router";

test("website homepage is a separate menu entry and route", () => {
  const section = navigationSections.find((item) => item.label === "Website");
  assert.ok(section?.items.some((item) => item.href === "/website/home"));
  assert.ok(routes[0]?.children?.some((route) => route.path === "website/home"));
});
test("group form maps empty filters away but preserves numeric zero", () => {
  const values = groupInitialValues(); values.title = "Electric";
  values.filters.fuel = "electric"; values.filters.mileage_min = 0;
  assert.deepEqual(groupRawBody(values).filters, { fuel: "electric", mileage_min: 0 });
  assert.deepEqual(groupErrors(values), {});
  values.filters.engine_min = 3000; values.filters.engine_max = 1000;
  assert.ok(groupErrors(values)["filters.engine_max"]);
  assert.doesNotMatch(groupError(new Error("private password")), /private|password/);
  assert.equal(groupPage(new URLSearchParams("page=-1")), 1);
});
test("home group form offers labelled controls rather than JSON editing", () => {
  const html = renderToStaticMarkup(<MantineProvider env="test"><GroupForm onBusy={() => {}} onSave={async () => {}} onCancel={() => {}} /></MantineProvider>);
  for (const label of ["Гарчиг", "Тайлбар", "Дараалал", "Идэвхтэй", "Марк", "Загвар", "Хувилбар", "Түлш", "Хөдөлгүүр: доод", "Үнэ: дээд", "Зураг нэмэх"]) assert.ok(html.includes(label), label);
  assert.doesNotMatch(html, /Зургийн ID|JSON/);
});
