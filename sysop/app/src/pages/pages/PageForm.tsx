import { Pages } from "@bigmotors/sysop-dti";
import { ActionIcon, Alert, Box, Button, Group, Image, JsonInput, Select, Stack, Tabs, Textarea, TextInput, Tooltip } from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconDeviceFloppy, IconTrash, IconUpload } from "@tabler/icons-react";
import { useRef, useState } from "react";
import { FileUploadDialog } from "../../files/FileUploadDialog";
import { fileUrl } from "../../files/client";
import { PageBody } from "../../ui/PageBody";
import { pageError, pageFormValues, pagePayload, statusOptions, validatePageForm } from "./model";

export function PageForm({ row, initialTab = "main", onSave, onCancel }: {
  row?: Pages.Entity; initialTab?: string; onSave: (body: Pages.CreateBody, tab: string) => Promise<void>; onCancel: () => void;
}) {
  const form = useForm({ initialValues: pageFormValues(row), validate: validatePageForm });
  const [tab, setTab] = useState<string | null>(["main", "content", "meta"].includes(initialTab) ? initialTab : "main");
  const [saving, setSaving] = useState(false); const [uploading, setUploading] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false); const [error, setError] = useState("");
  const lock = useRef(false); const busy = saving || uploading;
  return <>
    <form noValidate onSubmit={form.onSubmit(async (values) => {
      if (lock.current || uploading) return;
      lock.current = true; setSaving(true); setError("");
      try { await onSave(pagePayload(values), tab ?? "main"); }
      catch (cause) { setError(pageError(cause)); }
      finally { lock.current = false; setSaving(false); }
    }, (errors) => setTab(errors.title || errors.slug || errors.description ? "main" : errors.content ? "content" : "meta"))}>
      <Stack>
        {error && <Alert color="red" role="alert">{error}</Alert>}
        <Tabs value={tab} onChange={setTab} keepMounted>
          <Tabs.List mb="md"><Tabs.Tab value="main">Үндсэн</Tabs.Tab><Tabs.Tab value="content">Агуулга</Tabs.Tab><Tabs.Tab value="meta">Meta</Tabs.Tab></Tabs.List>
          <Box maw={850}><PageBody>
            <Tabs.Panel value="main"><Stack>
              <TextInput label="Гарчиг" required maxLength={255} disabled={busy} {...form.getInputProps("title")} />
              <TextInput label="Slug" required maxLength={255} disabled={busy} {...form.getInputProps("slug")} />
              <Textarea label="Товч тайлбар" maxLength={512} rows={3} disabled={busy} {...form.getInputProps("description")} />
              <Select label="Төлөв" required allowDeselect={false} data={statusOptions} disabled={busy} {...form.getInputProps("status")} />
              {form.values.mainImageId && <Image src={fileUrl({ id: form.values.mainImageId, originalName: "image" }, 1280)} w="100%" maw={400} h="auto" style={{ aspectRatio: "4 / 3" }} fit="cover" alt={form.values.title || "Үндсэн зураг"} />}
              <Group>
                <Button variant="light" leftSection={<IconUpload size={18} />} disabled={busy} onClick={() => setUploadOpen(true)}>{form.values.mainImageId ? "Зураг солих" : "Үндсэн зураг нэмэх"}</Button>
                {form.values.mainImageId && <Tooltip label="Зураг хасах"><ActionIcon variant="subtle" color="red" aria-label="Зураг хасах" disabled={busy} onClick={() => form.setFieldValue("mainImageId", null)}><IconTrash size={18} /></ActionIcon></Tooltip>}
              </Group>
            </Stack></Tabs.Panel>
            <Tabs.Panel value="content"><JsonInput label="Агуулга (JSON)" formatOnBlur autosize minRows={16} maxRows={32} disabled={busy} {...form.getInputProps("content")} /></Tabs.Panel>
            <Tabs.Panel value="meta"><JsonInput label="Meta (JSON)" formatOnBlur autosize minRows={12} maxRows={32} disabled={busy} {...form.getInputProps("meta")} /></Tabs.Panel>
            <Group justify="flex-end" mt="lg"><Button variant="default" disabled={busy} onClick={onCancel}>Болих</Button><Button type="submit" loading={saving} disabled={uploading} leftSection={<IconDeviceFloppy size={17} />}>Хадгалах</Button></Group>
          </PageBody></Box>
        </Tabs>
      </Stack>
    </form>
    <FileUploadDialog opened={uploadOpen} multiple={false} onClose={() => setUploadOpen(false)} onBusy={setUploading} onUploaded={file => form.setFieldValue("mainImageId", file.id)} />
  </>;
}
