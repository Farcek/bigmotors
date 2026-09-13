import { ActionIcon, Alert, Badge, Box, Button, Checkbox, Fieldset, Group, Image, Menu, Modal, MultiSelect, NumberInput, ScrollArea, Select, SimpleGrid, Stack, Tabs, Text, Textarea, TextInput, Tooltip } from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconArrowDown, IconArrowLeft, IconArrowUp, IconDotsVertical, IconPhotoPlus, IconTrash, IconDeviceFloppy } from "@tabler/icons-react";
import { CURRENCIES, DRIVETRAINS, FUEL_TYPES, PRICE_DISPLAY_MODES, STEERING_POSITIONS, TRANSMISSIONS, VEHICLE_ARRIVAL_STATUSES, VEHICLE_CONDITIONS, VEHICLE_SALE_STATUSES, CATALOG_LIMITS } from "@bigmotors/core";
import { Vehicles, type Files } from "@bigmotors/sysop-dti";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useBeforeUnload, useBlocker } from "react-router";
import { apiClient } from "../../api/client";
import { fileUrl } from "../../files/client";
import { FileUploadDialog } from "../../files/FileUploadDialog";
import { PageBody } from "../../ui/PageBody";
import { availableCommands, changedPayload, commandLabels, initialValues, labels, options, statusColor, validateVehicle, valueLabels, vehicleError, vehiclePayload, type VehicleCommand, type VehicleValues } from "./model";
import { lookupOptions, type VehicleLookups } from "./useVehicleLookups";
import { VehicleCommandModal } from "./VehicleCommandModal";
import { VehicleContentEditor } from "./VehicleContentEditor";
import { vehicleFieldTab, vehicleTabs } from "./form-tabs";

export function VehicleForm({ row, lookups, back, tab, onTabChange: setTab, onSaved }: { row?: Vehicles.Entity; lookups: VehicleLookups; back: string; tab: string; onTabChange: (tab: string | null) => void; onSaved: (row: Vehicles.Entity) => void }) {
  const [initial] = useState(() => initialValues(row));
  const form = useForm<VehicleValues>({ initialValues: initial, validate: (values) => validateVehicle(values, row?.publicationStatus === "published") });
  const [busy, setBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<"images" | "mainImageId" | "itemImageId" | null>(null);
  const tabButtons = useRef<Record<string, HTMLButtonElement | null>>({});
  useEffect(() => { if (tab) tabButtons.current[tab]?.scrollIntoView({ block: "nearest", inline: "nearest" }); }, [tab]);
  const [error, setError] = useState("");
  const [command, setCommand] = useState<VehicleCommand | null>(null);
  const lock = useRef(false);
  const allowLeave = useRef(false);
  const [files, setFiles] = useState<Files.UploadResult[]>(() => {
    const entries = [row?.mainImage, row?.itemImage, ...row?.images.map((item) => item.file) ?? []].filter((file): file is Files.UploadResult => !!file);
    return [...new Map(entries.map((file) => [file.id, file])).values()];
  });
  const dirty = form.isDirty();
  const disabled = busy || uploadBusy || command !== null;
  const blocker = useBlocker(() => !allowLeave.current && (form.isDirty() || lock.current || uploadBusy));
  useBeforeUnload(useCallback((event) => { if (!allowLeave.current && (dirty || busy || uploadBusy)) { event.preventDefault(); event.returnValue = ""; } }, [dirty, busy, uploadBusy]));
  const selectedBrand = lookups["vehicle-brands"].filter((item) => item.id === form.values.brandId);
  const selectedModel = lookups["vehicle-models"].filter((item) => item.id === form.values.modelId);
  function lookup(field: keyof VehicleValues, key: keyof VehicleLookups, parent?: "brandId" | "modelId") {
    const rows = parent ? lookups[key].filter((item) => item[parent] === form.values[parent]) : lookups[key];
    const retained = initial[field] ? [String(initial[field])] : [];
    const ancestors = field === "modelId" ? selectedBrand : field === "variantId" ? [...selectedBrand, ...selectedModel] : [];
    return <Select key={field} label={labels[field]} data={lookupOptions(rows, retained, ancestors)} searchable clearable disabled={!!parent && !form.values[parent]} {...form.getInputProps(field)} onChange={(value) => {
      form.setFieldValue(field, value);
      if (field === "brandId") { form.setFieldValue("modelId", null); form.setFieldValue("variantId", null); }
      if (field === "modelId") form.setFieldValue("variantId", null);
    }} />;
  }
  function enumeration(field: keyof VehicleValues, values: readonly string[]) {
    return <Select key={field} label={labels[field]} data={options(values)} clearable {...form.getInputProps(field)} onChange={(value) => {
      form.setFieldValue(field, value);
      if (field === "fuelType" && value === "electric") form.setFieldValue("engineCapacityCc", "");
    }} />;
  }
  function number(field: keyof VehicleValues, min: number, max: number, disabled = false) {
    return <NumberInput key={field} label={labels[field]} min={min} max={max} allowDecimal={false} allowNegative={false} thousandSeparator="," disabled={disabled} {...form.getInputProps(field)} />;
  }
  function uploaded(file: Files.UploadResult) {
    setFiles((current) => [...current, file]);
    form.setFieldValue("images", (current) => [...current, { fileId: file.id, sortOrder: current.length }]);
    if (uploadTarget && uploadTarget !== "images") form.setFieldValue(uploadTarget, file.id);
  }
  function reorder(index: number, direction: number) {
    const images = [...form.values.images];
    [images[index], images[index + direction]] = [images[index + direction], images[index]];
    form.setFieldValue("images", images.map((image, sortOrder) => ({ ...image, sortOrder })));
  }
  async function save(values: VehicleValues) {
    if (lock.current || uploadBusy) return;
    lock.current = true; setBusy(true); setError("");
    try {
      const changes = row ? changedPayload(values, initial) : null;
      if (changes && !Object.keys(changes).length) { form.resetDirty(values); return; }
      const result = row ? await apiClient.call(Vehicles.update, { params: { id: row.id }, body: changes! }) : await apiClient.call(Vehicles.create, { body: vehiclePayload(values) });
      allowLeave.current = true; form.resetDirty(values); onSaved(result);
    } catch (cause) { setError(vehicleError(cause)); }
    finally { lock.current = false; setBusy(false); }
  }
  const fileOptions = files.map((file) => ({ value: file.id, label: file.title || file.originalName }));
  const galleryOptions = fileOptions.filter((file) => !form.values.images.some((image) => image.fileId === file.value));
  function imageField(field: "mainImageId" | "itemImageId") {
    const file = files.find((entry) => entry.id === form.values[field]);
    return <Stack gap="sm">
      <Group align="flex-end"><Select flex={1} miw={180} label={labels[field]} searchable clearable data={fileOptions} {...form.getInputProps(field)} /><Button variant="light" leftSection={<IconPhotoPlus size={18} />} onClick={() => setUploadTarget(field)}>Upload</Button></Group>
      {file && <Image src={fileUrl(file)} w="100%" maw={400} h={240} fit="contain" alt={file.title || labels[field]} />}
    </Stack>;
  }
  return <Stack>
    <Group justify="space-between"><Button component={Link} to={back} variant="subtle" leftSection={<IconArrowLeft size={16} />} disabled={disabled}>Жагсаалт</Button>
      <Group><Badge color={statusColor[row?.publicationStatus ?? "draft"]}>{valueLabels[row?.publicationStatus ?? "draft"]}</Badge>
        {row && <Menu position="bottom-end"><Menu.Target><ActionIcon variant="default" aria-label="Бүртгэлийн үйлдлүүд" disabled={dirty || disabled}><IconDotsVertical size={18} /></ActionIcon></Menu.Target><Menu.Dropdown>{availableCommands(row.publicationStatus).map((action) => <Menu.Item key={action} color={action === "archive" ? "red" : undefined} onClick={() => setCommand(action)}>{commandLabels[action]}</Menu.Item>)}</Menu.Dropdown></Menu>}
      </Group>
    </Group>
    <Tabs value={tab} onChange={setTab}>
      <ScrollArea scrollbars="x" type="auto" offsetScrollbars="x" mb="md"><Tabs.List w="max-content" miw="100%">{vehicleTabs.map(({ value, label }) => <Tabs.Tab key={value} value={value} ref={(node) => { tabButtons.current[value] = node; }}>{label}</Tabs.Tab>)}</Tabs.List></ScrollArea>
      <Box maw={850}><PageBody><form noValidate onSubmit={form.onSubmit((values) => void save(values), (errors) => {
        const key = Object.keys(errors)[0]; setTab(vehicleFieldTab(key));
        setError("Тэмдэглэсэн талбаруудыг шалгана уу.");
        window.setTimeout(() => form.getInputNode(key)?.focus(), 0);
      })}>
        <Stack>{error && <Alert color="red" role="alert">{error}</Alert>}
          <Fieldset disabled={disabled} variant="unstyled">
            <Tabs.Panel value="basic"><Stack>
              <TextInput label={labels.title} maxLength={255} required {...form.getInputProps("title")} />
              <Textarea label={labels.description} maxLength={512} minRows={3} {...form.getInputProps("description")} />
              {imageField("mainImageId")}
            </Stack></Tabs.Panel>
            <Tabs.Panel value="vehicle"><Stack><SimpleGrid cols={{ base: 1, sm: 2 }}>
              {lookup("brandId", "vehicle-brands")}{lookup("modelId", "vehicle-models", "brandId")}{lookup("variantId", "vehicle-variants", "modelId")}{lookup("bodyTypeId", "vehicle-body-types")}
              {(["manufactureYear", "importYear"] as const).map((field) => <TextInput key={field} label={labels[field]} inputMode="numeric" maxLength={4} {...form.getInputProps(field)} />)}
              <TextInput label={labels.vin} {...form.getInputProps("vin")} />
              {enumeration("condition", VEHICLE_CONDITIONS)}{number("mileageKm", 0, CATALOG_LIMITS.mileageMax)}
            </SimpleGrid><Textarea label={labels.conditionDescription} maxLength={512} minRows={3} {...form.getInputProps("conditionDescription")} /></Stack></Tabs.Panel>
            <Tabs.Panel value="specs"><Stack><SimpleGrid cols={{ base: 1, sm: 2 }}>
              {enumeration("fuelType", FUEL_TYPES)}{number("engineCapacityCc", 1, CATALOG_LIMITS.engineCapacityMax, form.values.fuelType === "electric")}
              {enumeration("transmission", TRANSMISSIONS)}{enumeration("drivetrain", DRIVETRAINS)}{enumeration("steeringPosition", STEERING_POSITIONS)}{number("seatCount", 1, 100)}
              {lookup("exteriorColorId", "colors")}{lookup("interiorColorId", "colors")}
            </SimpleGrid><MultiSelect label={labels.featureIds} searchable clearable data={lookupOptions(lookups["vehicle-features"], initial.featureIds)} {...form.getInputProps("featureIds")} /></Stack></Tabs.Panel>
            <Tabs.Panel value="sales"><Stack>
              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                {enumeration("priceDisplayMode", PRICE_DISPLAY_MODES)}
                {number("price", CATALOG_LIMITS.priceMin, CATALOG_LIMITS.priceMax)}{enumeration("currency", CURRENCIES)}
                <Select label={labels.financingAvailable} data={[{ value: "", label: "Тодорхойгүй" }, { value: "true", label: "Боломжтой" }, { value: "false", label: "Боломжгүй" }]} {...form.getInputProps("financingAvailable")} />
                {enumeration("saleStatus", VEHICLE_SALE_STATUSES)}{enumeration("arrivalStatus", VEHICLE_ARRIVAL_STATUSES)}
                {lookup("branchId", "branches")}{lookup("locationId", "locations")}
              </SimpleGrid><Textarea label={labels.internalNote} minRows={3} {...form.getInputProps("internalNote")} />
            </Stack></Tabs.Panel>
            <Tabs.Panel value="images"><Stack>
              <TextInput label={labels.youtubeUrl} type="url" maxLength={2048} placeholder="https://www.youtube.com/watch?v=..." {...form.getInputProps("youtubeUrl")} />
              <Group justify="space-between"><Text fw={600}>Зургууд ({form.values.images.length})</Text><Button leftSection={<IconPhotoPlus size={18} />} onClick={() => setUploadTarget("images")}>Файл нэмэх</Button></Group>
              {galleryOptions.length > 0 && <Select label="Галерейд нэмэх" searchable data={galleryOptions} value={null} onChange={(fileId) => { if (fileId) form.setFieldValue("images", [...form.values.images, { fileId, sortOrder: form.values.images.length }]); }} />}
              {form.errors.images && <Text c="red" size="sm">{form.errors.images}</Text>}
              {!form.values.images.length && <Text c="dimmed" py="lg" ta="center">Зураг байхгүй</Text>}
              {form.values.images.map((image, index) => { const file = files.find((file) => file.id === image.fileId); return <Group key={image.fileId} wrap="nowrap" py="sm" align="flex-start">
                {file && <Image src={fileUrl(file)} w={64} h={64} fit="contain" alt={file.title || file.originalName} />}
                <Box flex={1} miw={0}><Text size="sm" fw={500} style={{ overflowWrap: "anywhere" }}>{file?.title || file?.originalName || image.fileId}</Text><Text size="xs" c="dimmed" style={{ overflowWrap: "anywhere" }}>{file?.description}</Text></Box>
                <Group gap={4} wrap="nowrap">{([-1, 1] as const).map((direction) => <Tooltip key={direction} label={direction < 0 ? "Дээш" : "Доош"}><ActionIcon variant="default" aria-label={direction < 0 ? "Дээш" : "Доош"} disabled={direction < 0 ? index === 0 : index === form.values.images.length - 1} onClick={() => reorder(index, direction)}>{direction < 0 ? <IconArrowUp size={16} /> : <IconArrowDown size={16} />}</ActionIcon></Tooltip>)}<Tooltip label="Галерейгаас хасах"><ActionIcon variant="subtle" color="red" aria-label="Галерейгаас хасах" onClick={() => form.setFieldValue("images", form.values.images.filter((_, i) => i !== index).map((entry, sortOrder) => ({ ...entry, sortOrder })))}><IconTrash size={16} /></ActionIcon></Tooltip></Group>
              </Group>; })}
            </Stack></Tabs.Panel>
            <Tabs.Panel value="content"><Stack>
              <VehicleContentEditor value={initial.content} onChange={(html) => form.setFieldValue("content", html)} disabled={disabled} error={form.errors.content} />
            </Stack></Tabs.Panel>
            <Tabs.Panel value="card"><Stack>
              <TextInput label={labels.itemTitle} maxLength={255} placeholder="Үндсэн гарчиг" {...form.getInputProps("itemTitle")} />
              <Textarea label={labels.itemDesc} maxLength={512} placeholder="Товч тайлбар" {...form.getInputProps("itemDesc")} />
              {imageField("itemImageId")}
              <Checkbox label={labels.isFeatured} {...form.getInputProps("isFeatured", { type: "checkbox" })} />
            </Stack></Tabs.Panel>
          </Fieldset>
          <Group justify="flex-end" mt="md"><Button component={Link} to={back} variant="default" disabled={disabled}>Болих</Button><Button type="submit" leftSection={<IconDeviceFloppy size={16} />} loading={busy} disabled={uploadBusy || command !== null || (!!row && !dirty)}>Хадгалах</Button></Group>
        </Stack>
      </form></PageBody></Box>
    </Tabs>
    <FileUploadDialog opened={uploadTarget !== null} multiple={uploadTarget === "images"} onClose={() => setUploadTarget(null)} onUploaded={uploaded} onBusy={setUploadBusy} />
    {row && command && <VehicleCommandModal target={{ row, command }} onClose={() => setCommand(null)} onDone={(result) => { allowLeave.current = true; setCommand(null); onSaved(result); }} />}
    <Modal opened={blocker.state === "blocked"} onClose={() => blocker.state === "blocked" && blocker.reset()} title="Хадгалаагүй өөрчлөлт" closeOnClickOutside={false}><Stack><Text>{disabled ? "Үйлдэл дуусахыг хүлээнэ үү." : "Өөрчлөлтийг хадгалахгүйгээр гарах уу?"}</Text><Group justify="flex-end"><Button variant="default" onClick={() => blocker.state === "blocked" && blocker.reset()}>Үлдэх</Button><Button color="red" disabled={disabled} onClick={() => blocker.state === "blocked" && blocker.proceed()}>Хадгалахгүй гарах</Button></Group></Stack></Modal>
  </Stack>;
}
