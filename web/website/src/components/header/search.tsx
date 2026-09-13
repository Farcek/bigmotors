"use client";

import { useEffect, useState } from "react";
import { getVehicleSearchHref, vehicleSearchParams } from "@bigmotors/core";
import HomeSearcher from "../home.searcher";
import { EMPTY_LOOKUPS, type HomeSearchFilters, type HomeSearchLookups } from "../home.searcher/model";
import { HeaderOverlay, type HeaderOverlayProps } from "./overlay";

function SearchForm({ opened, close }: { opened: boolean; close: () => void }) {
  const [filters, setFilters] = useState<HomeSearchFilters>({});
  const [lookups, setLookups] = useState<HomeSearchLookups>(EMPTY_LOOKUPS);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!opened) return;
    const controller = new AbortController();
    setBusy(true);
    setLoadError(false);
    fetch("/api/vehicles/lookups", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Lookups unavailable");
        const data: HomeSearchLookups = await response.json();
        if (!controller.signal.aborted) setLookups(data);
      })
      .catch(() => { if (!controller.signal.aborted) setLoadError(true); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [opened, retry]);

  return <div className="bg-section-dark-bg px-4 pb-12 sm:px-6 lg:px-8 xl:px-[120px]">
    <HomeSearcher basicOnly filters={filters} lookups={lookups} busy={busy}
      onFiltersChange={(next) => { setFilters(next); setInvalid(false); }}
      onSearch={(values) => {
        const result = vehicleSearchParams.safeParse(values);
        if (!result.success) { setInvalid(true); return; }
        close();
        window.location.assign(getVehicleSearchHref(result.data));
      }} />
    <div className="mx-auto max-w-[1040px] text-sm">
      {busy && <p role="status" className="mt-3 text-section-dark-text/70">Марк, загвар ачаалж байна...</p>}
      {loadError && <p role="alert" className="mt-3">Марк, загвар ачаалж чадсангүй. <button type="button" onClick={() => setRetry((value) => value + 1)} className="text-primary underline underline-offset-4">Дахин оролдох</button></p>}
      {invalid && <p role="alert" className="mt-3">Гүйлт, хөдөлгүүрийн утгыг шалгана уу. Доод утга дээд утгаас ихгүй, эерэг бүхэл тоо эсвэл 0 байна.</p>}
    </div>
  </div>;
}

export function HeaderSearch(props: HeaderOverlayProps) {
  return <HeaderOverlay {...props} label="Хайлт" title="Автомашины хайлт" panel>
    {({ opened, close }) => <SearchForm opened={opened} close={close} />}
  </HeaderOverlay>;
}
