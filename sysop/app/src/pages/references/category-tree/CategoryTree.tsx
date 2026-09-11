import { ActionIcon, Alert, Badge, Box, Divider, Group, Loader, NavLink, ScrollArea, Stack, Text, Tooltip, Tree, useTree } from "@mantine/core";
import { IconChevronDown, IconChevronRight, IconChevronsDown, IconChevronsUp, IconFolder, IconFolders, IconRefresh } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import type { ReferenceRow } from "../model";
import { categoryAncestors, categoryTreeData } from "./model";

type Props = {
  rows: ReferenceRow[];
  loading: boolean;
  error: string;
  selectedId: string | null;
  rootOnly: boolean;
  onSelect: (id: string | null, rootOnly?: boolean) => void;
  onRefresh: () => void;
};

export function CategoryTree({ rows, loading, error, selectedId, rootOnly, onSelect, onRefresh }: Props) {
  const { data, invalidIds } = useMemo(() => categoryTreeData(rows), [rows]);
  const index = useMemo(() => new Map(rows.map((row) => [row.id, row])), [rows]);
  const [expansion, setExpansion] = useState<{ key: string; values: Record<string, boolean> }>({ key: "", values: {} });
  const ancestorsKey = categoryAncestors(selectedId, rows).join(",");
  const selectionKey = `${selectedId ?? ""}:${ancestorsKey}`;
  // URL-ийн сонголтын дээд мөчрүүд Tree initialize хийхээс өмнө нээлттэй байна.
  const expanded = expansion.key === selectionKey ? expansion.values : {
    ...expansion.values, ...Object.fromEntries(ancestorsKey ? ancestorsKey.split(",").map((id) => [id, true]) : []),
  };
  const tree = useTree({ expandedState: expanded, onExpandedStateChange: (values) => setExpansion({ key: selectionKey, values }),
    selectedState: selectedId ? [selectedId] : [], onSelectedStateChange: (values) => onSelect(values[0] ?? null) });

  return (
    <Stack component="aside" aria-label="Ангиллын мод" gap="sm" w={{ base: "100%", sm: 280 }} miw={0} flex={{ base: "0 0 auto", sm: "0 0 280px" }}>
      <Group justify="space-between" bg="gray.1" p="xs" wrap="nowrap">
        <Text fw={700}>Ангилал</Text>
        <Group gap={4} wrap="nowrap">
          <Tooltip label="Бүгдийг дэлгэх"><ActionIcon variant="subtle" color="gray" aria-label="Бүгдийг дэлгэх" disabled={loading || Boolean(error)} onClick={tree.expandAllNodes}><IconChevronsDown size={17} /></ActionIcon></Tooltip>
          <Tooltip label="Бүгдийг хураах"><ActionIcon variant="subtle" color="gray" aria-label="Бүгдийг хураах" disabled={loading || Boolean(error)} onClick={tree.collapseAllNodes}><IconChevronsUp size={17} /></ActionIcon></Tooltip>
          <Tooltip label="Мод шинэчлэх"><ActionIcon variant="default" aria-label="Мод шинэчлэх" disabled={loading} onClick={onRefresh}><IconRefresh size={17} /></ActionIcon></Tooltip>
        </Group>
      </Group>
      <Stack gap={0}>
        <NavLink component="button" type="button" label="Бүх ангилал" leftSection={<IconFolders size={18} />} active={!selectedId && !rootOnly} onClick={() => onSelect(null)} />
        <NavLink component="button" type="button" label="Үндсэн ангилал" leftSection={<IconFolder size={18} />} active={!selectedId && rootOnly} onClick={() => onSelect(null, true)} />
      </Stack>
      <Divider />
      {loading ? <Group justify="center" mih={160} role="status" aria-label="Ангиллын мод ачаалж байна"><Loader size="sm" /></Group>
        : error ? <Alert color="red" role="alert">{error}</Alert>
          : !rows.length ? <Text size="sm" c="dimmed" ta="center" py="xl">Ангилал олдсонгүй</Text>
            : <>
              {invalidIds.size > 0 && <Alert color="yellow" role="alert">Зарим ангиллын харьяалал буруу байна.</Alert>}
              <ScrollArea h={{ base: 280, sm: "clamp(300px, calc(100dvh - 420px), 640px)" }} scrollbars="xy" type="auto"
                viewportProps={{ tabIndex: 0, "aria-label": "Ангиллын мод гүйлгэх" }}>
                <Tree data={data} tree={tree} levelOffset="md" withLines selectOnClick expandOnClick={false} allowRangeSelection={false}
                  aria-label="Сэлбэгийн ангиллын мод"
                  onKeyDownCapture={(event) => {
                    const node = event.target as HTMLElement;
                    if (node.getAttribute("role") === "treeitem" && (event.key === "Enter" || event.key === " ")) {
                      event.preventDefault(); event.stopPropagation();
                      const id = node.dataset.value;
                      if (id) tree.select(id);
                    }
                  }}
                  renderNode={({ node, expanded: isExpanded, hasChildren, elementProps }) => (
                    <Group {...elementProps} wrap="nowrap" gap={6} py={6} pr={4}>
                      {hasChildren ? <ActionIcon size={24} variant="subtle" color="gray" tabIndex={-1}
                        aria-label={`${index.get(node.value)?.name} ${isExpanded ? "хураах" : "дэлгэх"}`} aria-expanded={isExpanded}
                        onClick={(event) => { event.stopPropagation(); tree.toggleExpanded(node.value); }}>
                        {isExpanded ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                      </ActionIcon> : <Box w={24} miw={24}><IconFolder size={16} /></Box>}
                      <Text size="sm" truncate title={index.get(node.value)?.name} flex={1} miw={80}>{node.label}</Text>
                      {!index.get(node.value)?.isActive && <Badge size="xs" color="gray" variant="light">Идэвхгүй</Badge>}
                    </Group>
                  )} />
              </ScrollArea>
            </>}
    </Stack>
  );
}
