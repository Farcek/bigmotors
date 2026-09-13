"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { vehicleListingPageSize, vehicleListingQuery, vehicleListingToQuery, type VehicleListingQuery, type VehicleSearchParams } from "@bigmotors/core";
import type { HomeSearchLookups } from "../home.searcher/model";
import { fetchCatalogVehicles } from "./client";
import { filterErrors, listingFilters, readPreviewQuery, type VehicleCatalogResult } from "./model";

export type CatalogInitial = {
  initialQuery: VehicleListingQuery | null;
  initialFilters: VehicleSearchParams;
  initialResult: VehicleCatalogResult | null;
  initialMessage: string;
  lookups: HomeSearchLookups;
};

const desktopQuery = "(min-width: 64rem)";
const keyOf = (query: VehicleListingQuery) => vehicleListingToQuery(query).toString();
const hrefOf = (query: VehicleListingQuery) => `/vehicles?${keyOf(query)}`;

export function useCatalog(initial: CatalogInitial) {
  const [query, setQuery] = useState(initial.initialQuery ?? vehicleListingQuery.parse({}));
  const [values, setValues] = useState(initial.initialFilters);
  const [result, setResult] = useState(initial.initialResult);
  const [error, setError] = useState(initial.initialMessage);
  const [busy, setBusy] = useState(false);
  const [desktop, setDesktop] = useState(false);
  const current = useRef(query);
  const draft = useRef(values);
  const isDesktop = useRef(false);
  const sequence = useRef(0);
  const active = useRef<AbortController | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loaded = useRef(initial.initialResult && initial.initialQuery ? keyOf(initial.initialQuery) : "");

  const cancel = useCallback(() => {
    sequence.current++;
    active.current?.abort();
    active.current = null;
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const run = useCallback((next: VehicleListingQuery, history: "push" | "replace" = "push") => {
    cancel();
    current.current = next; draft.current = listingFilters(next);
    setQuery(next); setValues(draft.current); setError(""); setBusy(true);
    const href = hrefOf(next);
    if (`${window.location.pathname}${window.location.search}` !== href) window.history[history === "push" ? "pushState" : "replaceState"](null, "", href);
    const controller = new AbortController();
    active.current = controller;
    const id = sequence.current;
    const timeout = window.setTimeout(() => controller.abort(), 30_000);
    void fetchCatalogVehicles(next, controller.signal).then((data) => {
      if (id !== sequence.current) return;
      const canonical = { ...next, page: String(data.page) };
      loaded.current = keyOf(canonical);
      current.current = canonical;
      setQuery(canonical); setResult(data);
      if (canonical.page !== next.page) window.history.replaceState(null, "", hrefOf(canonical));
    }).catch((cause: unknown) => {
      if (id !== sequence.current) return;
      setError(controller.signal.aborted ? "Хайлтын хугацаа хэтэрлээ. Дахин оролдоно уу." : cause instanceof Error ? cause.message : "Хайлт амжилтгүй боллоо.");
    }).finally(() => {
      window.clearTimeout(timeout);
      if (id === sequence.current) { setBusy(false); active.current = null; }
    });
  }, [cancel]);

  const change = useCallback((next: VehicleSearchParams, debounce = false, controls: Partial<VehicleListingQuery> = {}) => {
    cancel();
    draft.current = next; setValues(next); setError("");
    if (Object.keys(filterErrors(next, initial.lookups)).length) { setBusy(false); return; }
    const columns = controls.columns ?? current.current.columns;
    const parsed = vehicleListingQuery.safeParse({ ...next, sort: current.current.sort, page: "1", columns, ...controls, page_size: vehicleListingPageSize(columns, isDesktop.current) });
    if (!parsed.success) { setBusy(false); setError("Хайлтын утгуудыг шалгана уу."); return; }
    if (debounce) { setBusy(true); timer.current = setTimeout(() => run(parsed.data), 400); }
    else run(parsed.data);
  }, [cancel, initial.lookups, run]);

  useEffect(() => {
    const media = window.matchMedia(desktopQuery);
    const resize = () => {
      isDesktop.current = media.matches; setDesktop(media.matches);
      if (!Object.keys(filterErrors(draft.current, initial.lookups)).length) {
        const size = vehicleListingPageSize(current.current.columns, media.matches);
        if (current.current.page_size !== size) run({ ...draft.current, sort: current.current.sort, columns: current.current.columns, page: "1", page_size: size }, "replace");
      }
    };
    const restore = () => {
      cancel(); setBusy(false);
      const params = new URLSearchParams(window.location.search);
      const raw = Object.fromEntries([...params.keys()].map((key) => [key, params.getAll(key).length > 1 ? params.getAll(key) : params.get(key)!]));
      const state = readPreviewQuery(raw, initial.lookups);
      draft.current = state.filters; setValues(state.filters);
      if (!state.query) { setError(state.message || "Хайлтын утгуудыг шалгана уу."); return; }
      const size = vehicleListingPageSize(state.query.columns, media.matches);
      run({ ...state.query, page_size: size, page: size === state.query.page_size ? state.query.page : "1" }, "replace");
    };
    isDesktop.current = media.matches; setDesktop(media.matches);
    if (initial.initialQuery) {
      const size = vehicleListingPageSize(current.current.columns, media.matches);
      if (current.current.page_size !== size) run({ ...current.current, page_size: size, page: "1" }, "replace");
      else if (initial.initialResult && loaded.current === keyOf(current.current) && initial.initialResult.page !== Number(current.current.page)) {
        const canonical = { ...current.current, page: String(initial.initialResult.page) };
        loaded.current = keyOf(canonical); current.current = canonical; setQuery(canonical);
        window.history.replaceState(null, "", hrefOf(canonical));
      }
      else if (loaded.current !== keyOf(current.current) && !initial.initialMessage) run(current.current, "replace");
    }
    media.addEventListener("change", resize);
    window.addEventListener("popstate", restore);
    return () => { cancel(); media.removeEventListener("change", resize); window.removeEventListener("popstate", restore); };
  }, [cancel, initial.initialQuery, initial.initialResult, initial.initialMessage, initial.lookups, run]);

  return {
    query, values, result, error, busy, desktop, change,
    invalid: Object.keys(filterErrors(values, initial.lookups)).length > 0,
    reset: () => change({}, false, { sort: "newest" }),
    sort: (sort: VehicleListingQuery["sort"]) => change(draft.current, false, { sort }),
    columns: (columns: VehicleListingQuery["columns"]) => change(draft.current, false, { columns }),
    page: (page: number) => change(draft.current, false, { page: String(page) }),
    retry: () => change(draft.current, false, { page: current.current.page }),
  };
}
