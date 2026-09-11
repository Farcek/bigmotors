import assert from "node:assert/strict";
import { test } from "node:test";
import { MantineProvider, type TreeNodeData } from "@mantine/core";
import { renderToStaticMarkup } from "react-dom/server";
import { createMemoryRouter, RouterProvider } from "react-router";
import { CategoryTree } from "../src/pages/references/category-tree/CategoryTree";
import { categoryAncestors, categoryTreeData } from "../src/pages/references/category-tree/model";
import { ReferenceForm } from "../src/pages/references/ReferenceForm";
import { referenceDefinitions } from "../src/pages/references/definitions";
import type { ReferenceRow } from "../src/pages/references/model";
import { routes } from "../src/router";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const row = (n: number, parent: number | null = null): ReferenceRow => ({ id: id(n), name: `Category ${n}`, parentId: parent === null ? null : id(parent),
  description: null, sortOrder: n, isActive: true, createdAt: "2026-09-12T00:00:00.000Z", updatedAt: "2026-09-12T00:00:00.000Z" });

test("category tree maps all levels, sorts siblings and deduplicates without changing input", () => {
  const rows = [row(3, 2), row(4), row(2, 1), row(1), row(4)];
  const { data, invalidIds } = categoryTreeData(rows);
  assert.deepEqual(data.map((node) => node.value), [id(1), id(4)]);
  assert.equal(data[0].children?.[0].children?.[0].value, id(3));
  assert.equal(invalidIds.size, 0);
  assert.equal(rows[0].id, id(3));
  assert.deepEqual(categoryAncestors(id(3), rows), [id(1), id(2)]);
  assert.deepEqual(categoryTreeData([]).data, []);
});

test("orphans and cycles remain visible without recursive loops", () => {
  const rows = [row(1, 2), row(2, 1), row(3, 99), row(4, 4), row(5, 1), row(6)];
  const { data, invalidIds } = categoryTreeData(rows);
  assert.equal(invalidIds.size, 5);
  const flatten = (nodes: TreeNodeData[]): string[] => nodes.flatMap((node) => [node.value, ...flatten(node.children ?? [])]);
  assert.equal(new Set(flatten(data)).size, 6);
  assert.equal(flatten(data).length, 6);
  assert.deepEqual(categoryAncestors(id(1), rows), [id(2)]);
});

test("category sidebar renders Mantine tree, navigation and inactive state", () => {
  const html = renderToStaticMarkup(<MantineProvider env="test"><CategoryTree rows={[row(1), { ...row(2), isActive: false }]}
    loading={false} error="" selectedId={id(1)} rootOnly={false} onSelect={() => {}} onRefresh={() => {}} /></MantineProvider>);
  assert.match(html, /role="tree"/);
  assert.match(html, /aria-selected="true"/);
  assert.match(html, /Бүх ангилал/);
  assert.match(html, /Үндсэн ангилал/);
  assert.match(html, /Идэвхгүй/);
  assert.match(html, /aria-label="Бүгдийг дэлгэх"/);
});

test("category form preselects the parent and editing keeps its original parent", () => {
  const def = referenceDefinitions["part-categories"];
  const render = (existing?: ReferenceRow) => renderToStaticMarkup(<MantineProvider env="test"><ReferenceForm definition={def} row={existing}
    initialParent={id(1)} options={[{ value: id(1), label: "Parent A", disabled: false }, { value: id(2), label: "Parent B", disabled: false }]}
    optionsLoading={false} optionsError="" reloadOptions={() => {}} saving={false} onSavingChange={() => {}} onSave={async () => {}} onCancel={() => {}} /></MantineProvider>);
  assert.match(render(), /value="Parent A"/);
  assert.match(render(row(3, 2)), /value="Parent B"[^>]*disabled|disabled[^>]*value="Parent B"/);
});

test("deep URL selection renders expanded ancestors on the first render", () => {
  const html = renderToStaticMarkup(<MantineProvider env="test"><CategoryTree rows={[row(1), row(2, 1), row(3, 2)]}
    loading={false} error="" selectedId={id(3)} rootOnly={false} onSelect={() => {}} onRefresh={() => {}} /></MantineProvider>);
  assert.match(html, /Category 3/);
  assert.equal(html.match(/role="treeitem"/g)?.length, 3);
});

test("part categories direct route enables sidebar without adding it to other references", async (t) => {
  const router = createMemoryRouter(routes, { initialEntries: ["/"] });
  t.after(() => router.dispose());
  await router.navigate(`/references/part-categories?parentId=${id(1)}`);
  const render = () => renderToStaticMarkup(<MantineProvider env="test"><RouterProvider router={router} /></MantineProvider>);
  assert.match(render(), /aria-label="Ангиллын мод"/);
  await router.navigate("/references/branches");
  assert.doesNotMatch(render(), /aria-label="Ангиллын мод"/);
  await router.navigate(-1);
  assert.equal(new URLSearchParams(router.state.location.search).get("parentId"), id(1));
});
