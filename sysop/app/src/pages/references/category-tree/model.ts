import type { TreeNodeData } from "@mantine/core";
import type { ReferenceRow } from "../model";

export function categoryAncestors(id: string | null, rows: ReferenceRow[]) {
  const index = new Map(rows.map((row) => [row.id, row]));
  const seen = new Set<string>();
  const ancestors: string[] = [];
  if (id) seen.add(id);
  let parentId = id ? index.get(id)?.parentId : null;
  while (parentId && index.has(parentId) && !seen.has(parentId)) {
    seen.add(parentId);
    ancestors.unshift(parentId);
    parentId = index.get(parentId)?.parentId;
  }
  return ancestors;
}

export function categoryTreeData(rows: ReferenceRow[]) {
  const sorted = [...new Map(rows.map((row) => [row.id, row])).values()]
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "mn") || a.id.localeCompare(b.id));
  const index = new Map(sorted.map((row) => [row.id, row]));
  const invalidIds = new Set<string>();
  for (const row of sorted) {
    const seen = new Set<string>([row.id]);
    let parentId = row.parentId;
    while (parentId) {
      if (seen.has(parentId) || !index.has(parentId)) { invalidIds.add(row.id); break; }
      seen.add(parentId);
      parentId = index.get(parentId)!.parentId;
    }
  }
  const nodes = new Map<string, TreeNodeData>(sorted.map((row) => [row.id, { value: row.id, label: row.name }]));
  const data: TreeNodeData[] = [];
  // Эвдэрсэн харьяаллыг нуухгүй, цикл үүсгэхгүйгээр дээд түвшинд харуулна.
  for (const row of sorted) {
    const node = nodes.get(row.id)!;
    if (row.parentId && !invalidIds.has(row.id)) {
      const parent = nodes.get(row.parentId)!;
      (parent.children ??= []).push(node);
    } else data.push(node);
  }
  return { data, invalidIds };
}
