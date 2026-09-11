import { Colors } from "@bigmotors/sysop-dti";
import { ActionIcon, Alert, Badge, Button, ColorSwatch, Group, Loader, Modal, NativeSelect, Stack, Table, Text, Tooltip } from "@mantine/core";
import { IconArrowLeft, IconCheck, IconChevronLeft, IconChevronRight, IconEdit, IconPalette, IconPlus, IconRefresh, IconTrash } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { apiClient } from "../../api/client";
import { PageBody } from "../../ui/PageBody";
import { ColorForm } from "./ColorForm";
import { COLOR_PAGE_SIZE, colorErrorMessage, colorListState } from "./model";

export function ColorsPage() {
  const [params, setParams] = useSearchParams();
  const { page, status } = colorListState(params);
  const [rows, setRows] = useState<Colors.Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);
  const [target, setTarget] = useState<Colors.Entity | "new" | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Colors.Entity | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const deleteLock = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    void apiClient.call(Colors.list, {
      query: { limit: COLOR_PAGE_SIZE + 1, offset: (page - 1) * COLOR_PAGE_SIZE, ...(status ? { isActive: status === "true" } : {}) },
    }, { signal: controller.signal }).then((data) => {
      if (!controller.signal.aborted) setRows(data);
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) { setRows([]); setError(colorErrorMessage(cause)); }
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [page, status, reload]);

  function goToPage(nextPage: number) {
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      if (nextPage === 1) next.delete("page"); else next.set("page", String(nextPage));
      return next;
    });
  }

  function closeForm() { if (!saving) setTarget(null); }
  const visibleRows = rows.slice(0, COLOR_PAGE_SIZE);

  return (
    <Stack gap="md">
      <Group><Button component={Link} to="/references" variant="subtle" leftSection={<IconArrowLeft size={17} />}>Лавлах</Button></Group>
      <PageBody>
        <Stack gap="lg">
          <Group justify="space-between" align="flex-end">
            <NativeSelect label="Төлөв" value={status} data={[{ value: "", label: "Бүх төлөв" }, { value: "true", label: "Идэвхтэй" }, { value: "false", label: "Идэвхгүй" }]} onChange={(event) => {
              const value = event.currentTarget.value;
              setParams((previous) => { const next = new URLSearchParams(previous); next.delete("page"); if (value) next.set("isActive", value); else next.delete("isActive"); return next; });
            }} />
            <Group gap="sm">
              <Tooltip label="Шинэчлэх"><ActionIcon variant="default" size={36} aria-label="Жагсаалт шинэчлэх" disabled={loading} onClick={() => setReload((value) => value + 1)}><IconRefresh size={18} /></ActionIcon></Tooltip>
              <Button leftSection={<IconPlus size={18} />} onClick={() => { setNotice(""); setTarget("new"); }}>Өнгө нэмэх</Button>
            </Group>
          </Group>
          {notice && <Alert color="teal" role="status" icon={<IconCheck size={18} />} withCloseButton closeButtonLabel="Мэдэгдэл хаах" onClose={() => setNotice("")}>{notice}</Alert>}
          {error && <Alert color="red" role="alert"><Stack gap="sm"><Text size="sm">{error}</Text><Button variant="light" color="red" onClick={() => setReload((value) => value + 1)} style={{ alignSelf: "flex-start" }}>Дахин оролдох</Button></Stack></Alert>}
          {loading ? <Group justify="center" mih={260} role="status" aria-label="Өнгө ачаалж байна"><Loader size="sm" /></Group> : !error && (
            <Table.ScrollContainer minWidth={690}>
              <Table aria-label="Өнгөний жагсаалт" verticalSpacing="md" horizontalSpacing="sm" highlightOnHover>
                <Table.Thead><Table.Tr><Table.Th>Өнгө</Table.Th><Table.Th>HEX</Table.Th><Table.Th>Дараалал</Table.Th><Table.Th>Төлөв</Table.Th><Table.Th ta="right">Үйлдэл</Table.Th></Table.Tr></Table.Thead>
                <Table.Tbody>
                  {visibleRows.map((color) => (
                    <Table.Tr key={color.id}>
                      <Table.Td maw={360}><Group wrap="nowrap" gap="sm">
                        {color.hexCode ? <ColorSwatch color={color.hexCode} size={26} style={{ flexShrink: 0 }} /> : <IconPalette size={26} color="gray" style={{ flexShrink: 0 }} />}
                        <Stack gap={3} miw={0}><Text size="sm" fw={500} style={{ overflowWrap: "anywhere" }}>{color.name}</Text>{color.description && <Text size="xs" c="dimmed" lineClamp={2} style={{ overflowWrap: "anywhere" }}>{color.description}</Text>}</Stack>
                      </Group></Table.Td>
                      <Table.Td><Text size="sm" ff="monospace">{color.hexCode ?? "—"}</Text></Table.Td>
                      <Table.Td>{color.sortOrder}</Table.Td>
                      <Table.Td><Badge color={color.isActive ? "teal" : "gray"} variant="light">{color.isActive ? "Идэвхтэй" : "Идэвхгүй"}</Badge></Table.Td>
                      <Table.Td><Group justify="flex-end" gap={6} wrap="nowrap">
                        <Tooltip label="Засах"><ActionIcon variant="subtle" color="gray" aria-label={`${color.name} засах`} onClick={() => { setNotice(""); setTarget(color); }}><IconEdit size={18} /></ActionIcon></Tooltip>
                        <Tooltip label="Устгах"><ActionIcon variant="subtle" color="red" aria-label={`${color.name} устгах`} onClick={() => { setDeleteError(""); setNotice(""); setDeleting(color); }}><IconTrash size={18} /></ActionIcon></Tooltip>
                      </Group></Table.Td>
                    </Table.Tr>
                  ))}
                  {!visibleRows.length && <Table.Tr><Table.Td colSpan={5}><Stack align="center" py={48}><IconPalette size={28} color="gray" /><Text c="dimmed">Өнгө олдсонгүй</Text></Stack></Table.Td></Table.Tr>}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          )}
          <Group justify="space-between">
            <Text size="sm" c="dimmed">{page}-р хуудас{!loading && !error ? ` · ${visibleRows.length} өнгө` : ""}</Text>
            <Group gap="xs">
              <Tooltip label="Өмнөх хуудас"><ActionIcon variant="default" size={32} aria-label="Өмнөх хуудас" disabled={loading || page === 1} onClick={() => goToPage(page - 1)}><IconChevronLeft size={18} /></ActionIcon></Tooltip>
              <Tooltip label="Дараах хуудас"><ActionIcon variant="default" size={32} aria-label="Дараах хуудас" disabled={loading || Boolean(error) || rows.length <= COLOR_PAGE_SIZE || page >= Math.floor(2147483647 / COLOR_PAGE_SIZE) + 1} onClick={() => goToPage(page + 1)}><IconChevronRight size={18} /></ActionIcon></Tooltip>
            </Group>
          </Group>
        </Stack>
      </PageBody>
      <Modal opened={target !== null} onClose={closeForm} title={target === "new" ? "Өнгө нэмэх" : "Өнгө засах"} size="lg" centered closeOnClickOutside={!saving} closeOnEscape={!saving} withCloseButton={!saving}>
        {target !== null && <ColorForm key={target === "new" ? "new" : target.id} color={target === "new" ? undefined : target} saving={saving} onSavingChange={setSaving}
          onCancel={closeForm}
          onSave={async (body) => {
            if (target === "new") await apiClient.call(Colors.create, { body });
            else await apiClient.call(Colors.update, { params: { id: target.id }, body });
            setTarget(null);
            setNotice("Өнгийг хадгаллаа.");
            setReload((value) => value + 1);
          }} />}
      </Modal>
      <Modal opened={deleting !== null} onClose={() => { if (!deleteBusy) setDeleting(null); }} title="Өнгө устгах" centered closeOnClickOutside={!deleteBusy} closeOnEscape={!deleteBusy} withCloseButton={!deleteBusy}>
        <Stack gap="lg">
          {deleteError && <Alert color="red" role="alert">{deleteError}</Alert>}
          <Text style={{ overflowWrap: "anywhere" }}>“{deleting?.name}” өнгийг устгах уу?</Text>
          <Group justify="flex-end"><Button variant="default" disabled={deleteBusy} onClick={() => setDeleting(null)}>Болих</Button><Button color="red" loading={deleteBusy} leftSection={<IconTrash size={17} />} onClick={async () => {
            if (!deleting || deleteLock.current) return;
            deleteLock.current = true; setDeleteBusy(true); setDeleteError("");
            try {
              await apiClient.call(Colors.remove, { params: { id: deleting.id } });
              setDeleting(null); setNotice("Өнгийг устгалаа.");
              if (visibleRows.length === 1 && page > 1) goToPage(page - 1);
              else setReload((value) => value + 1);
            } catch (cause) { setDeleteError(colorErrorMessage(cause)); }
            finally { deleteLock.current = false; setDeleteBusy(false); }
          }}>Устгах</Button></Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
