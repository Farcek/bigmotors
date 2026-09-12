import { Settings } from "@bigmotors/sysop-dti";
import { ActionIcon, Alert, Box, Group, Loader, Stack, Tooltip } from "@mantine/core";
import { IconRefresh } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { apiClient } from "../../api/client";
import { PageBody } from "../../ui/PageBody";
import { SettingsForm } from "./SettingsForm";
import { ADMIN_SETTING_KEYS, settingsError } from "./model";

export function SettingsPage() {
  const [reload, setReload] = useState(0); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<Settings.Entity[]>();
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError("");
    void (async () => {
      const entries: Settings.Entity[] = [];
      for (const key of ADMIN_SETTING_KEYS) {
        entries.push(...await apiClient.call(Settings.list, { query: { key, limit: 1, offset: 0 } }, { signal: controller.signal }));
      }
      if (!controller.signal.aborted) setData(entries);
    })().catch(cause => { if (!controller.signal.aborted) setError(settingsError(cause)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload]);
  return <Box maw={850}><Stack>
    <Group justify="flex-end"><Tooltip label="Шинэчлэх"><ActionIcon variant="default" size={36} aria-label="Тохиргоо шинэчлэх" disabled={loading || busy} onClick={() => setReload(v => v + 1)}><IconRefresh size={18} /></ActionIcon></Tooltip></Group>
    <PageBody>{loading ? <Group justify="center" mih={180}><Loader size="sm" /></Group> : error ? <Alert color="red" role="alert">{error}</Alert> : data &&
      <SettingsForm key={reload} entries={data} onBusy={setBusy} onSave={entries => apiClient.call(Settings.save, { body: { entries } })} />}
    </PageBody>
  </Stack></Box>;
}
