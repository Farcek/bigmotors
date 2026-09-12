import { Alert, Button, FileInput, Group, Modal, Stack, Text, Textarea, TextInput } from "@mantine/core";
import { IconUpload } from "@tabler/icons-react";
import type { Files } from "@bigmotors/sysop-dti";
import { useEffect, useRef, useState } from "react";
import { uploadFile } from "./client";

type Pending = { file: File; title: string; description: string; done: boolean };
export function FileUploadDialog({ opened, onClose, onUploaded, onBusy, multiple = true }: {
  opened: boolean; onClose: () => void; onUploaded: (file: Files.UploadResult) => void; onBusy: (busy: boolean) => void; multiple?: boolean;
}) {
  const [items, setItems] = useState<Pending[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const close = () => { if (!controller.current) { setItems([]); setError(""); onClose(); } };
  async function upload() {
    if (controller.current || !items.some((item) => !item.done)) return;
    const request = new AbortController(); controller.current = request;
    setBusy(true); onBusy(true); setError("");
    try {
      for (let index = 0; index < items.length; index++) {
        const item = items[index];
        if (item.done) continue;
        const file = await uploadFile(item.file, item.title, item.description, request.signal);
        if (request.signal.aborted) return;
        onUploaded(file);
        setItems((current) => current.map((entry, i) => i === index ? { ...entry, done: true } : entry));
      }
      setItems([]); onClose();
    } catch (cause) {
      if (!request.signal.aborted) setError(cause instanceof Error && cause.message.startsWith("Файл") ? cause.message : "Upload амжилтгүй боллоо. Дахин оролдоно уу.");
    } finally {
      controller.current = null;
      if (!request.signal.aborted) { setBusy(false); onBusy(false); }
    }
  }
  return <Modal opened={opened} onClose={close} title="Зураг / файл нэмэх" size="lg" closeOnClickOutside={!busy} closeOnEscape={!busy} withCloseButton={!busy}>
    <Stack>
      {error && <Alert color="red" role="alert">{error}</Alert>}
      <FileInput label={multiple ? "Файлууд" : "Файл"} multiple={multiple} value={multiple ? items.map((item) => item.file) : items[0]?.file ?? null} disabled={busy || items.some((item) => item.done)} onChange={(value) => {
        const files = Array.isArray(value) ? value : value ? [value] : [];
        setItems(files.map((file) => ({ file, title: "", description: "", done: false })));
      }} />
      {items.map((item, index) => <Stack key={index} gap="xs" py="sm">
        <Text size="sm" fw={600} style={{ overflowWrap: "anywhere" }}>{item.file.name}{item.done ? " — Upload хийгдсэн" : ""}</Text>
        <TextInput label="Гарчиг" maxLength={255} value={item.title} disabled={busy || item.done} onChange={(event) => { const title = event.currentTarget.value; setItems((current) => current.map((entry, i) => i === index ? { ...entry, title } : entry)); }} />
        <Textarea label="Тайлбар" maxLength={512} value={item.description} disabled={busy || item.done} onChange={(event) => { const description = event.currentTarget.value; setItems((current) => current.map((entry, i) => i === index ? { ...entry, description } : entry)); }} />
      </Stack>)}
      <Group justify="flex-end"><Button variant="default" disabled={busy} onClick={close}>Хаах</Button><Button leftSection={<IconUpload size={16} />} loading={busy} disabled={!items.some((item) => !item.done)} onClick={() => void upload()}>Upload</Button></Group>
    </Stack>
  </Modal>;
}
