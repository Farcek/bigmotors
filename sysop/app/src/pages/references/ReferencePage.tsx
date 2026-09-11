import { ActionIcon, Alert, Badge, Button, Checkbox, Group, Loader, Modal, NativeSelect, Select, Stack, Table, Text, Tooltip } from "@mantine/core";
import { IconArrowLeft, IconCheck, IconChevronLeft, IconChevronRight, IconDatabase, IconEdit, IconPlus, IconRefresh, IconTrash } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { PageBody } from "../../ui/PageBody";
import { ReferenceForm } from "./ReferenceForm";
import { listState, MAX_PAGE, PAGE_SIZE, referenceError, type ReferenceDefinition, type ReferenceRow } from "./model";
import { useParentOptions } from "./useParentOptions";

export function ReferencePage({ definition: def }: { definition: ReferenceDefinition }) {
  const [params, setParams] = useSearchParams();
  const { page, status, parent, rootOnly } = listState(def, params);
  const [rows, setRows] = useState<ReferenceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);
  const [optionsRevision, setOptionsRevision] = useState(0);
  const parents = useParentOptions(def, optionsRevision);
  const [target, setTarget] = useState<ReferenceRow | "new" | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<ReferenceRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const deleteLock = useRef(false);
  const queryKey = JSON.stringify(listState(def, params).query);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    void def.list(JSON.parse(queryKey), controller.signal).then((data) => {
      if (!controller.signal.aborted) setRows(data);
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) { setRows([]); setError(referenceError(cause)); }
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [def, queryKey, revision]);

  function changeQuery(updates: Record<string, string | null>) {
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      next.delete("page");
      for (const [key, value] of Object.entries(updates)) {
        if (value) next.set(key, value); else next.delete(key);
      }
      return next;
    });
  }
  function refresh() { setRevision((value) => value + 1); setOptionsRevision((value) => value + 1); }
  function closeForm() { if (!saving) setTarget(null); }
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
        <Stack gap="lg">
          <Group justify="space-between" align="flex-end">
            <Group align="flex-end">
              <NativeSelect label="Төлөв" value={status} data={[{ value: "", label: "Бүх төлөв" }, { value: "true", label: "Идэвхтэй" }, { value: "false", label: "Идэвхгүй" }]} onChange={(event) => changeQuery({ isActive: event.currentTarget.value })} />
              {def.parent && <Select label={def.parent.label} placeholder="Бүгд" searchable clearable data={filterOptions} value={parent}
                w={250} maw="100%" disabled={parents.loading} nothingFoundMessage="Лавлах олдсонгүй"
                onChange={(value) => changeQuery({ [def.parent!.key]: value, rootOnly: null })} />}
              {def.parent?.optional && <Checkbox label="Зөвхөн үндсэн ангилал" checked={rootOnly} mb={9} onChange={(event) => changeQuery({ rootOnly: event.currentTarget.checked ? "true" : null, parentId: null })} />}
            </Group>
            <Group gap="sm">
              <Tooltip label="Шинэчлэх"><ActionIcon variant="default" size={36} aria-label="Жагсаалт шинэчлэх" disabled={loading} onClick={refresh}><IconRefresh size={18} /></ActionIcon></Tooltip>
              <Button leftSection={<IconPlus size={18} />} onClick={() => { setNotice(""); setTarget("new"); setOptionsRevision((value) => value + 1); }}>Нэмэх</Button>
            </Group>
          </Group>
          {parents.error && <Alert color="red" role="alert"><Stack gap="xs"><Text size="sm">Харьяалах лавлах: {parents.error}</Text><Button variant="light" color="red" onClick={() => setOptionsRevision((value) => value + 1)}>Сонголт шинэчлэх</Button></Stack></Alert>}
          {notice && <Alert color="teal" role="status" icon={<IconCheck size={18} />} withCloseButton closeButtonLabel="Мэдэгдэл хаах" onClose={() => setNotice("")}>{notice}</Alert>}
          {error && <Alert color="red" role="alert"><Stack gap="sm"><Text size="sm">{error}</Text><Button variant="light" color="red" onClick={refresh}>Дахин оролдох</Button></Stack></Alert>}
          {loading ? <Group justify="center" mih={260} role="status" aria-label="Жагсаалт ачаалж байна"><Loader size="sm" /></Group> : !error && (
            <Table.ScrollContainer minWidth={def.parent ? 750 : 620}>
              <Table aria-label={`${def.title} жагсаалт`} verticalSpacing="md" horizontalSpacing="sm" highlightOnHover>
                <Table.Thead><Table.Tr><Table.Th>Нэр</Table.Th>{def.parent && <Table.Th>{def.parent.label}</Table.Th>}<Table.Th>Дараалал</Table.Th><Table.Th>Төлөв</Table.Th><Table.Th ta="right">Үйлдэл</Table.Th></Table.Tr></Table.Thead>
                <Table.Tbody>
                  {visibleRows.map((row) => <Table.Tr key={row.id}>
                    <Table.Td maw={360}><Stack gap={3}><Text size="sm" fw={500} style={{ overflowWrap: "anywhere" }}>{row.name}</Text>{row.description && <Text size="xs" c="dimmed" lineClamp={2} style={{ overflowWrap: "anywhere" }}>{row.description}</Text>}</Stack></Table.Td>
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
      </PageBody>
      <Modal opened={target !== null} onClose={closeForm} title={`${def.title} ${target === "new" ? "нэмэх" : "засах"}`} size="lg" centered closeOnClickOutside={!saving} closeOnEscape={!saving} withCloseButton={!saving}>
        {target !== null && <ReferenceForm key={target === "new" ? "new" : target.id} definition={def} row={target === "new" ? undefined : target}
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
              if (visibleRows.length === 1 && page > 1) changeQuery({ page: page === 2 ? null : String(page - 1) });
              refresh();
            } catch (cause) { setDeleteError(referenceError(cause)); }
            finally { deleteLock.current = false; setDeleteBusy(false); }
          }}>Устгах</Button></Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
