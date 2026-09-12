import { Alert, Button, Group, Modal, Stack, Text } from "@mantine/core";
import { Vehicles } from "@bigmotors/sysop-dti";
import { useRef, useState } from "react";
import { apiClient } from "../../api/client";
import { commandLabels, vehicleError, type VehicleCommand } from "./model";

export function VehicleCommandModal({ target, onClose, onDone }: {
  target: { row: Pick<Vehicles.Entity, "id" | "title">; command: VehicleCommand };
  onClose: () => void; onDone: (row: Vehicles.Entity) => void;
}) {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try { onDone(await apiClient.call(Vehicles[target.command], { params: { id: target.row.id } })); }
    catch (cause) { setError(vehicleError(cause)); }
    finally { lock.current = false; setBusy(false); }
  }
  return <Modal opened onClose={() => { if (!lock.current) onClose(); }} title={commandLabels[target.command]} withCloseButton={!busy} closeOnClickOutside={!busy} closeOnEscape={!busy}>
    <Stack>{error && <Alert color="red" role="alert">{error}</Alert>}
      <Text style={{ overflowWrap: "anywhere" }}>«{target.row.title}» бүртгэлд {commandLabels[target.command].toLowerCase()} үйлдэл хийх үү?</Text>
      <Group justify="flex-end"><Button variant="default" disabled={busy} onClick={onClose}>Болих</Button><Button color={target.command === "archive" ? "red" : "blue"} loading={busy} onClick={() => void submit()}>{commandLabels[target.command]}</Button></Group>
    </Stack>
  </Modal>;
}
