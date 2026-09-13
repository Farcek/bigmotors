"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { DRIVETRAINS, FUEL_TYPES, TRANSMISSIONS, VEHICLE_CONDITIONS, vehicleListingQuery, type VehicleListingQuery, type VehicleSearchField, type VehicleSearchParams } from "@bigmotors/core";
import { IconAdjustmentsHorizontal, IconChevronDown, IconChevronLeft, IconChevronRight, IconRotateClockwise, IconSearch, IconLoader2, IconRefresh } from "@tabler/icons-react";
import CarCardItem from "../car.card";
import { GridColumnControl } from "../grid-columns";
import { EMPTY_LOOKUPS, type GridColumns, type HomeSearchLookups } from "../home.searcher/model";
import { fuelLabels, transmissionLabels } from "../car.card/model";
import { applyPreset, changeFilter, filterErrors, rangeLimits, RANGE_PRESETS, selectedPreset, type Option, type RangeName } from "./model";
import { useCatalog, type CatalogInitial } from "./use-catalog";

const gridClasses = { 2: "lg:grid-cols-2", 3: "lg:grid-cols-3", 4: "lg:grid-cols-4", 6: "lg:grid-cols-6" } as const;
const specCounts = { 2: 4, 3: 3, 4: 2, 6: 0 } as const;
const drivetrainLabels = { fwd: "Урд (FWD)", rwd: "Хойд (RWD)", awd: "Бүх дугуй (AWD)", four_wheel_drive: "4 дугуй (4WD)" } satisfies Record<(typeof DRIVETRAINS)[number], string>;

const inputClass = "h-10 w-full min-w-0 rounded-md border border-catalog-border bg-search-surface px-3 text-sm text-search-text placeholder:text-catalog-muted focus:border-card-accent focus:outline-none focus:ring-1 focus:ring-card-accent";
const defaultQuery = vehicleListingQuery.parse({});

function FilterSection({ title, children }: { title: string; children: ReactNode }) {
  return <details open className="group border-b border-catalog-border py-5 last:border-0">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold text-catalog-muted [&::-webkit-details-marker]:hidden">
      {title}<IconChevronDown size={16} className="shrink-0 group-open:rotate-180" aria-hidden="true" />
    </summary>
    <div className="mt-4">{children}</div>
  </details>;
}

function Choices({ name, options, value, onChange }: { name: string; options: Option[]; value: string | undefined; onChange: (value: string) => void }) {
  const choices = [{ value: "", label: "Бүгд" }, ...options];
  if (value && !choices.some((option) => option.value === value)) choices.push({ value, label: "URL-ийн сонголт (лавлахад алга)" });
  return <div className="flex flex-wrap gap-2">
    {choices.map((option) => <label key={option.value} className="cursor-pointer">
      <input type="radio" name={name} value={option.value} checked={option.value === value} onChange={() => onChange(option.value)} className="peer sr-only" />
      <span className="block rounded-full border border-catalog-border px-3 py-2 text-xs leading-4 text-catalog-muted transition-colors hover:border-catalog-muted peer-checked:border-card-accent peer-checked:bg-primary/10 peer-checked:text-card-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-card-accent">{option.label}</span>
    </label>)}
  </div>;
}

type FilterControls = { values: VehicleSearchParams; onChange: (values: VehicleSearchParams, debounce?: boolean) => void };
function Range({ label, name, values, onChange }: FilterControls & { label: string; name: RangeName }) {
  const id = useId();
  const errors = filterErrors(values);
  const error = errors[`${name}_min`] || errors[`${name}_max`];
  return <>
    <div className="mt-3 flex min-w-0 items-center gap-2">
      {(["min", "max"] as const).map((bound, index) => <div key={bound} className="flex min-w-0 flex-1 items-center gap-2">
        {index === 1 && <span className="text-catalog-muted" aria-hidden="true">–</span>}
        <input type="text" name={`${name}_${bound}`} aria-label={`${label}: ${index === 0 ? "доод" : "дээд"}`} inputMode="numeric" placeholder={index === 0 ? "Доод" : "Дээд"}
          value={values[`${name}_${bound}`] ?? ""} onChange={(event) => onChange(changeFilter(values, `${name}_${bound}`, event.currentTarget.value), true)}
          aria-invalid={!!errors[`${name}_${bound}`]} aria-describedby={error ? `${id}-error` : undefined}
          className={`${inputClass} aria-invalid:border-red-700 aria-invalid:ring-red-700`} />
      </div>)}
    </div>
    {error && <p id={`${id}-error`} role="alert" className="mt-2 text-xs text-red-700">{error} {rangeLimits[name].map((value) => name === "year" ? String(value) : value.toLocaleString("en-US")).join(" – ")}</p>}
  </>;
}

function Filters({ values, onChange, onReset, lookups, brandCounts }: FilterControls & { onReset: () => void; lookups: HomeSearchLookups; brandCounts?: Record<string, number> }) {
  const [allBrands, setAllBrands] = useState(false);
  const [brandQuery, setBrandQuery] = useState("");
  const { brand = "", model = "", variant = "" } = values;
  const errors = filterErrors(values, lookups);
  const matchingBrands = lookups.brands.filter((row) => row.name.toLowerCase().includes(brandQuery.trim().toLowerCase()));
  const visibleBrands = matchingBrands.filter((row, index) => allBrands || brandQuery.trim() || index < 6 || row.id === brand);
  if (brand && !lookups.brands.some((row) => row.id === brand)) visibleBrands.push({ id: brand, name: "URL-ийн марк (лавлахад алга)" });
  const models = lookups.models.filter((row) => row.brandId === brand);
  const variants = lookups.variants.filter((row) => row.modelId === model);
  const change = (field: VehicleSearchField, value: string) => onChange(changeFilter(values, field, value));
  function options(name: VehicleSearchField, items: Option[]) {
    return <><Choices name={name} options={items} value={values[name] ?? ""} onChange={(value) => change(name, value)} />
      {errors[name] && <p role="alert" className="mt-2 text-xs text-red-700">{errors[name]}</p>}</>;
  }
  function presets(name: Exclude<RangeName, "engine">) {
    return <Choices name={`${name}_preset`} options={RANGE_PRESETS[name]} value={selectedPreset(values, name)} onChange={(value) => onChange(applyPreset(values, name, value))} />;
  }
  return <form aria-label="Автомашины шүүлтүүр" noValidate onSubmit={(event) => event.preventDefault()} onReset={(event) => { event.preventDefault(); onReset(); setBrandQuery(""); setAllBrands(false); }} className="overflow-hidden rounded-lg border border-catalog-border bg-catalog-surface">
    <div className="flex items-center justify-between border-b border-catalog-border px-5 py-4">
      <h2 className="flex items-center gap-2 text-base font-semibold"><IconAdjustmentsHorizontal size={19} aria-hidden="true" />Шүүлтүүр</h2>
      <button type="reset" aria-label="Шүүлтүүр цэвэрлэх" title="Шүүлтүүр цэвэрлэх" className="flex size-8 items-center justify-center rounded text-catalog-muted hover:text-card-accent focus-visible:outline-2 focus-visible:outline-card-accent"><IconRotateClockwise size={17} /></button>
    </div>
    <div className="px-5">
      <FilterSection title="МАРК">
        <div className="relative mb-3"><IconSearch size={15} className="pointer-events-none absolute top-3 left-3 text-catalog-muted" aria-hidden="true" /><input aria-label="Марк хайх" placeholder="Марк хайх..." value={brandQuery} onChange={(event) => setBrandQuery(event.currentTarget.value)} className={`${inputClass} pl-9`} /></div>
        <div role="radiogroup" aria-label="Марк" className="space-y-1">
          <label className="flex min-h-8 cursor-pointer items-center gap-2.5 text-sm"><input type="radio" name="brand" value="" checked={!brand} onChange={() => change("brand", "")} className="size-4 accent-card-accent" /><span>Бүгд</span></label>
          {visibleBrands.map((row) => <label key={row.id} className="flex min-h-8 cursor-pointer items-center gap-2.5 text-sm">
            <input type="radio" name="brand" value={row.id} checked={brand === row.id} onChange={() => change("brand", row.id)} className="size-4 accent-card-accent" />
            <span>{row.name}</span>{brandCounts && <span className="ml-auto text-xs text-catalog-muted">({brandCounts[row.id] ?? 0})</span>}
          </label>)}
        </div>
        {matchingBrands.length === 0 && <p role="status" className="mt-3 text-xs text-catalog-muted">Марк олдсонгүй.</p>}
        {errors.brand && <p role="alert" className="mt-2 text-xs text-red-700">{errors.brand}</p>}
        {!brandQuery.trim() && lookups.brands.length > 6 && <button type="button" aria-expanded={allBrands} onClick={() => setAllBrands(!allBrands)} className="mt-3 flex min-h-8 items-center gap-1 text-xs font-medium text-card-accent">{allBrands ? "Хураах" : `Бүгдийг харах (${lookups.brands.length})`}<IconChevronDown size={14} className={allBrands ? "rotate-180" : ""} /></button>}
      </FilterSection>
      <FilterSection title="ЗАГВАР">
        <select aria-label="Загвар" name="model" value={model} disabled={!brand && !model} onChange={(event) => change("model", event.currentTarget.value)} aria-invalid={!!errors.model} className={`${inputClass} disabled:cursor-not-allowed disabled:bg-catalog-surface disabled:text-catalog-muted`}>
          <option value="">{brand ? "Бүгд" : "Марк сонгоно уу"}</option>
          {models.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
          {model && !models.some((row) => row.id === model) && <option value={model}>{lookups.models.find((row) => row.id === model)?.name ?? "URL-ийн загвар (лавлахад алга)"}</option>}
        </select>
        {errors.model && <p role="alert" className="mt-2 text-xs text-red-700">{errors.model}</p>}
      </FilterSection>
      <FilterSection title="ХУВИЛБАР">
        <select aria-label="Хувилбар" name="variant" value={variant} disabled={!model && !variant} onChange={(event) => change("variant", event.currentTarget.value)} aria-invalid={!!errors.variant} className={`${inputClass} disabled:cursor-not-allowed disabled:bg-catalog-surface disabled:text-catalog-muted`}>
          <option value="">{model ? "Бүгд" : "Загвар сонгоно уу"}</option>
          {variants.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
          {variant && !variants.some((row) => row.id === variant) && <option value={variant}>{lookups.variants.find((row) => row.id === variant)?.name ?? "URL-ийн хувилбар (лавлахад алга)"}</option>}
        </select>
        {errors.variant && <p role="alert" className="mt-2 text-xs text-red-700">{errors.variant}</p>}
      </FilterSection>
      <FilterSection title="ТӨРӨЛ">{options("category", lookups.categories.map((row) => ({ value: row.id, label: row.name })))}</FilterSection>
      <FilterSection title="ҮНЭ (₮)">{presets("price")}<Range label="Үнэ" name="price" values={values} onChange={onChange} /></FilterSection>
      <FilterSection title="ҮЙЛДВЭРЛЭСЭН ОН">{presets("year")}<Range label="Он" name="year" values={values} onChange={onChange} /></FilterSection>
      <FilterSection title="ТҮЛШ">{options("fuel", FUEL_TYPES.map((value) => ({ value, label: fuelLabels[value] })))}</FilterSection>
      <FilterSection title="ХУРДНЫ ХАЙРЦАГ">{options("transmission", TRANSMISSIONS.map((value) => ({ value, label: transmissionLabels[value] })))}</FilterSection>
      <FilterSection title="ХӨТЛӨГЧ">{options("drivetrain", DRIVETRAINS.map((value) => ({ value, label: drivetrainLabels[value] })))}</FilterSection>
      <FilterSection title="ГҮЙЛТ (КМ)">{presets("mileage")}<Range label="Гүйлт" name="mileage" values={values} onChange={onChange} /></FilterSection>
      <FilterSection title="ХӨДӨЛГҮҮР (CC)"><Range label="Хөдөлгүүр" name="engine" values={values} onChange={onChange} /></FilterSection>
    </div>
  </form>;
}

export function VehiclesPreview({ initialQuery = defaultQuery, initialFilters = {}, initialResult = null, initialMessage = "", lookups = EMPTY_LOOKUPS }: Partial<CatalogInitial>) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const catalog = useCatalog({ initialQuery, initialFilters, initialResult, initialMessage, lookups });
  const { values, query, result, busy, error, invalid } = catalog;
  const columns = Number(query.columns) as GridColumns;
  const effectiveColumns = catalog.desktop ? columns : 2;
  const resultsRef = useRef<HTMLElement>(null);
  function page(next: number) {
    catalog.page(next);
    resultsRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }
  return <div className="min-h-dvh bg-search-surface text-search-text">
    <div className="mx-auto max-w-[1320px] px-4 pt-6 pb-16 sm:px-6 lg:px-8">
      <div className="grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-8">
        <aside className="min-w-0">
          <button type="button" aria-expanded={filtersOpen} aria-controls="vehicle-preview-filters" onClick={() => setFiltersOpen(!filtersOpen)} className="mb-3 flex h-11 w-full items-center justify-between rounded-md border border-catalog-border px-4 text-sm lg:hidden"><span className="flex items-center gap-2"><IconAdjustmentsHorizontal size={18} />Шүүлтүүр</span><IconChevronDown size={17} className={filtersOpen ? "rotate-180" : ""} /></button>
          <div id="vehicle-preview-filters" className={`${filtersOpen ? "block" : "hidden"} lg:block`}><Filters values={values} onChange={catalog.change} onReset={catalog.reset} lookups={lookups} brandCounts={result?.brandCounts} /></div>
        </aside>
        <section ref={resultsRef} aria-label="Автомашины хайлтын үр дүн" aria-busy={busy} className="min-w-0 scroll-mt-6">
          {error && <div role="alert" className="mb-4 border-y border-catalog-border py-4 text-sm text-red-700"><p>{error}</p><button type="button" onClick={catalog.retry} disabled={invalid} className="mt-3 flex min-h-11 items-center gap-2 text-card-accent disabled:opacity-50"><IconRefresh size={16} />Дахин оролдох</button></div>}
          {filterErrors(values).condition && <p role="alert" className="mb-4 text-sm text-red-700">{filterErrors(values).condition}</p>}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-catalog-border pb-4">
            <Choices name="condition" options={VEHICLE_CONDITIONS.map((value) => ({ value, label: value === "new" ? "Шинэ" : "Хуучин" }))} value={values.condition ?? ""} onChange={(value) => catalog.change(changeFilter(values, "condition", value))} />
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <GridColumnControl columns={columns} onChange={(value) => catalog.columns(String(value) as VehicleListingQuery["columns"])} />
              <label className="flex items-center gap-2 text-xs text-catalog-muted"><span className="sr-only">Эрэмбэлэх</span><select name="sort" value={query.sort} onChange={(event) => catalog.sort(event.currentTarget.value as VehicleListingQuery["sort"])} className="h-10 max-w-full rounded-md border border-catalog-border bg-catalog-surface px-3 text-sm text-search-text"><option value="newest">Шинээр нэмэгдсэн</option><option value="price_asc">Үнэ өсөхөөр</option><option value="price_desc">Үнэ буурахаар</option></select></label>
            </div>
          </div>
          {busy && <p role="status" className="mb-4 flex min-h-6 items-center gap-2 text-sm text-catalog-muted"><IconLoader2 size={16} className="animate-spin motion-reduce:animate-none" />Ачаалж байна...</p>}
          {invalid && <p role="status" className="mb-4 text-sm text-red-700">Шүүлтүүрийн утгуудыг шалгана уу.</p>}
          {!error && result && <div inert={busy || invalid} className={`grid grid-cols-1 gap-5 sm:grid-cols-2 ${gridClasses[columns]} ${busy || invalid ? "opacity-50" : ""}`}>
            {result.items.map((item) => <CarCardItem className="border border-catalog-border" key={item.id} item={item} compactPrice maxSpecCount={specCounts[effectiveColumns]} showBadges={effectiveColumns !== 6} />)}
          </div>}
          {!busy && !error && !invalid && result?.items.length === 0 && <div role="status" className="py-12 text-center text-sm"><p>Тохирох автомашин олдсонгүй.</p><button type="button" onClick={catalog.reset} className="mt-4 min-h-11 text-card-accent">Шүүлтүүр цэвэрлэх</button></div>}
          {result && !error && result.total > 0 && <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-catalog-border pt-5 text-xs text-catalog-muted">
            <span>{(result.page - 1) * result.pageSize + 1}–{Math.min(result.page * result.pageSize, result.total)} / {result.total} автомашин</span>
            <nav aria-label="Хуудаслалт" className="flex flex-wrap items-center gap-1">
              <button type="button" disabled={busy || invalid || result.page <= 1} onClick={() => page(result.page - 1)} aria-label="Өмнөх хуудас" className="flex size-9 items-center justify-center rounded border border-catalog-border disabled:opacity-40"><IconChevronLeft size={16} /></button>
              {[...new Set([1, result.page - 1, result.page, result.page + 1, result.pageCount])].filter((value) => value > 0 && value <= result.pageCount).sort((a, b) => a - b).map((value, index, pages) => <span key={value} className="flex items-center gap-1">
                {index > 0 && value - pages[index - 1] > 1 && <span aria-hidden="true">…</span>}
                <button type="button" disabled={busy || invalid} onClick={() => page(value)} aria-label={`${value}-р хуудас`} aria-current={result.page === value ? "page" : undefined} className={`flex min-h-9 min-w-9 items-center justify-center rounded px-2 disabled:opacity-40 ${result.page === value ? "bg-primary text-search-text" : "border border-catalog-border"}`}>{value}</button>
              </span>)}
              <button type="button" disabled={busy || invalid || result.page >= result.pageCount} onClick={() => page(result.page + 1)} aria-label="Дараах хуудас" className="flex size-9 items-center justify-center rounded border border-catalog-border disabled:opacity-40"><IconChevronRight size={16} /></button>
            </nav>
          </div>}
        </section>
      </div>
    </div>
  </div>;
}
