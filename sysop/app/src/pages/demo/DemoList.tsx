import { ActionIcon, Badge, Button, Group, Modal, NativeSelect, Pagination, Stack, Table, Text, TextInput, ThemeIcon, Tooltip } from "@mantine/core";
import { IconCar, IconEdit, IconPackage, IconPlus, IconSearch, IconTrash, IconWheel, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useDemo } from "./DemoLayout";
import { demoCategories, demoSortOptions, formatDemoPrice, getDemoList, type DemoProduct } from "./data";

const categoryIcons = { vehicle: IconCar, part: IconPackage, tire: IconWheel };
const categoryColors = { vehicle: "blue", part: "teal", tire: "grape" };

export function DemoListPage() {
  const { products, removeProduct } = useDemo();
  const [params, setParams] = useSearchParams();
  const [deleting, setDeleting] = useState<DemoProduct | null>(null);
  const result = getDemoList(products, params);
  const hasFilters = Boolean(params.get("q") || result.category || result.status || result.sort !== "default");

  function setQuery(key: string, value: string) {
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      if (value) next.set(key, value); else next.delete(key);
      if (key !== "page") next.delete("page");
      return next;
    }, { replace: key === "q" });
  }

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Text fw={600}>Бүтээгдэхүүн <Text component="span" c="dimmed" fw={400}>({products.length})</Text></Text>
        <Button component={Link} to="/demo/form" leftSection={<IconPlus size={18} />}>Нэмэх</Button>
      </Group>
      <div className="demo-list-toolbar">
        <TextInput label="Хайлт" placeholder="Нэр, бүртгэлийн дугаар" leftSection={<IconSearch size={17} />} value={params.get("q") ?? ""} onChange={(event) => setQuery("q", event.currentTarget.value)} />
        <NativeSelect label="Төрөл" data={[{ value: "", label: "Бүх төрөл" }, ...demoCategories]} value={result.category} onChange={(event) => setQuery("category", event.currentTarget.value)} />
        <NativeSelect label="Төлөв" data={[{ value: "", label: "Бүх төлөв" }, { value: "active", label: "Идэвхтэй" }, { value: "inactive", label: "Идэвхгүй" }]} value={result.status} onChange={(event) => setQuery("status", event.currentTarget.value)} />
        <NativeSelect label="Эрэмбэ" data={demoSortOptions} value={result.sort} onChange={(event) => setQuery("sort", event.currentTarget.value)} />
        <Tooltip label="Шүүлт цэвэрлэх">
          <ActionIcon variant="default" size={36} aria-label="Шүүлт цэвэрлэх" disabled={!hasFilters} onClick={() => setParams({})}><IconX size={18} /></ActionIcon>
        </Tooltip>
      </div>
      <Table.ScrollContainer minWidth={760}>
        <Table verticalSpacing="md" horizontalSpacing="sm" highlightOnHover aria-label="Жишээ бүтээгдэхүүний жагсаалт" className="demo-table">
          <Table.Thead><Table.Tr>
            <Table.Th>Бүтээгдэхүүн</Table.Th><Table.Th>Төрөл</Table.Th><Table.Th ta="right">Үнэ</Table.Th><Table.Th>Төлөв</Table.Th><Table.Th ta="right">Үйлдэл</Table.Th>
          </Table.Tr></Table.Thead>
          <Table.Tbody>
            {result.rows.map((item) => {
              const Icon = categoryIcons[item.category];
              return (
                <Table.Tr key={item.id}>
                  <Table.Td><Group wrap="nowrap" gap="sm">
                    <ThemeIcon size={38} radius="sm" variant="light" color={categoryColors[item.category]}><Icon size={21} /></ThemeIcon>
                    <Stack gap={3} miw={0}>
                      <Link className="demo-product-link" to={`/demo/form?id=${encodeURIComponent(item.id)}`}>{item.title}</Link>
                      <Text size="xs" c="dimmed" truncate maw={220}>{item.id}</Text>
                    </Stack>
                  </Group></Table.Td>
                  <Table.Td><Text size="sm">{demoCategories.find((category) => category.value === item.category)?.label}</Text></Table.Td>
                  <Table.Td ta="right" className="demo-price">{formatDemoPrice(item.price)}</Table.Td>
                  <Table.Td><Badge color={item.isActive ? "teal" : "gray"} variant="light">{item.isActive ? "Идэвхтэй" : "Идэвхгүй"}</Badge></Table.Td>
                  <Table.Td><Group justify="flex-end" gap={6} wrap="nowrap">
                    <Tooltip label="Засах"><ActionIcon component={Link} to={`/demo/form?id=${encodeURIComponent(item.id)}`} variant="subtle" color="gray" aria-label={`${item.title} засах`}><IconEdit size={18} /></ActionIcon></Tooltip>
                    <Tooltip label="Устгах"><ActionIcon variant="subtle" color="red" aria-label={`${item.title} устгах`} onClick={() => setDeleting(item)}><IconTrash size={18} /></ActionIcon></Tooltip>
                  </Group></Table.Td>
                </Table.Tr>
              );
            })}
            {result.total === 0 && <Table.Tr><Table.Td colSpan={5}><Stack align="center" py={48} gap="sm"><IconSearch size={28} color="gray" /><Text c="dimmed">Бүртгэл олдсонгүй</Text>{hasFilters && <Button variant="subtle" onClick={() => setParams({})}>Шүүлт цэвэрлэх</Button>}</Stack></Table.Td></Table.Tr>}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      <Group justify="space-between" gap="sm">
        <Text size="sm" c="dimmed" role="status">{result.total ? (result.page - 1) * result.pageSize + 1 : 0}–{Math.min(result.page * result.pageSize, result.total)} / {result.total} бүртгэл</Text>
        <Pagination total={result.pages} value={result.page} onChange={(page) => setQuery("page", String(page))} size="sm" siblings={0} getItemProps={(page) => ({ "aria-label": `${page}-р хуудас` })} getControlProps={(control) => ({ "aria-label": control === "next" ? "Дараах хуудас" : "Өмнөх хуудас" })} />
      </Group>
      <Modal opened={deleting !== null} onClose={() => setDeleting(null)} title="Жишээ бүртгэл устгах" centered>
        <Stack gap="lg">
          <Text style={{ overflowWrap: "anywhere" }}>“{deleting?.title}” бүртгэлийг устгах уу?</Text>
          <Group justify="flex-end"><Button variant="default" onClick={() => setDeleting(null)}>Болих</Button><Button color="red" leftSection={<IconTrash size={17} />} onClick={() => { if (deleting) removeProduct(deleting.id); setDeleting(null); }}>Устгах</Button></Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
