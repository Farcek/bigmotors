"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { IconLoader2, IconRefresh } from "@tabler/icons-react";
import HomeSearcher from "../home.searcher";
import HomeSearchGrid from "../home.search.grid";
import CarCardItem from "../car.card";
import { getVehicleSearchHref, type GridColumns, type HomeSearchFilters, type HomeSearchLookups, type HomeVehicleResult, type VehicleConditionFilter } from "../home.searcher/model";
import { fetchHomeVehicles } from "./client";

const gridClass = { 2: "lg:grid-cols-2", 3: "lg:grid-cols-3", 4: "lg:grid-cols-4", 6: "lg:grid-cols-6" } as const;
const specCount = { 2: 4, 3: 3, 4: 2, 6: 0 } as const;
// Match Tailwind's lg breakpoint; smaller screens always show all four specs.
const desktopQuery = "(min-width: 64rem)";
function subscribeDesktop(onChange: () => void) {
  const media = window.matchMedia(desktopQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}
const getDesktopSnapshot = () => window.matchMedia(desktopQuery).matches;
const getServerSnapshot = () => false;

export default function HomeSearch({ initialResult, lookups }: { initialResult: HomeVehicleResult; lookups: HomeSearchLookups }) {
  const [filters, setFilters] = useState<HomeSearchFilters>({});
  const [appliedFilters, setAppliedFilters] = useState<HomeSearchFilters>({});
  const [result, setResult] = useState(initialResult);
  const [columns, setColumns] = useState<GridColumns>(4);
  const desktop = useSyncExternalStore(subscribeDesktop, getDesktopSnapshot, getServerSnapshot);
  const effectiveColumns = desktop ? columns : 2;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const active = useRef<{ controller: AbortController; sequence: number } | null>(null);
  const sequence = useRef(0);
  const lastRequest = useRef({ filters: {} as HomeSearchFilters, page: 1 });
  useEffect(() => () => { sequence.current++; active.current?.controller.abort(); }, []);

  async function search(next: HomeSearchFilters, page = 1) {
    const snapshot = { ...next };
    active.current?.controller.abort();
    const request = { controller: new AbortController(), sequence: ++sequence.current };
    active.current = request;
    lastRequest.current = { filters: snapshot, page };
    setBusy(true); setError("");
    const timeout = window.setTimeout(() => request.controller.abort(), 30_000);
    try {
      const data = await fetchHomeVehicles(snapshot, page, request.controller.signal);
      if (sequence.current !== request.sequence) return;
      setResult(data); setAppliedFilters(snapshot);
    } catch (cause) {
      if (sequence.current !== request.sequence) return;
      setError(request.controller.signal.aborted ? "Хайлтын хугацаа хэтэрлээ. Дахин оролдоно уу." : cause instanceof Error ? cause.message : "Хайлт амжилтгүй боллоо.");
    } finally {
      window.clearTimeout(timeout);
      if (sequence.current === request.sequence) { setBusy(false); active.current = null; }
    }
  }
  function changeCondition(condition: VehicleConditionFilter) {
    const next = { ...filters, condition };
    setFilters(next); void search(next);
  }

  return <div className="relative mt-4 pb-12 lg:-mt-12 lg:pb-16">
    <HomeSearcher filters={filters} lookups={lookups} busy={busy} onFiltersChange={setFilters} onSearch={(next) => void search(next)} />
    <div className="mt-8 lg:mt-12">
      <HomeSearchGrid filters={filters} page={result.page} pageCount={result.pageCount} columns={columns} onConditionChange={changeCondition} onPageChange={(page) => void search(filters, getVehicleSearchHref(filters) === getVehicleSearchHref(appliedFilters) ? page : 1)} onColumnsChange={setColumns} />
    </div>
    <section aria-label="Автомашины хайлтын үр дүн" aria-busy={busy} className="mt-4 min-h-48">
      {busy && <p role="status" aria-live="polite" className="mb-4 flex min-h-6 items-center gap-2 text-sm text-section-dark-text/65">
        <IconLoader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />Ачаалж байна...
      </p>}
      {error ? <div role="alert" className="border-y border-section-dark-text/20 py-8 text-sm">
        <p>{error}</p><button type="button" className="mt-4 flex min-h-11 items-center gap-2 text-primary focus-visible:outline-2 focus-visible:outline-primary" onClick={() => void search(lastRequest.current.filters, lastRequest.current.page)}><IconRefresh size={16} aria-hidden="true" />Дахин оролдох</button>
      </div> : result.items.length ? <div inert={busy} className={`grid grid-cols-1 gap-5 sm:grid-cols-2 ${gridClass[columns]} ${busy ? "pointer-events-none opacity-50" : ""}`}>
        {result.items.map((item) => <CarCardItem key={item.id} item={item} compactPrice maxSpecCount={specCount[effectiveColumns]} showBadges={effectiveColumns !== 6} />)}
      </div> : !busy && <div className="py-10 text-center">
        <p>Тохирох автомашин олдсонгүй.</p>
        <button type="button" className="mt-4 min-h-11 text-sm text-primary focus-visible:outline-2 focus-visible:outline-primary" onClick={() => { setFilters({}); void search({}); }}>Шүүлт цэвэрлэх</button>
      </div>}
    </section>
  </div>;
}
