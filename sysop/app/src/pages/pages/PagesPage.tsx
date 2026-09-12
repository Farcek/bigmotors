import { PAGE_STATUSES, type PageStatus } from "@bigmotors/core";
import { Pages } from "@bigmotors/sysop-dti";
import { ActionIcon, Alert, Badge, Button, Group, Loader, Menu, Modal, Select, Stack, Table, Text, TextInput, Tooltip } from "@mantine/core";
import { IconChevronLeft, IconChevronRight, IconDotsVertical, IconEdit, IconPlus, IconRefresh, IconSearch, IconTrash } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { apiClient } from "../../api/client";
import { PageBody } from "../../ui/PageBody";
import { PAGE_SIZE, pageError, pageNumber, statusLabels, statusOptions } from "./model";

export function PagesPage() {
  const [params, setParams] = useSearchParams(); const page = pageNumber(params);
  const search = (params.get("search") ?? "").slice(0, 255);
  const statusValue = params.get("status") as PageStatus | null;
  const status = statusValue && PAGE_STATUSES.includes(statusValue) ? statusValue : undefined;
  const [query, setQuery] = useState(search); const [rows, setRows] = useState<Pages.ListEntity[]>([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [reload, setReload] = useState(0);
  const [target, setTarget] = useState<Pages.ListEntity | null>(null);
  const [deleting, setDeleting] = useState(false); const [deleteError, setDeleteError] = useState(""); const lock = useRef(false);
  useEffect(() => setQuery(search), [search]);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError("");
    void apiClient.call(Pages.list, { query: { search, status, limit: PAGE_SIZE + 1, offset: (page - 1) * PAGE_SIZE } }, { signal: controller.signal })
      .then(value => { if (!controller.signal.aborted) setRows(value); })
      .catch(cause => { if (!controller.signal.aborted) setError(pageError(cause)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [search, status, page, reload]);
  function setFilter(key: string, value: string) { setParams(prev => { const next = new URLSearchParams(prev); value ? next.set(key, value) : next.delete(key); next.delete("page"); return next; }); }
  function goPage(value: number) { setParams(prev => { const next = new URLSearchParams(prev); next.set("page", String(value)); return next; }); }
  const visible = rows.slice(0, PAGE_SIZE);
  return <>
    <PageBody><Stack gap="lg">
      <Group justify="space-between" align="flex-end">
        <Group align="flex-end"><form onSubmit={event => { event.preventDefault(); setFilter("search", query.trim()); }}><Group align="flex-end" gap="xs">
          <TextInput label="Гарчиг / slug" value={query} maxLength={255} onChange={event => setQuery(event.currentTarget.value)} />
          <Tooltip label="Хайх"><ActionIcon type="submit" size={36} aria-label="Хуудас хайх"><IconSearch size={18} /></ActionIcon></Tooltip>
        </Group></form><Select label="Төлөв" placeholder="Бүгд" clearable data={statusOptions} value={status ?? null} onChange={value => setFilter("status", value ?? "")} /></Group>
        <Group gap="sm"><Tooltip label="Шинэчлэх"><ActionIcon variant="default" size={36} aria-label="Жагсаалт шинэчлэх" disabled={loading} onClick={() => setReload(v => v + 1)}><IconRefresh size={18} /></ActionIcon></Tooltip><Button component={Link} to="/pages/new" leftSection={<IconPlus size={18} />}>Хуудас нэмэх</Button></Group>
      </Group>
      {error && <Alert color="red" role="alert">{error}</Alert>}
      {loading ? <Group justify="center" mih={200}><Loader size="sm" /></Group> : !error && <Table.ScrollContainer minWidth={660}><Table verticalSpacing="md" highlightOnHover aria-label="Хуудасны жагсаалт">
        <Table.Thead><Table.Tr><Table.Th>Гарчиг</Table.Th><Table.Th>Slug</Table.Th><Table.Th>Төлөв</Table.Th><Table.Th>Шинэчилсэн</Table.Th><Table.Th ta="right">Үйлдэл</Table.Th></Table.Tr></Table.Thead>
        <Table.Tbody>{visible.map(row => <Table.Tr key={row.id}>
          <Table.Td maw={280}><Text component={Link} to={`/pages/${row.id}/edit`} c="blue" lineClamp={2}>{row.title}</Text></Table.Td>
          <Table.Td maw={250}><Text size="sm" lineClamp={2}>{row.slug}</Text></Table.Td>
          <Table.Td><Badge color={row.status === "published" ? "teal" : "gray"}>{statusLabels[row.status]}</Badge></Table.Td>
          <Table.Td>{new Date(row.updatedAt).toLocaleDateString("mn-MN")}</Table.Td>
          <Table.Td><Group justify="flex-end"><Menu position="bottom-end"><Menu.Target><ActionIcon variant="subtle" color="gray" aria-label={`${row.title} үйлдэл`}><IconDotsVertical size={18} /></ActionIcon></Menu.Target><Menu.Dropdown>
            <Menu.Item component={Link} to={`/pages/${row.id}/edit`} leftSection={<IconEdit size={16} />}>Засах</Menu.Item>
            <Menu.Item color="red" leftSection={<IconTrash size={16} />} onClick={() => { setTarget(row); setDeleteError(""); }}>Устгах</Menu.Item>
          </Menu.Dropdown></Menu></Group></Table.Td>
        </Table.Tr>)}{!visible.length && <Table.Tr><Table.Td colSpan={5}><Text ta="center" py={48} c="dimmed">Бүртгэл олдсонгүй</Text></Table.Td></Table.Tr>}</Table.Tbody>
      </Table></Table.ScrollContainer>}
      <Group justify="space-between"><Text size="sm" c="dimmed">{page}-р хуудас</Text><Group gap="xs">
        <Tooltip label="Өмнөх хуудас"><ActionIcon variant="default" aria-label="Өмнөх хуудас" disabled={loading || page <= 1} onClick={() => goPage(page - 1)}><IconChevronLeft size={18} /></ActionIcon></Tooltip>
        <Tooltip label="Дараах хуудас"><ActionIcon variant="default" aria-label="Дараах хуудас" disabled={loading || !!error || rows.length <= PAGE_SIZE || page >= Math.floor(2147483647 / PAGE_SIZE)} onClick={() => goPage(page + 1)}><IconChevronRight size={18} /></ActionIcon></Tooltip>
      </Group></Group>
    </Stack></PageBody>
    <Modal opened={!!target} title="Хуудас устгах" onClose={() => { if (!deleting) setTarget(null); }} withCloseButton={!deleting} closeOnClickOutside={!deleting} closeOnEscape={!deleting}>
      <Stack>{deleteError && <Alert color="red" role="alert">{deleteError}</Alert>}<Text>«{target?.title}» хуудсыг устгах уу? Эх зураг устахгүй.</Text><Group justify="flex-end"><Button variant="default" disabled={deleting} onClick={() => setTarget(null)}>Болих</Button><Button color="red" loading={deleting} leftSection={<IconTrash size={17} />} onClick={async () => {
        if (!target || lock.current) return;
        lock.current = true; setDeleting(true); setDeleteError("");
        try {
          await apiClient.call(Pages.remove, { params: { id: target.id } }); setTarget(null);
          if (visible.length === 1 && page > 1) goPage(page - 1); else setReload(v => v + 1);
        } catch (cause) { setDeleteError(pageError(cause)); }
        finally { lock.current = false; setDeleting(false); }
      }}>Устгах</Button></Group></Stack>
    </Modal>
  </>;
}
