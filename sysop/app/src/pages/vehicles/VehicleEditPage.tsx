import { Alert, Button, Loader, Stack } from "@mantine/core";
import { Vehicles } from "@bigmotors/sysop-dti";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router";
import { apiClient } from "../../api/client";
import { returnToList, vehicleError } from "./model";
import { useVehicleLookups } from "./useVehicleLookups";
import { VehicleForm } from "./VehicleForm";
import { vehicleTabValue } from "./form-tabs";

export function VehicleEditPage() {
  const { id } = useParams(); const [params] = useSearchParams(); const navigate = useNavigate();
  const location = useLocation();
  // The form remounts after save to reset its values; the page retains the active tab.
  const [tab, setTab] = useState(() => vehicleTabValue(location.state?.vehicleTab));
  const back = returnToList(params.get("returnTo"));
  const [revision, setRevision] = useState(0);
  const [row, setRow] = useState<Vehicles.Entity>();
  const [loading, setLoading] = useState(!!id);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const lookups = useVehicleLookups(revision);
  useEffect(() => {
    const controller = new AbortController(); setRow(undefined); setError(""); setLoading(!!id);
    if (id) void apiClient.call(Vehicles.get, { params: { id } }, { signal: controller.signal }).then((result) => { if (!controller.signal.aborted) setRow(result); }).catch((cause: unknown) => { if (!controller.signal.aborted) setError(vehicleError(cause)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, revision]);
  if (error || lookups.error) return <Stack><Alert color="red" role="alert">{error || lookups.error}</Alert><Button onClick={() => setRevision((value) => value + 1)}>Дахин оролдох</Button><Button component={Link} to={back} variant="subtle">Жагсаалт</Button></Stack>;
  if (loading || !lookups.data || (id && !row)) return <Loader aria-label="Ачаалж байна" />;
  return <Stack>{notice && <Alert color="teal" role="status" withCloseButton onClose={() => setNotice("")}>{notice}</Alert>}
    <VehicleForm key={`${id ?? "new"}:${row?.updatedAt ?? ""}`} row={row} lookups={lookups.data} back={back} tab={tab} onTabChange={(value) => setTab(vehicleTabValue(value))} onSaved={(result) => {
      setNotice("Амжилттай хадгаллаа."); setRow(result);
      if (!id) void navigate(`/vehicles/${result.id}/edit?${new URLSearchParams({ returnTo: back })}`, { replace: true, state: { vehicleTab: tab } });
    }} />
  </Stack>;
}
