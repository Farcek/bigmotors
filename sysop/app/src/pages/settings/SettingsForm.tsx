import { SETTINGS_KEY_ADMINEMAIL, SETTINGS_KEY_SITE_TITLE } from "@bigmotors/core";
import { Settings } from "@bigmotors/sysop-dti";
import { Alert, Button, Group, Stack, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconDeviceFloppy, IconRestore } from "@tabler/icons-react";
import { useRef, useState } from "react";
import { settingsEntries, settingsError, settingsValidation, settingsValues } from "./model";

export function SettingsForm({ entries, onSave, onBusy }: {
  entries: Settings.Entity[];
  onSave: (entries: Settings.Entity[]) => Promise<Settings.Entity[]>; onBusy: (busy: boolean) => void;
}) {
  const initial = settingsValues(entries);
  const form = useForm({ initialValues: initial, validate: settingsValidation });
  const [saving, setSaving] = useState(false); const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const lock = useRef(false);
  return <form noValidate onSubmit={form.onSubmit(async values => {
    if (lock.current) return;
    lock.current = true; setSaving(true); onBusy(true); setError(""); setNotice("");
    try {
      const saved = settingsValues(await onSave(settingsEntries(values)));
      form.setInitialValues(saved); form.setValues(saved); form.resetDirty(saved);
      setNotice("Хадгаллаа.");
    } catch (cause) { setError(settingsError(cause)); }
    finally { lock.current = false; setSaving(false); onBusy(false); }
  })}>
    <Stack gap="lg">
      {error && <Alert color="red" role="alert">{error}</Alert>}
      {notice && <Alert color="teal" role="status" withCloseButton closeButtonLabel="Мэдэгдэл хаах" onClose={() => setNotice("")}>{notice}</Alert>}
      <TextInput label="Сайтын гарчиг" maxLength={255} disabled={saving} {...form.getInputProps(SETTINGS_KEY_SITE_TITLE)} />
      <TextInput label="Админы имэйл" type="email" maxLength={255} disabled={saving} {...form.getInputProps(SETTINGS_KEY_ADMINEMAIL)} />
      <Group justify="space-between">
        <Button variant="subtle" leftSection={<IconRestore size={17} />} disabled={saving || !form.isDirty()} onClick={() => { form.reset(); setError(""); setNotice(""); }}>Буцаах</Button>
        <Button type="submit" loading={saving} leftSection={<IconDeviceFloppy size={17} />}>Хадгалах</Button>
      </Group>
    </Stack>
  </form>;
}
