import { Galleries, GalleryItems } from "@bigmotors/sysop-dti";
import { Alert, Button, Group, Image, NumberInput, Stack, Text, Textarea, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconDeviceFloppy, IconUpload } from "@tabler/icons-react";
import { useRef, useState } from "react";
import { FileUploadDialog } from "../../files/FileUploadDialog";
import { fileUrl } from "../../files/client";
import { HtmlEditor } from "../../ui/HtmlEditor";
import { galleryPlainText } from "./html";
import { galleryError } from "./model";

export type GalleryRow = Galleries.Entity | GalleryItems.ListEntity;

export function GalleryForm({ row, itemMode, onSave, onCancel, onBusy }: {
  row?: GalleryRow; itemMode: boolean;
  onSave: (gallery: Galleries.CreateBody, item: GalleryItems.CreateBody) => Promise<void>;
  onCancel: () => void; onBusy: (busy: boolean) => void;
}) {
  const item = row && "imageId" in row ? row : undefined;
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const form = useForm({
    initialValues: {
      key: row && "key" in row ? row.key : "",
      name: row && "name" in row ? row.name : "", desc: row?.desc ?? "",
      title: item?.title ?? "", label: item?.label ?? "", imageId: item?.imageId ?? "",
      linkUrl: item?.linkUrl ?? "", linkLabel: item?.linkLabel ?? "",
      sortOrder: (item?.sortOrder ?? 0) as number | string,
    },
    validate: (values) => {
      const result = itemMode
        ? GalleryItems.createBody.safeParse({ title: values.title, label: values.label, desc: values.desc, imageId: values.imageId, sortOrder: values.sortOrder, linkUrl: values.linkUrl, linkLabel: values.linkLabel })
        : Galleries.createBody.safeParse({ key: values.key, name: values.name, desc: values.desc });
      return result.success ? {} : Object.fromEntries(result.error.issues.map((issue) => [
        String(issue.path[0]),
        issue.path[0] === "imageId" ? "Зураг upload хийнэ үү."
          : itemMode && issue.code === "too_big" && ["label", "title", "desc"].includes(String(issue.path[0]))
            ? `HTML tag-уудтайгаа ${issue.path[0] === "desc" ? 512 : 255} тэмдэгтээс хэтрэхгүй байна.`
            : "Утгын урт болон хэлбэрийг шалгана уу.",
      ]));
    },
  });
  const busy = saving || uploading;
  return <>
    <form noValidate onSubmit={form.onSubmit(async (values) => {
      if (lock.current || uploading) return;
      lock.current = true; setSaving(true); onBusy(true); setError("");
      try {
        const gallery = { key: values.key, name: values.name, desc: values.desc };
        const item = { title: values.title, label: values.label, desc: values.desc, imageId: values.imageId, sortOrder: Number(values.sortOrder), linkUrl: values.linkUrl, linkLabel: values.linkLabel };
        await onSave(gallery, item);
      } catch (cause) { setError(galleryError(cause)); }
      finally { lock.current = false; setSaving(false); onBusy(false); }
    })}>
      <Stack gap="md">
        {error && <Alert color="red" role="alert">{error}</Alert>}
        {!itemMode && <>
          <TextInput label="Key" required maxLength={255} disabled={busy} {...form.getInputProps("key")} />
          <TextInput label="Нэр" required maxLength={255} disabled={busy} {...form.getInputProps("name")} />
        </>}
        {itemMode && <>
          {GalleryItems.createBody.shape.imageId.safeParse(form.values.imageId).success && <Image src={fileUrl({ id: form.values.imageId, originalName: "image" })} h={180} fit="contain" alt={galleryPlainText(form.values.title) || "Gallery зураг"} />}
          {!item && <Group justify="flex-end"><Button variant="light" leftSection={<IconUpload size={18} />} disabled={busy} aria-describedby={form.errors.imageId ? "gallery-image-error" : undefined} onClick={() => setUploadOpen(true)}>Зураг upload</Button></Group>}
          {form.errors.imageId && <Text id="gallery-image-error" size="sm" c="red" role="alert">{form.errors.imageId}</Text>}
          <HtmlEditor label="Label" value={form.values.label} onChange={(html) => form.setFieldValue("label", html)} disabled={busy} error={form.errors.label} />
          <HtmlEditor label="Гарчиг" value={form.values.title} onChange={(html) => form.setFieldValue("title", html)} disabled={busy} error={form.errors.title} />
          <HtmlEditor label="Тайлбар" value={form.values.desc} onChange={(html) => form.setFieldValue("desc", html)} disabled={busy} error={form.errors.desc} />
          <NumberInput label="Дараалал" required min={-2147483648} max={2147483647} allowDecimal={false} disabled={busy} {...form.getInputProps("sortOrder")} />
          <TextInput label="Холбоосын URL" maxLength={2048} disabled={busy} {...form.getInputProps("linkUrl")} />
          <TextInput label="Холбоосын текст" maxLength={255} disabled={busy} {...form.getInputProps("linkLabel")} />
        </>}
        {!itemMode && <Textarea label="Тайлбар" maxLength={512} rows={3} disabled={busy} {...form.getInputProps("desc")} />}
        <Group justify="flex-end"><Button variant="default" disabled={busy} onClick={onCancel}>Болих</Button><Button type="submit" loading={saving} disabled={uploading} leftSection={<IconDeviceFloppy size={17} />}>Хадгалах</Button></Group>
      </Stack>
    </form>
    {itemMode && !item && <FileUploadDialog opened={uploadOpen} multiple={false} onClose={() => setUploadOpen(false)} onBusy={(value) => { setUploading(value); onBusy(value); }} onUploaded={(file) => { form.setFieldValue("imageId", file.id); form.clearFieldError("imageId"); }} />}
  </>;
}
