import { Accordion, ActionIcon, Alert, Badge, Box, Button, Group, Image, Loader, Menu, NumberInput, Pagination, Select, SimpleGrid, Stack, Table, Text, TextInput, Tooltip } from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconCar, IconDotsVertical, IconEdit, IconPlus, IconRefresh, IconSearch } from "@tabler/icons-react";
import { DRIVETRAINS, FUEL_TYPES, PRICE_DISPLAY_MODES, PUBLICATION_STATUSES, STEERING_POSITIONS, TRANSMISSIONS, VEHICLE_ARRIVAL_STATUSES, VEHICLE_CONDITIONS, VEHICLE_SALE_STATUSES } from "@bigmotors/core";
import { Vehicles } from "@bigmotors/sysop-dti";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { apiClient } from "../../api/client";
import { fileUrl } from "../../files/client";
import { PageBody } from "../../ui/PageBody";
import { availableCommands, commandLabels, labels, listQuery, options, statusColor, valueLabels, vehicleError, type VehicleCommand } from "./model";
import { lookupOptions, useVehicleLookups, type VehicleLookups } from "./useVehicleLookups";
import { VehicleCommandModal } from "./VehicleCommandModal";

const enumFilters = { condition: VEHICLE_CONDITIONS, saleStatus: VEHICLE_SALE_STATUSES, arrivalStatus: VEHICLE_ARRIVAL_STATUSES, fuelType: FUEL_TYPES, transmission: TRANSMISSIONS, drivetrain: DRIVETRAINS, steeringPosition: STEERING_POSITIONS, priceDisplayMode: PRICE_DISPLAY_MODES };
const lookupFilters: [string, keyof VehicleLookups][] = [["brandId", "vehicle-brands"], ["modelId", "vehicle-models"], ["variantId", "vehicle-variants"], ["bodyTypeId", "vehicle-body-types"], ["branchId", "branches"], ["locationId", "locations"]];
const sortValues = ["created_desc", "updated_desc", "title_asc", "price_asc", "price_desc", "year_desc", "mileage_asc"];
const filterDefaults: Record<string, string> = Object.fromEntries(["search", "sort", "publicationStatus", "isFeatured", "limit", "offset", ...Object.keys(enumFilters), ...lookupFilters.map(([field]) => field), "priceMin", "priceMax", "manufactureYearMin", "manufactureYearMax", "mileageKmMin", "mileageKmMax"].map((key) => [key, ""]));
const filterValues = (params: URLSearchParams): Record<string, string> => Object.fromEntries(Object.keys(filterDefaults).map((key) => [key, params.get(key) ?? ""]));
export function VehiclesPage() {
  const [params, setParams] = useSearchParams(); const queryString = params.toString();
  const parsed = listQuery(params);
  const form = useForm<Record<string, string>>({ initialValues: filterValues(params) });
  const [result, setResult] = useState<Vehicles.ListResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [notice, setNotice] = useState("");
  const [target, setTarget] = useState<{ row: Vehicles.ListItem; command: VehicleCommand } | null>(null);
  const lookups = useVehicleLookups(revision);
  const back = `/vehicles${queryString ? `?${queryString}` : ""}`;
  const editUrl = (id: string) => `/vehicles/${id}/edit?${new URLSearchParams({ returnTo: back })}`;
  useEffect(() => { form.setValues(filterValues(new URLSearchParams(queryString))); }, [queryString]);
  useEffect(() => {
    const controller = new AbortController(); const query = listQuery(new URLSearchParams(queryString));
    setResult(null); setError(""); setLoading(query.success);
    if (!query.success) { setError("Хайлтын нөхцөл буруу байна. Шүүлтээ шалгах эсвэл цэвэрлэнэ үү."); return; }
    void apiClient.call(Vehicles.list, { query: query.data }, { signal: controller.signal }).then((data) => {
      if (!controller.signal.aborted) {
        if (!data.items.length && data.total > 0 && query.data.offset >= data.total) {
          const next = new URLSearchParams(queryString); next.set("offset", String(Math.floor((data.total - 1) / query.data.limit) * query.data.limit)); setParams(next, { replace: true });
        } else setResult(data);
      }
    }).catch((cause: unknown) => { if (!controller.signal.aborted) setError(vehicleError(cause)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [queryString, revision]);
  function apply() {
    const next = new URLSearchParams(Object.entries(form.values).filter(([key, value]) => key !== "offset" && value !== "" && value != null));
    next.set("offset", "0");
    if (!listQuery(next).success) { setError("Хайлтын утга болон доод, дээд хязгаарыг шалгана уу."); return; }
    setParams(next); if (next.toString() === queryString) setRevision((value) => value + 1);
  }
  return <Stack>
    {notice && <Alert color="teal" role="status" withCloseButton onClose={() => setNotice("")}>{notice}</Alert>}
    <PageBody><Stack>
      <Group justify="space-between"><Text fw={600}>Автомашины бүртгэл</Text><Group gap="xs"><Tooltip label="Шинэчлэх"><ActionIcon aria-label="Шинэчлэх" variant="default" size="lg" onClick={() => setRevision((value) => value + 1)} disabled={loading}><IconRefresh size={18} /></ActionIcon></Tooltip><Button component={Link} to={`/vehicles/new?${new URLSearchParams({ returnTo: back })}`} leftSection={<IconPlus size={18} />}>Нэмэх</Button></Group></Group>
      <form onSubmit={(event) => { event.preventDefault(); apply(); }}><Stack gap="sm">
        <SimpleGrid cols={{ base: 1, sm: 3 }}><TextInput label="Хайлт" placeholder="Гарчиг, марк, загвар, хувилбар" maxLength={255} leftSection={<IconSearch size={16} />} value={form.values.search ?? ""} onChange={(event) => form.setFieldValue("search", event.currentTarget.value)} /><Select label="Нийтлэлийн төлөв" clearable data={options(PUBLICATION_STATUSES)} value={form.values.publicationStatus || null} onChange={(value) => form.setFieldValue("publicationStatus", value ?? "")} /><Select label="Эрэмбэ" data={options(sortValues)} value={form.values.sort || "created_desc"} onChange={(value) => form.setFieldValue("sort", value ?? "created_desc")} /></SimpleGrid>
        <Accordion variant="default"><Accordion.Item value="filters"><Accordion.Control>Дэлгэрэнгүй шүүлт</Accordion.Control><Accordion.Panel><Stack>
          {lookups.error && <Alert color="yellow">Лавлах ачаалж чадсангүй. Шинэчлэх товчоор дахин оролдоно уу.</Alert>}
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
            {lookupFilters.map(([field, source]) => {
              const parent = field === "modelId" ? "brandId" : field === "variantId" ? "modelId" : null;
              const rows = lookups.data?.[source].filter((item) => !parent || item[parent] === form.values[parent]) ?? [];
              return <Select key={field} label={labels[field]} searchable clearable data={lookupOptions(rows, [], [], false)} disabled={!lookups.data || (!!parent && !form.values[parent])} value={form.values[field] || null} onChange={(value) => { form.setFieldValue(field, value ?? ""); if (field === "brandId") { form.setFieldValue("modelId", ""); form.setFieldValue("variantId", ""); } if (field === "modelId") form.setFieldValue("variantId", ""); }} />;
            })}
            {Object.entries(enumFilters).map(([field, values]) => <Select key={field} label={labels[field]} clearable data={options(values)} value={form.values[field] || null} onChange={(value) => form.setFieldValue(field, value ?? "")} />)}
            <Select label="Онцлох" clearable data={[{ value: "true", label: "Тийм" }, { value: "false", label: "Үгүй" }]} value={form.values.isFeatured || null} onChange={(value) => form.setFieldValue("isFeatured", value ?? "")} />
            {[["price", "Үнэ"], ["manufactureYear", "Үйлдвэрлэсэн он"], ["mileageKm", "Гүйлт (км)"]].map(([field, label]) => <SimpleGrid key={field} cols={2}>{["Min", "Max"].map((suffix) => <NumberInput key={suffix} label={`${label}: ${suffix === "Min" ? "доод" : "дээд"}`} allowDecimal={false} allowNegative={false} hideControls value={form.values[field + suffix] ?? ""} onChange={(value) => form.setFieldValue(field + suffix, String(value))} />)}</SimpleGrid>)}
          </SimpleGrid>
        </Stack></Accordion.Panel></Accordion.Item></Accordion>
        <Group justify="flex-end"><Button variant="default" onClick={() => { form.setValues(filterDefaults); setParams({}); if (!queryString) setRevision((value) => value + 1); }}>Цэвэрлэх</Button><Button type="submit" leftSection={<IconSearch size={16} />}>Хайх</Button></Group>
      </Stack></form>
      {error && <Alert color="red" role="alert">{error}</Alert>}
      {loading ? <Group justify="center" py="xl"><Loader aria-label="Ачаалж байна" /></Group> : result && <>
        <Text size="sm" c="dimmed">Нийт {result.total} бүртгэл</Text>
        {!result.items.length ? <Text ta="center" c="dimmed" py="xl">Автомашин олдсонгүй</Text> : <Table.ScrollContainer minWidth={860}><Table verticalSpacing="sm" highlightOnHover><Table.Thead><Table.Tr>{["Автомашин", "Үнэ", "Нийтлэлийн төлөв", "Борлуулалт / ирэлт", ""].map((label, index) => <Table.Th key={index}>{label}</Table.Th>)}</Table.Tr></Table.Thead><Table.Tbody>
          {result.items.map((row) => { const file = row.itemImage ?? row.mainImage; return <Table.Tr key={row.id}>
            <Table.Td><Group wrap="nowrap"><Box w={64} miw={64}>{file ? <Image src={fileUrl(file, 120)} w={64} h={48} fit="cover" alt={row.itemTitle || row.title} /> : <IconCar size={36} color="gray" />}</Box><Box miw={0} maw={300}><Text component={Link} to={editUrl(row.id)} fw={500} size="sm" style={{ overflowWrap: "anywhere" }}>{row.title}</Text><Text size="xs" c="dimmed">{[row.manufactureYear, row.condition && valueLabels[row.condition], row.mileageKm != null && `${row.mileageKm.toLocaleString()} км`].filter((value) => value !== null && value !== false).join(" · ")}</Text></Box></Group></Table.Td>
            <Table.Td><Text size="sm" textWrap="nowrap">{row.price != null ? `${row.price.toLocaleString()} ₮` : "—"}</Text>{row.priceDisplayMode === "inquire" && <Text size="xs" c="dimmed">Үнэ асуух</Text>}</Table.Td>
            <Table.Td><Badge color={statusColor[row.publicationStatus]}>{valueLabels[row.publicationStatus]}</Badge>{row.isFeatured && <Text size="xs" c="teal">Онцлох</Text>}</Table.Td>
            <Table.Td><Text size="sm">{row.saleStatus ? valueLabels[row.saleStatus] : "—"}</Text><Text size="xs" c="dimmed">{row.arrivalStatus ? valueLabels[row.arrivalStatus] : "—"}</Text></Table.Td>
            <Table.Td><Menu position="bottom-end"><Menu.Target><ActionIcon variant="subtle" aria-label={`${row.title}: үйлдлүүд`}><IconDotsVertical size={18} /></ActionIcon></Menu.Target><Menu.Dropdown><Menu.Item component={Link} to={editUrl(row.id)} leftSection={<IconEdit size={16} />}>Засах</Menu.Item><Menu.Divider />{availableCommands(row.publicationStatus).map((command) => <Menu.Item key={command} color={command === "archive" ? "red" : undefined} onClick={() => setTarget({ row, command })}>{commandLabels[command]}</Menu.Item>)}</Menu.Dropdown></Menu></Table.Td>
          </Table.Tr>; })}
        </Table.Tbody></Table></Table.ScrollContainer>}
        {parsed.success && <Group justify="space-between"><Select aria-label="Хуудасны хэмжээ" w={90} data={["20", "50", "100"]} value={String(parsed.data.limit)} onChange={(value) => { const next = new URLSearchParams(params); next.set("limit", value ?? "20"); next.set("offset", "0"); setParams(next); }} /><Pagination total={Math.max(1, Math.ceil(result.total / parsed.data.limit))} value={Math.floor(parsed.data.offset / parsed.data.limit) + 1} siblings={0} onChange={(page) => { const next = new URLSearchParams(params); next.set("offset", String((page - 1) * parsed.data.limit)); setParams(next); }} /></Group>}
      </>}
    </Stack></PageBody>
    {target && <VehicleCommandModal target={target} onClose={() => setTarget(null)} onDone={() => { setTarget(null); setNotice("Төлөв шинэчлэгдлээ."); setRevision((value) => value + 1); }} />}
  </Stack>;
}
