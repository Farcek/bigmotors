import { HomeProductGroups } from "@bigmotors/sysop-dti";
import { ActionIcon, Alert, Badge, Button, Group, Image, Loader, Menu, Modal, Select, Stack, Table, Tabs, Text, TextInput, Tooltip } from "@mantine/core";
import { IconChevronLeft, IconChevronRight, IconDotsVertical, IconEdit, IconLayoutGrid, IconPlus, IconRefresh, IconSearch, IconTrash } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { apiClient } from "../../api/client";
import { fileUrl } from "../../files/client";
import { PageBody } from "../../ui/PageBody";
import { GroupForm } from "./GroupForm";
import { groupError, groupPage } from "./model";

export function WebsiteHomePage() {
  return <Tabs defaultValue="product-groups" keepMounted={false}>
    <Tabs.List mb="md"><Tabs.Tab value="product-groups" leftSection={<IconLayoutGrid size={16} />}>Бүтээгдэхүүний бүлэг</Tabs.Tab></Tabs.List>
    <Tabs.Panel value="product-groups"><ProductGroups /></Tabs.Panel>
  </Tabs>;
}

function ProductGroups() {
  const [params, setParams] = useSearchParams();
  const page = groupPage(params); const search = (params.get("search") ?? "").slice(0, 255);
  const state = params.get("active"); const active = state === "true" || state === "false" ? state : "";
  const [query, setQuery] = useState(search);
  const [rows, setRows] = useState<HomeProductGroups.Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);
  const [target, setTarget] = useState<HomeProductGroups.Entity | "new" | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<HomeProductGroups.Entity | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const deleteLock = useRef(false);
  useEffect(() => setQuery(search), [search]);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError("");
    void apiClient.call(HomeProductGroups.list, { query: { limit: 21, offset: (page - 1) * 20, search, ...(active ? { isActive: active === "true" } : {}) } }, { signal: controller.signal })
      .then((data) => { if (!controller.signal.aborted) setRows(data); })
      .catch((cause) => { if (!controller.signal.aborted) { setRows([]); setError(groupError(cause)); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, search, active, reload]);
  function changeParams(values: Record<string, string>) {
    setParams((prev) => { const next = new URLSearchParams(prev); for (const [key, value] of Object.entries(values)) { if (value) next.set(key, value); else next.delete(key); } return next; });
  }
  function closeForm() { if (!busy) setTarget(null); }
  const visible = rows.slice(0, 20);
  return <>
    <PageBody><Stack gap="lg">
      <Group justify="space-between" align="flex-end">
        <Group align="flex-end"><form onSubmit={(event) => { event.preventDefault(); changeParams({ search: query.trim(), page: "" }); }}><Group align="flex-end" gap="xs"><TextInput label="Гарчиг хайх" maxLength={255} value={query} onChange={(event) => setQuery(event.currentTarget.value)} /><Tooltip label="Хайх"><ActionIcon type="submit" size={36} aria-label="Бүлэг хайх"><IconSearch size={18} /></ActionIcon></Tooltip></Group></form>
          <Select label="Төлөв" w={150} value={active} data={[{ value: "", label: "Бүгд" }, { value: "true", label: "Идэвхтэй" }, { value: "false", label: "Идэвхгүй" }]} onChange={(value) => changeParams({ active: value ?? "", page: "" })} />
        </Group>
        <Group gap="sm"><Tooltip label="Шинэчлэх"><ActionIcon variant="default" size={36} aria-label="Бүлгүүд шинэчлэх" disabled={loading} onClick={() => setReload((v) => v + 1)}><IconRefresh size={18} /></ActionIcon></Tooltip><Button leftSection={<IconPlus size={18} />} onClick={() => { setNotice(""); setTarget("new"); }}>Бүлэг нэмэх</Button></Group>
      </Group>
      {notice && <Alert color="teal" role="status" withCloseButton closeButtonLabel="Мэдэгдэл хаах" onClose={() => setNotice("")}>{notice}</Alert>}
      {error && <Alert color="red" role="alert">{error}</Alert>}
      {loading ? <Group justify="center" mih={200}><Loader size="sm" /></Group> : !error && <Table.ScrollContainer minWidth={700}><Table verticalSpacing="md" highlightOnHover aria-label="Нүүр хуудасны бүлгүүд">
        <Table.Thead><Table.Tr><Table.Th>Зураг</Table.Th><Table.Th>Гарчиг</Table.Th><Table.Th>Нөхцөл</Table.Th><Table.Th>Дараалал</Table.Th><Table.Th>Төлөв</Table.Th><Table.Th ta="right">Үйлдэл</Table.Th></Table.Tr></Table.Thead>
        <Table.Tbody>{visible.map((row) => <Table.Tr key={row.id}>
          <Table.Td w={110}>{row.imageId ? <Image src={fileUrl({ id: row.imageId, originalName: "image" })} w={90} h={60} fit="contain" alt={row.title} /> : <Text c="dimmed" size="sm">Зураггүй</Text>}</Table.Td>
          <Table.Td maw={300}><Text fw={500} lineClamp={2}>{row.title}</Text><Text size="xs" c="dimmed" lineClamp={2}>{row.description}</Text></Table.Td>
          <Table.Td>{Object.keys(row.filters).length ? `${Object.keys(row.filters).length} нөхцөл` : "Бүх автомашин"}</Table.Td>
          <Table.Td>{row.sortOrder}</Table.Td><Table.Td><Badge color={row.isActive ? "teal" : "gray"}>{row.isActive ? "Идэвхтэй" : "Идэвхгүй"}</Badge></Table.Td>
          <Table.Td><Group justify="flex-end"><Menu position="bottom-end"><Menu.Target><ActionIcon variant="subtle" color="gray" aria-label={`${row.title} үйлдэл`}><IconDotsVertical size={18} /></ActionIcon></Menu.Target><Menu.Dropdown>
            <Menu.Item leftSection={<IconEdit size={16} />} onClick={() => setTarget(row)}>Засах</Menu.Item><Menu.Item color="red" leftSection={<IconTrash size={16} />} onClick={() => { setDeleteError(""); setDeleting(row); }}>Устгах</Menu.Item>
          </Menu.Dropdown></Menu></Group></Table.Td>
        </Table.Tr>)}{!visible.length && <Table.Tr><Table.Td colSpan={6}><Text ta="center" py={48} c="dimmed">Бүртгэл олдсонгүй</Text></Table.Td></Table.Tr>}</Table.Tbody>
      </Table></Table.ScrollContainer>}
      <Group justify="space-between"><Text size="sm" c="dimmed">{page}-р хуудас</Text><Group gap="xs">
        <Tooltip label="Өмнөх хуудас"><ActionIcon variant="default" aria-label="Өмнөх хуудас" disabled={loading || page <= 1} onClick={() => changeParams({ page: String(page - 1) })}><IconChevronLeft size={18} /></ActionIcon></Tooltip>
        <Tooltip label="Дараах хуудас"><ActionIcon variant="default" aria-label="Дараах хуудас" disabled={loading || !!error || rows.length <= 20 || page >= Math.floor(2147483647 / 20)} onClick={() => changeParams({ page: String(page + 1) })}><IconChevronRight size={18} /></ActionIcon></Tooltip>
      </Group></Group>
    </Stack></PageBody>
    <Modal opened={target !== null} onClose={closeForm} title={target === "new" ? "Бүлэг нэмэх" : "Бүлэг засах"} size="xl" withCloseButton={!busy} closeOnClickOutside={!busy} closeOnEscape={!busy}>
      {target !== null && <GroupForm key={target === "new" ? "new" : target.id} row={target === "new" ? undefined : target} onCancel={closeForm} onBusy={setBusy} onSave={async (body) => {
        if (target === "new") await apiClient.call(HomeProductGroups.create, { body });
        else await apiClient.call(HomeProductGroups.update, { params: { id: target.id }, body });
        setTarget(null); setNotice("Хадгаллаа."); setReload((v) => v + 1);
      }} />}
    </Modal>
    <Modal opened={deleting !== null} onClose={() => { if (!deleteBusy) setDeleting(null); }} title="Бүлэг устгах" withCloseButton={!deleteBusy} closeOnClickOutside={!deleteBusy} closeOnEscape={!deleteBusy}>
      <Stack>{deleteError && <Alert color="red" role="alert">{deleteError}</Alert>}<Text>«{deleting?.title}» бүлгийг устгах уу? Автомашин болон эх зураг устахгүй.</Text><Group justify="flex-end"><Button variant="default" disabled={deleteBusy} onClick={() => setDeleting(null)}>Болих</Button><Button color="red" loading={deleteBusy} leftSection={<IconTrash size={17} />} onClick={async () => {
        if (!deleting || deleteLock.current) return;
        deleteLock.current = true; setDeleteBusy(true); setDeleteError("");
        try {
          await apiClient.call(HomeProductGroups.remove, { params: { id: deleting.id } });
          setDeleting(null); setNotice("Устгалаа.");
          if (visible.length === 1 && page > 1) changeParams({ page: String(page - 1) }); else setReload((v) => v + 1);
        } catch (cause) { setDeleteError(groupError(cause)); }
        finally { deleteLock.current = false; setDeleteBusy(false); }
      }}>Устгах</Button></Group></Stack>
    </Modal>
  </>;
}
