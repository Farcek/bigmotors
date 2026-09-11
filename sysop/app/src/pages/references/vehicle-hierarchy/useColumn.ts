import { useEffect, useState } from "react";
import { listAll, referenceError, type ReferenceRow } from "../model";
import { levels, type Level } from "./model";

type ColumnState = { scope: string; rows: ReferenceRow[]; loading: boolean; error: string };

export function useColumn(level: Level, parentId: string | null) {
  const [revision, setRevision] = useState(0);
  const scope = `${level}:${parentId ?? ""}`;
  const enabled = level === "brand" || Boolean(parentId);
  const [state, setState] = useState<ColumnState>({ scope: "", rows: [], loading: false, error: "" });
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    setState((previous) => ({ scope, rows: previous.scope === scope ? previous.rows : [], loading: true, error: "" }));
    const filters = level === "model" ? { brandId: parentId! } : level === "variant" ? { modelId: parentId! } : {};
    void listAll(levels[level].definition, controller.signal, filters).then((rows) => {
      if (!controller.signal.aborted) setState({ scope, rows: [...new Map(rows.map((row) => [row.id, row])).values()], loading: false, error: "" });
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) setState({ scope, rows: [], loading: false, error: referenceError(cause) });
    });
    return () => controller.abort();
  }, [enabled, level, parentId, scope, revision]);
  // A changed parent must never expose rows or actions from the preceding scope.
  const current = enabled && state.scope === scope;
  return {
    rows: current ? state.rows : [],
    loading: enabled && (!current || state.loading),
    error: current ? state.error : "",
    ready: current && !state.loading && !state.error,
    refresh: () => setRevision((value) => value + 1),
  };
}
