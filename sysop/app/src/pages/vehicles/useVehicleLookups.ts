import { Colors } from "@bigmotors/sysop-dti";
import { useEffect, useState } from "react";
import { apiClient } from "../../api/client";
import { referenceDefinitions } from "../references/definitions";
import { listAll, type ReferenceRow } from "../references/model";
import { vehicleError } from "./model";

const sources = ["vehicle-brands", "vehicle-models", "vehicle-variants", "vehicle-body-types", "vehicle-features", "branches", "locations"] as const;
export type VehicleLookups = Record<(typeof sources)[number] | "colors", ReferenceRow[]>;
export function useVehicleLookups(revision = 0) {
  const [data, setData] = useState<VehicleLookups | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    void (async () => {
      const entries = await Promise.all(sources.map(async (key) => [key, await listAll(referenceDefinitions[key], controller.signal)] as const));
      const colors: Colors.Entity[] = [];
      for (let offset = 0; ; offset += 100) {
        const batch = await apiClient.call(Colors.list, { query: { limit: 100, offset } }, { signal: controller.signal });
        colors.push(...batch);
        if (batch.length < 100) break;
      }
      const data: VehicleLookups = { "vehicle-brands": [], "vehicle-models": [], "vehicle-variants": [], "vehicle-body-types": [], "vehicle-features": [], branches: [], locations: [], colors };
      for (const [key, rows] of entries) data[key] = rows;
      if (!controller.signal.aborted) setData(data);
    })().catch((cause: unknown) => { if (!controller.signal.aborted) { setData(null); setError(vehicleError(cause)); } });
    return () => controller.abort();
  }, [revision]);
  return { data, error };
}
export function lookupOptions(rows: ReferenceRow[], retained: readonly string[] = [], ancestors: ReferenceRow[] = [], selection = true) {
  return rows.map((row) => {
    const inactive = !row.isActive || ancestors.some((ancestor) => !ancestor.isActive);
    return { value: row.id, label: row.name + (inactive ? " (идэвхгүй)" : ""), disabled: selection && inactive && !retained.includes(row.id) };
  });
}
