import { useEffect, useState } from "react";
import { referenceDefinitions } from "./definitions";
import { listAll, parentOptions, referenceError, type ReferenceDefinition, type ReferenceOption } from "./model";

export function useParentOptions(def: ReferenceDefinition, revision: number) {
  const [options, setOptions] = useState<ReferenceOption[]>([]);
  const [loading, setLoading] = useState(Boolean(def.parent));
  const [error, setError] = useState("");
  useEffect(() => {
    if (!def.parent) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    async function load() {
      const source = referenceDefinitions[def.parent!.source];
      const rows = await listAll(source, controller.signal);
      const ancestors = source.parent && source.parent.source !== source.slug
        ? await listAll(referenceDefinitions[source.parent.source], controller.signal) : [];
      if (!controller.signal.aborted) setOptions(parentOptions(rows, ancestors));
    }
    void load().catch((cause: unknown) => {
      if (!controller.signal.aborted) { setOptions([]); setError(referenceError(cause)); }
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [def, revision]);
  return { options, loading, error };
}
