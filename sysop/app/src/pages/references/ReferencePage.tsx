import { ActionIcon, Alert, Badge, Button, Checkbox, Divider, Flex, Group, Loader, Menu, Modal, NativeSelect, Select, Stack, Table, Text, Tooltip, UnstyledButton } from "@mantine/core";
import { IconArrowLeft, IconCheck, IconChevronLeft, IconChevronRight, IconDatabase, IconDotsVertical, IconEdit, IconPlus, IconRefresh, IconTrash } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { PageBody } from "../../ui/PageBody";
import { ReferenceForm } from "./ReferenceForm";
import { listState, MAX_PAGE, PAGE_SIZE, referenceError, type ReferenceDefinition, type ReferenceRow } from "./model";
import { useParentOptions } from "./useParentOptions";
import { CategoryTree } from "./category-tree/CategoryTree";

export function ReferencePage({ definition: def, categoryTree = false }: { definition: ReferenceDefinition; categoryTree?: boolean }) {
  const [params, setParams] = useSearchParams();
  const { page, status, parent, rootOnly } = listState(def, params);
  const [rows, setRows] = useState<ReferenceRow[]>([]);
  const [fetching, setLoading] = useState(true);
  const [rowsQueryKey, setRowsQueryKey] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);
  const [optionsRevision, setOptionsRevision] = useState(0);
  const parents = useParentOptions(def, optionsRevision);
  const [target, setTarget] = useState<ReferenceRow | "new" | null>(null);
  const [initialParent, setInitialParent] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<ReferenceRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const deleteLock = useRef(false);
  const queryKey = JSON.stringify(listState(def, params).query);
  const loading = fetching || rowsQueryKey !== queryKey;
  const selectedCategory = categoryTree ? parents.rows.find((row) => row.id === parent) : undefined;
  const categoryAddDisabled = categoryTree && (parents.loading || Boolean(parents.error) || Boolean(parent && !parents.options.some((option) => option.value === parent && !option.disabled)));

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    void def.list(JSON.parse(queryKey), controller.signal).then((data) => {
      if (!controller.signal.aborted) setRows(data);
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) { setRows([]); setError(referenceError(cause)); }
    }).finally(() => { if (!controller.signal.aborted) { setRowsQueryKey(queryKey); setLoading(false); } });
    return () => controller.abort();
  }, [def, queryKey, revision]);

  function changeQuery(updates: Record<string, string | null>) {
    // Tree сонголтын дараах шууд нэмэх үйлдэл хуучин parent-ийг ашиглахгүй.
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      next.delete("page");
      for (const [key, value] of Object.entries(updates)) {
        if (value) next.set(key, value); else next.delete(key);
      }
      return next;
    }, { flushSync: categoryTree });
  }
  function refresh() { setRevision((value) => value + 1); setOptionsRevision((value) => value + 1); }
  function closeForm() { if (!saving) setTarget(null); }
  function selectCategory(id: string | null, root = false) { changeQuery({ parentId: id, rootOnly: root ? "true" : null }); }
  const visibleRows = rows.slice(0, PAGE_SIZE);
  const filterOptions = parents.options.map(({ value, label }) => ({ value, label }));
  if (parent && !filterOptions.some((option) => option.value === parent)) filterOptions.push({ value: parent, label: `Лавлах: ${parent}` });
  function parentLabel(row: ReferenceRow) {
    const id = def.parent && row[def.parent.key];
    return id ? parents.options.find((option) => option.value === id)?.label ?? `Лавлах: ${id}` : "Үндсэн ангилал";
  }

  return (
    <Stack gap="md">
      <Group><Button component={Link} to="/references" variant="subtle" leftSection={<IconArrowLeft size={17} />}>Лавлах</Button></Group>
      <PageBody>
        <Flex direction={{ base: "column", sm: "row" }} gap={categoryTree ? "lg" : 0} align="stretch" miw={0}>
          {categoryTree && <>
            <CategoryTree rows={parents.rows} loading={parents.loading} error={parents.error} selectedId={parent} rootOnly={rootOnly} onSelect={selectCategory} onRefresh={refresh} />
            <Divider orientation="vertical" visibleFrom="sm" />
            <Divider hiddenFrom="sm" />
          </>}
        <Stack gap="lg" flex={1} miw={0}>
          {categoryTree && <Group justify="space-between" wrap="nowrap">
            <Stack gap={4} miw={0}>
              <Text fw={700} truncate title={selectedCategory?.name}>{parent ? selectedCategory?.name ?? "Ангилал" : rootOnly ? "Үндсэн ангилал" : "Бүх ангилал"}</Text>
              {parent && <Text size="xs" c="dimmed">Дэд ангиллууд</Text>}
            </Stack>
            {selectedCategory && !parents.loading && !parents.error && <Menu withinPortal position="bottom-end">
              <Menu.Target><ActionIcon variant="subtle" color="gray" aria-label="Сонгосон ангиллын үйлдэл" title="Үйлдэл"><IconDotsVertical size={18} /></ActionIcon></Menu.Target>
              <Menu.Dropdown>
                <Menu.Item leftSection={<IconEdit size={16} />} onClick={() => { setNotice(""); setTarget(selectedCategory); }}>Засах</Menu.Item>
                <Menu.Item color="red" leftSection={<IconTrash size={16} />} onClick={() => { setDeleteError(""); setNotice(""); setDeleting(selectedCategory); }}>Устгах</Menu.Item>
              </Menu.Dropdown>
            </Menu>}
          </Group>}
          <Group justify="space-between" align="flex-end">
            <Group align="flex-end">
              <NativeSelect label="Төлөв" value={status} data={[{ value: "", label: "Бүх төлөв" }, { value: "true", label: "Идэвхтэй" }, { value: "false", label: "Идэвхгүй" }]} onChange={(event) => changeQuery({ isActive: event.currentTarget.value })} />
              {def.parent && !categoryTree && <Select label={def.parent.label} placeholder="Бүгд" searchable clearable data={filterOptions} value={parent}
                w={250} maw="100%" disabled={parents.loading} nothingFoundMessage="Лавлах олдсонгүй"
                onChange={(value) => changeQuery({ [def.parent!.key]: value, rootOnly: null })} />}
              {def.parent?.optional && !categoryTree && <Checkbox label="Зөвхөн үндсэн ангилал" checked={rootOnly} mb={9} onChange={(event) => changeQuery({ rootOnly: event.currentTarget.checked ? "true" : null, parentId: null })} />}
            </Group>
            <Group gap="sm">
              <Tooltip label="Шинэчлэх"><ActionIcon variant="default" size={36} aria-label="Жагсаалт шинэчлэх" disabled={loading} onClick={refresh}><IconRefresh size={18} /></ActionIcon></Tooltip>
              <Button leftSection={<IconPlus size={18} />} disabled={categoryAddDisabled} onClick={() => { setNotice(""); setInitialParent(parent); setTarget("new"); setOptionsRevision((value) => value + 1); }}>Нэмэх</Button>
            </Group>
          </Group>
          {categoryTree && parent && !parents.loading && !parents.error && !selectedCategory && <Alert color="yellow" role="alert">Сонгосон ангилал олдсонгүй. Өөр ангилал сонгоно уу.</Alert>}
          {parents.error && !categoryTree && <Alert color="red" role="alert"><Stack gap="xs"><Text size="sm">Харьяалах лавлах: {parents.error}</Text><Button variant="light" color="red" onClick={() => setOptionsRevision((value) => value + 1)}>Сонголт шинэчлэх</Button></Stack></Alert>}
          {notice && <Alert color="teal" role="status" icon={<IconCheck size={18} />} withCloseButton closeButtonLabel="Мэдэгдэл хаах" onClose={() => setNotice("")}>{notice}</Alert>}
          {error && <Alert color="red" role="alert"><Stack gap="sm"><Text size="sm">{error}</Text><Button variant="light" color="red" onClick={refresh}>Дахин оролдох</Button></Stack></Alert>}
          {loading ? <Group justify="center" mih={260} role="status" aria-label="Жагсаалт ачаалж байна"><Loader size="sm" /></Group> : !error && (
            <Table.ScrollContainer minWidth={def.parent ? 750 : 620}>
              <Table aria-label={`${def.title} жагсаалт`} verticalSpacing="md" horizontalSpacing="sm" highlightOnHover>
                <Table.Thead><Table.Tr><Table.Th>Нэр</Table.Th>{def.parent && <Table.Th>{def.parent.label}</Table.Th>}<Table.Th>Дараалал</Table.Th><Table.Th>Төлөв</Table.Th><Table.Th ta="right">Үйлдэл</Table.Th></Table.Tr></Table.Thead>
                <Table.Tbody>
                  {visibleRows.map((row) => <Table.Tr key={row.id}>
                    <Table.Td maw={360}><Stack gap={3}>{categoryTree
                      ? <UnstyledButton onClick={() => selectCategory(row.id)} aria-label={`${row.name} дэд ангилал`}><Text size="sm" fw={500} c="blue" truncate title={row.name}>{row.name}</Text></UnstyledButton>
                      : <Text size="sm" fw={500} style={{ overflowWrap: "anywhere" }}>{row.name}</Text>}{row.description && <Text size="xs" c="dimmed" lineClamp={2} style={{ overflowWrap: "anywhere" }}>{row.description}</Text>}</Stack></Table.Td>
                    {def.parent && <Table.Td maw={320}><Text size="sm" style={{ overflowWrap: "anywhere" }}>{parentLabel(row)}</Text></Table.Td>}
                    <Table.Td>{row.sortOrder}</Table.Td>
                    <Table.Td><Badge color={row.isActive ? "teal" : "gray"} variant="light">{row.isActive ? "Идэвхтэй" : "Идэвхгүй"}</Badge></Table.Td>
                    <Table.Td><Group justify="flex-end" gap={6} wrap="nowrap">
                      <Tooltip label="Засах"><ActionIcon variant="subtle" color="gray" aria-label={`${row.name} засах`} onClick={() => { setNotice(""); setTarget(row); }}><IconEdit size={18} /></ActionIcon></Tooltip>
                      <Tooltip label="Устгах"><ActionIcon variant="subtle" color="red" aria-label={`${row.name} устгах`} onClick={() => { setDeleteError(""); setNotice(""); setDeleting(row); }}><IconTrash size={18} /></ActionIcon></Tooltip>
                    </Group></Table.Td>
                  </Table.Tr>)}
                  {!visibleRows.length && <Table.Tr><Table.Td colSpan={def.parent ? 5 : 4}><Stack align="center" py={48}><IconDatabase size={28} color="gray" /><Text c="dimmed">Бүртгэл олдсонгүй</Text></Stack></Table.Td></Table.Tr>}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          )}
          <Group justify="space-between">
            <Text size="sm" c="dimmed">{page}-р хуудас{!loading && !error ? ` · ${visibleRows.length} бүртгэл` : ""}</Text>
            <Group gap="xs">
              <Tooltip label="Өмнөх хуудас"><ActionIcon variant="default" size={32} aria-label="Өмнөх хуудас" disabled={loading || page === 1} onClick={() => changeQuery({ page: page === 2 ? null : String(page - 1) })}><IconChevronLeft size={18} /></ActionIcon></Tooltip>
              <Tooltip label="Дараах хуудас"><ActionIcon variant="default" size={32} aria-label="Дараах хуудас" disabled={loading || Boolean(error) || rows.length <= PAGE_SIZE || page >= MAX_PAGE} onClick={() => changeQuery({ page: String(page + 1) })}><IconChevronRight size={18} /></ActionIcon></Tooltip>
            </Group>
          </Group>
        </Stack>
        </Flex>
      </PageBody>
      <Modal opened={target !== null} onClose={closeForm} title={`${def.title} ${target === "new" ? "нэмэх" : "засах"}`} size="lg" centered closeOnClickOutside={!saving} closeOnEscape={!saving} withCloseButton={!saving}>
        {target !== null && <ReferenceForm key={target === "new" ? "new" : target.id} definition={def} row={target === "new" ? undefined : target}
          initialParent={categoryTree ? initialParent : undefined}
          options={parents.options} optionsLoading={parents.loading} optionsError={parents.error} reloadOptions={() => setOptionsRevision((value) => value + 1)}
          saving={saving} onSavingChange={setSaving} onCancel={closeForm} onSave={async (body) => {
            if (target === "new") await def.create(body); else await def.update(target.id, body);
            setTarget(null); setNotice("Бүртгэлийг хадгаллаа."); refresh();
          }} />}
      </Modal>
      <Modal opened={deleting !== null} onClose={() => { if (!deleteBusy) setDeleting(null); }} title={`${def.title} устгах`} centered closeOnClickOutside={!deleteBusy} closeOnEscape={!deleteBusy} withCloseButton={!deleteBusy}>
        <Stack gap="lg">
          {deleteError && <Alert color="red" role="alert">{deleteError}</Alert>}
          <Text style={{ overflowWrap: "anywhere" }}>“{deleting?.name}” бүртгэлийг устгах уу?</Text>
          <Group justify="flex-end"><Button variant="default" disabled={deleteBusy} onClick={() => setDeleting(null)}>Болих</Button><Button color="red" loading={deleteBusy} leftSection={<IconTrash size={17} />} onClick={async () => {
            if (!deleting || deleteLock.current) return;
            deleteLock.current = true; setDeleteBusy(true); setDeleteError("");
            try {
              await def.remove(deleting.id);
              setDeleting(null); setNotice("Бүртгэлийг устгалаа.");
              if (categoryTree && parent === deleting.id) selectCategory(deleting.parentId ?? null, !deleting.parentId);
              else if (visibleRows.some((row) => row.id === deleting.id) && visibleRows.length === 1 && page > 1) changeQuery({ page: page === 2 ? null : String(page - 1) });
              refresh();
            } catch (cause) { setDeleteError(referenceError(cause)); }
            finally { deleteLock.current = false; setDeleteBusy(false); }
          }}>Устгах</Button></Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
