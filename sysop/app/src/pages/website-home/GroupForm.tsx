import { DRIVETRAINS, FUEL_TYPES, STEERING_POSITIONS, TRANSMISSIONS, VEHICLE_CONDITIONS, type VehicleSearchField } from "@bigmotors/core";
import { HomeProductGroups } from "@bigmotors/sysop-dti";
import { Alert, Button, Divider, Group, Image, Loader, NumberInput, Select, SimpleGrid, Stack, Switch, Text, Textarea, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconDeviceFloppy, IconTrash, IconUpload } from "@tabler/icons-react";
import { useRef, useState } from "react";
import { FileUploadDialog } from "../../files/FileUploadDialog";
import { fileUrl } from "../../files/client";
import { lookupOptions, useVehicleLookups } from "../vehicles/useVehicleLookups";
import { options } from "../vehicles/model";
import { filterLabels, groupError, groupErrors, groupInitialValues, groupRawBody, rangeFields } from "./model";

export function GroupForm({ row, onSave, onCancel, onBusy }: {
  row?: HomeProductGroups.Entity; onSave: (body: ReturnType<typeof HomeProductGroups.createBody.parse>) => Promise<void>; onCancel: () => void; onBusy: (busy: boolean) => void;
}) {
  const [revision, setRevision] = useState(0);
  const lookups = useVehicleLookups(revision);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const form = useForm({ initialValues: groupInitialValues(row), validate: groupErrors });
  const busy = saving || uploading;
  const filters = form.values.filters;
  const data = lookups.data;
  const brand = data?.["vehicle-brands"].find((item) => item.id === filters.brand);
  const model = data?.["vehicle-models"].find((item) => item.id === filters.model);
  const sourceOptions = (key: "vehicle-brands" | "vehicle-models" | "vehicle-variants" | "vehicle-body-types" | "colors", field: VehicleSearchField) => {
    let rows = data?.[key] ?? [];
    if (field === "model" && filters.brand) rows = rows.filter((item) => item.brandId === filters.brand);
    if (field === "variant") {
      const modelIds = new Set((data?.["vehicle-models"] ?? []).filter((item) => !filters.brand || item.brandId === filters.brand).map((item) => item.id));
      rows = rows.filter((item) => filters.model ? item.modelId === filters.model : item.modelId && modelIds.has(item.modelId));
    }
    const selected = String(filters[field] ?? "");
    const choices = lookupOptions(rows, [selected], field === "model" && brand ? [brand] : field === "variant" ? [brand, model].filter((item) => item !== undefined) : []);
    if (selected && !choices.some((item) => item.value === selected)) choices.push({ value: selected, label: "Олдохгүй лавлах", disabled: true });
    return choices;
  };

  return <>
    <form noValidate onSubmit={form.onSubmit(async (values) => {
      if (lock.current || uploading || !data) return;
      lock.current = true; setSaving(true); onBusy(true); setError("");
      try { await onSave(HomeProductGroups.createBody.parse(groupRawBody(values))); }
      catch (cause) { setError(groupError(cause)); }
      finally { lock.current = false; setSaving(false); onBusy(false); }
    })}>
      <Stack>
        {error && <Alert color="red" role="alert">{error}</Alert>}
        <TextInput label="Гарчиг" required maxLength={255} disabled={busy} {...form.getInputProps("title")} />
        <Textarea label="Тайлбар" maxLength={512} rows={2} disabled={busy} {...form.getInputProps("description")} />
        {form.values.imageId && <Image src={fileUrl({ id: form.values.imageId, originalName: "image" }, 1280)} w="100%" maw={400} h="auto" style={{ aspectRatio: "4 / 3" }} fit="cover" alt={form.values.title || "Бүлгийн зураг"} />}
        <Group><Button variant="light" leftSection={<IconUpload size={17} />} disabled={busy} onClick={() => setUploadOpen(true)}>{form.values.imageId ? "Зураг солих" : "Зураг нэмэх"}</Button>
          {form.values.imageId && <Button variant="subtle" color="red" leftSection={<IconTrash size={17} />} disabled={busy} onClick={() => form.setFieldValue("imageId", null)}>Зураг хасах</Button>}
        </Group>
        <SimpleGrid cols={{ base: 1, sm: 2 }}><NumberInput label="Дараалал" required min={-2147483648} max={2147483647} allowDecimal={false} disabled={busy} {...form.getInputProps("sortOrder")} /><Switch mt={{ sm: 28 }} label="Идэвхтэй" disabled={busy} {...form.getInputProps("isActive", { type: "checkbox" })} /></SimpleGrid>
        <Divider /><Text fw={600}>Хайлтын нөхцөл</Text>
        {lookups.error ? <Alert color="red" role="alert">{lookups.error}<Button variant="subtle" onClick={() => setRevision((v) => v + 1)}>Дахин оролдох</Button></Alert> : !data && <Group justify="center"><Loader size="sm" /></Group>}
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          {([ ["brand", "vehicle-brands"], ["model", "vehicle-models"], ["variant", "vehicle-variants"], ["category", "vehicle-body-types"], ["color", "colors"] ] as const).map(([field, source]) => <Select key={field} label={filterLabels[field]} placeholder="Бүгд" searchable clearable disabled={busy || !data} data={sourceOptions(source, field)} value={String(filters[field] || "") || null} error={form.errors[`filters.${field}`]} onChange={(value) => {
            form.setFieldValue(`filters.${field}`, value ?? "");
            if (field === "brand") { form.setFieldValue("filters.model", ""); form.setFieldValue("filters.variant", ""); }
            if (field === "model") form.setFieldValue("filters.variant", "");
          }} />)}
          {([ ["condition", VEHICLE_CONDITIONS], ["fuel", FUEL_TYPES], ["transmission", TRANSMISSIONS], ["drivetrain", DRIVETRAINS], ["steering", STEERING_POSITIONS] ] as const).map(([field, values]) => <Select key={field} label={filterLabels[field]} placeholder="Бүгд" clearable disabled={busy} data={options(values)} value={filters[field] || null} error={form.errors[`filters.${field}`]} onChange={(value) => form.setFieldValue(`filters.${field}`, value ?? "")} />)}
          {rangeFields.flatMap(({ key, min, max }) => (["min", "max"] as const).map((bound) => <NumberInput key={`${key}_${bound}`} label={filterLabels[`${key}_${bound}`]} min={min} max={max} allowNegative={false} allowDecimal={false} thousandSeparator={key !== "year" ? "," : undefined} disabled={busy} {...form.getInputProps(`filters.${key}_${bound}`)} value={filters[`${key}_${bound}`] ?? ""} onChange={(value) => form.setFieldValue(`filters.${key}_${bound}`, String(value))} />))}
        </SimpleGrid>
        <Group justify="flex-end"><Button variant="default" disabled={busy} onClick={onCancel}>Болих</Button><Button type="submit" loading={saving} disabled={uploading || !data || !!lookups.error} leftSection={<IconDeviceFloppy size={17} />}>Хадгалах</Button></Group>
      </Stack>
    </form>
    <FileUploadDialog opened={uploadOpen} multiple={false} onClose={() => setUploadOpen(false)} onBusy={(value) => { setUploading(value); onBusy(value); }} onUploaded={(file) => form.setFieldValue("imageId", file.id)} />
  </>;
}
