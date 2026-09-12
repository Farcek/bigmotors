import { Galleries, GalleryItems } from "@bigmotors/sysop-dti";
import { ActionIcon, Alert, Button, Group, Image, Loader, Menu, Modal, Stack, Table, Text, TextInput, Tooltip } from "@mantine/core";
import { IconArrowLeft, IconChevronLeft, IconChevronRight, IconDotsVertical, IconEdit, IconPhoto, IconPlus, IconRefresh, IconSearch, IconTrash } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { apiClient } from "../../api/client";
import { fileUrl } from "../../files/client";
import { PageBody } from "../../ui/PageBody";
import { GalleryForm, type GalleryRow } from "./GalleryForm";
import { GALLERY_PAGE_SIZE, galleryError, galleryPage } from "./model";
import { galleryPlainText } from "./html";

export function GalleryPage() {
  const { id } = useParams();
  return <GalleryWorkspace key={id ?? "list"} galleryId={id} />;
}

function GalleryWorkspace({ galleryId }: { galleryId?: string }) {
  const [params, setParams] = useSearchParams();
  const page = galleryPage(params); const search = (params.get("search") ?? "").slice(0, 255);
  const [query, setQuery] = useState(search);
  const [rows, setRows] = useState<GalleryRow[]>([]);
  const [gallery, setGallery] = useState<Galleries.Entity>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);
  const [target, setTarget] = useState<GalleryRow | "new" | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<GalleryRow | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const deleteLock = useRef(false);
  useEffect(() => setQuery(search), [search]);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError("");
    void (async () => {
      const paging = { limit: GALLERY_PAGE_SIZE + 1, offset: (page - 1) * GALLERY_PAGE_SIZE };
      if (galleryId) {
        const owner = await apiClient.call(Galleries.get, { params: { id: galleryId } }, { signal: controller.signal });
        const data = await apiClient.call(GalleryItems.list, { params: { galleryId }, query: paging }, { signal: controller.signal });
        if (!controller.signal.aborted) { setGallery(owner); setRows(data); }
      } else {
        const data = await apiClient.call(Galleries.list, { query: { ...paging, search } }, { signal: controller.signal });
        if (!controller.signal.aborted) setRows(data);
      }
    })().catch((cause) => { if (!controller.signal.aborted) { setRows([]); setError(galleryError(cause)); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [galleryId, page, search, reload]);
  const visible = rows.slice(0, GALLERY_PAGE_SIZE);
  function goPage(value: number) { setParams((prev) => { const next = new URLSearchParams(prev); next.set("page", String(value)); return next; }); }
  function closeForm() { if (!busy) setTarget(null); }
  const rowName = (row: GalleryRow) => "name" in row ? row.name : galleryPlainText(row.title) || galleryPlainText(row.label) || row.originalName;
  return <Stack>
    {galleryId && <Group><Button component={Link} to="/galleries" variant="subtle" leftSection={<IconArrowLeft size={17} />}>Gallery</Button><Text fw={600}>{gallery?.name}</Text></Group>}
    <PageBody><Stack gap="lg">
      <Group justify="space-between" align="flex-end">
        {!galleryId ? <form onSubmit={(event) => { event.preventDefault(); setParams(query.trim() ? { search: query.trim() } : {}); }}><Group align="flex-end"><TextInput label="Нэрээр хайх" value={query} maxLength={255} onChange={(event) => setQuery(event.currentTarget.value)} /><Tooltip label="Хайх"><ActionIcon type="submit" size={36} aria-label="Gallery хайх"><IconSearch size={18} /></ActionIcon></Tooltip></Group></form> : <Text fw={500}>Зургууд</Text>}
        <Group gap="sm"><Tooltip label="Шинэчлэх"><ActionIcon variant="default" size={36} aria-label="Жагсаалт шинэчлэх" disabled={loading} onClick={() => setReload((v) => v + 1)}><IconRefresh size={18} /></ActionIcon></Tooltip><Button leftSection={<IconPlus size={18} />} disabled={Boolean(galleryId && (loading || error))} onClick={() => { setNotice(""); setTarget("new"); }}>{galleryId ? "Item нэмэх" : "Gallery нэмэх"}</Button></Group>
      </Group>
      {notice && <Alert color="teal" role="status" withCloseButton closeButtonLabel="Мэдэгдэл хаах" onClose={() => setNotice("")}>{notice}</Alert>}
      {error && <Alert color="red" role="alert">{error}</Alert>}
      {loading ? <Group justify="center" mih={200}><Loader size="sm" /></Group> : !error && <Table.ScrollContainer minWidth={galleryId ? 700 : 560}><Table verticalSpacing="md" highlightOnHover aria-label={galleryId ? "Gallery item жагсаалт" : "Gallery жагсаалт"}>
        <Table.Thead><Table.Tr>{galleryId && <Table.Th>Зураг</Table.Th>}<Table.Th>{galleryId ? "Гарчиг / Label" : "Нэр"}</Table.Th><Table.Th>Тайлбар</Table.Th><Table.Th>{galleryId ? "Дараалал" : "Шинэчилсэн"}</Table.Th><Table.Th ta="right">Үйлдэл</Table.Th></Table.Tr></Table.Thead>
        <Table.Tbody>{visible.map((row) => <Table.Tr key={row.id}>
          {"imageId" in row && <Table.Td w={116}><Image src={fileUrl({ id: row.imageId, originalName: row.originalName })} w={96} h={64} fit="contain" alt={galleryPlainText(row.title) || row.originalName} /></Table.Td>}
          <Table.Td maw={280}>{"name" in row ? <Text component={Link} to={`/galleries/${row.id}`} c="blue" fw={500} lineClamp={2}>{row.name}</Text> : <Stack gap={2}><Text size="sm" fw={500} lineClamp={2}>{galleryPlainText(row.title) || row.originalName}</Text><Text size="xs" c="dimmed" lineClamp={1}>{galleryPlainText(row.label)}</Text></Stack>}</Table.Td>
          <Table.Td maw={280}><Text size="sm" lineClamp={2}>{("name" in row ? row.desc : galleryPlainText(row.desc)) || "-"}</Text></Table.Td>
          <Table.Td>{"sortOrder" in row ? row.sortOrder : new Date(row.updated).toLocaleDateString("mn-MN")}</Table.Td>
          <Table.Td><Group justify="flex-end"><Menu position="bottom-end"><Menu.Target><ActionIcon variant="subtle" color="gray" aria-label={`${rowName(row)} үйлдэл`}><IconDotsVertical size={18} /></ActionIcon></Menu.Target><Menu.Dropdown>
            {"name" in row && <Menu.Item component={Link} to={`/galleries/${row.id}`} leftSection={<IconPhoto size={16} />}>Зургууд</Menu.Item>}
            <Menu.Item leftSection={<IconEdit size={16} />} onClick={() => setTarget(row)}>Засах</Menu.Item><Menu.Item color="red" leftSection={<IconTrash size={16} />} onClick={() => { setDeleteError(""); setDeleting(row); }}>Устгах</Menu.Item>
          </Menu.Dropdown></Menu></Group></Table.Td>
        </Table.Tr>)}{!visible.length && <Table.Tr><Table.Td colSpan={galleryId ? 5 : 4}><Text ta="center" py={48} c="dimmed">Бүртгэл олдсонгүй</Text></Table.Td></Table.Tr>}</Table.Tbody>
      </Table></Table.ScrollContainer>}
      <Group justify="space-between"><Text size="sm" c="dimmed">{page}-р хуудас</Text><Group gap="xs">
        <Tooltip label="Өмнөх хуудас"><ActionIcon variant="default" aria-label="Өмнөх хуудас" disabled={loading || page <= 1} onClick={() => goPage(page - 1)}><IconChevronLeft size={18} /></ActionIcon></Tooltip>
        <Tooltip label="Дараах хуудас"><ActionIcon variant="default" aria-label="Дараах хуудас" disabled={loading || Boolean(error) || rows.length <= GALLERY_PAGE_SIZE || page >= Math.floor(2147483647 / GALLERY_PAGE_SIZE)} onClick={() => goPage(page + 1)}><IconChevronRight size={18} /></ActionIcon></Tooltip>
      </Group></Group>
    </Stack></PageBody>
    <Modal opened={target !== null} onClose={closeForm} title={`${galleryId ? "Item" : "Gallery"} ${target === "new" ? "нэмэх" : "засах"}`} size="lg" withCloseButton={!busy} closeOnClickOutside={!busy} closeOnEscape={!busy}>
      {target !== null && <GalleryForm key={target === "new" ? "new" : target.id} row={target === "new" ? undefined : target} itemMode={Boolean(galleryId)} onBusy={setBusy} onCancel={closeForm} onSave={async (galleryBody, itemBody) => {
        if (galleryId) {
          if (target === "new") await apiClient.call(GalleryItems.create, { params: { galleryId }, body: GalleryItems.createBody.parse(itemBody) });
          else {
            const { imageId, ...metadata } = itemBody;
            await apiClient.call(GalleryItems.update, { params: { galleryId, id: target.id }, body: GalleryItems.updateBody.parse(metadata) });
          }
        } else {
          if (target === "new") await apiClient.call(Galleries.create, { body: Galleries.createBody.parse(galleryBody) });
          else await apiClient.call(Galleries.update, { params: { id: target.id }, body: Galleries.createBody.parse(galleryBody) });
        }
        setTarget(null); setNotice("Хадгаллаа."); setReload((v) => v + 1);
      }} />}
    </Modal>
    <Modal opened={deleting !== null} onClose={() => { if (!deleteBusy) setDeleting(null); }} title="Устгах" withCloseButton={!deleteBusy} closeOnClickOutside={!deleteBusy} closeOnEscape={!deleteBusy}>
      <Stack>{deleteError && <Alert color="red" role="alert">{deleteError}</Alert>}<Text>{deleting ? rowName(deleting) : ""} бүртгэлийг устгах уу?{!galleryId && " Доторх item-ууд хамт устна."} Эх файлууд хадгалагдана.</Text><Group justify="flex-end"><Button variant="default" disabled={deleteBusy} onClick={() => setDeleting(null)}>Болих</Button><Button color="red" loading={deleteBusy} leftSection={<IconTrash size={17} />} onClick={async () => {
        if (!deleting || deleteLock.current) return;
        deleteLock.current = true; setDeleteBusy(true); setDeleteError("");
        try {
          if (galleryId) await apiClient.call(GalleryItems.remove, { params: { galleryId, id: deleting.id } });
          else await apiClient.call(Galleries.remove, { params: { id: deleting.id } });
          setDeleting(null); setNotice("Устгалаа.");
          if (visible.length === 1 && page > 1) goPage(page - 1); else setReload((v) => v + 1);
        } catch (cause) { setDeleteError(galleryError(cause)); }
        finally { deleteLock.current = false; setDeleteBusy(false); }
      }}>Устгах</Button></Group></Stack>
    </Modal>
  </Stack>;
}
