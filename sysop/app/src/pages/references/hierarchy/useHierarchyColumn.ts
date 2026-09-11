import { useEffect, useState } from "react";
import { listAll, referenceError, type ReferenceDefinition, type ReferenceRow } from "../model";

type ColumnState = { scope: string; rows: ReferenceRow[]; loading: boolean; error: string };

export function useHierarchyColumn(definition: ReferenceDefinition, parentId: string | null) {
  const [revision, setRevision] = useState(0);
  const scope = `${definition.slug}:${parentId ?? ""}`;
  const parentKey = definition.parent?.key;
  const enabled = !parentKey || Boolean(parentId);
  const [state, setState] = useState<ColumnState>({ scope: "", rows: [], loading: false, error: "" });
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    setState((previous) => ({ scope, rows: previous.scope === scope ? previous.rows : [], loading: true, error: "" }));
    const filters = parentKey ? { [parentKey]: parentId! } : {};
    void listAll(definition, controller.signal, filters).then((rows) => {
      if (!controller.signal.aborted) setState({ scope, rows: [...new Map(rows.map((row) => [row.id, row])).values()], loading: false, error: "" });
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) setState({ scope, rows: [], loading: false, error: referenceError(cause) });
    });
    return () => controller.abort();
  }, [enabled, definition, parentKey, parentId, scope, revision]);
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
