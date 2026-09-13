"use client";

import { IconChevronDown, IconMinus, IconPlus, IconSearch, IconX } from "@tabler/icons-react";
import { useId, useState } from "react";
import { readHomeSearchFilters, type HomeSearchFilters, type VehicleConditionFilter } from "./model";

const controlClass = "h-11 w-full min-w-0 rounded border border-search-border bg-search-surface px-3 text-sm text-search-text placeholder:text-search-muted focus:border-search-text focus:outline-2 focus:outline-offset-2 focus:outline-primary disabled:cursor-not-allowed disabled:text-search-muted";
const labelClass = "mb-2 block text-xs leading-5 font-semibold";

function SelectField({ label, name, options = [], disabled = false, value, onChange }: {
  label: string;
  name: string;
  options?: readonly (readonly [string, string])[];
  disabled?: boolean;
  value?: string;
  onChange?: (value: string) => void;
}) {
  return <label className="block min-w-0">
    <span className={labelClass}>{label}</span>
    <span className="relative block">
      <select name={name} defaultValue={value === undefined ? "" : undefined} value={value} onChange={onChange ? (event) => onChange(event.currentTarget.value) : undefined} disabled={disabled} className={`${controlClass} appearance-none pr-9`}>
        <option value="">Бүгд</option>
        {options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
      </select>
      <IconChevronDown size={16} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-search-muted" aria-hidden="true" />
    </span>
  </label>;
}

function RangeField({ label, name, maxLength = 10 }: { label: string; name: string; maxLength?: number }) {
  return <fieldset className="min-w-0">
    <legend className={labelClass}>{label}</legend>
    <div className="grid grid-cols-2 gap-2">
      <input type="text" inputMode="numeric" name={`${name}_min`} maxLength={maxLength} aria-label={`${label}: доод`} placeholder="Доод" className={controlClass} />
      <input type="text" inputMode="numeric" name={`${name}_max`} maxLength={maxLength} aria-label={`${label}: дээд`} placeholder="Дээд" className={controlClass} />
    </div>
  </fieldset>;
}

export default function HomeSearcher({ condition, onConditionChange, onFiltersChange, onSearch }: {
  condition?: VehicleConditionFilter;
  onConditionChange?: (value: VehicleConditionFilter) => void;
  onFiltersChange?: (filters: HomeSearchFilters) => void;
  onSearch?: (filters: HomeSearchFilters) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [extraCount, setExtraCount] = useState(0);
  const [localCondition, setLocalCondition] = useState<VehicleConditionFilter>("");
  const selectedCondition = condition ?? localCondition;
  const activeCount = extraCount + (selectedCondition ? 1 : 0);
  const detailsId = useId();

  return <form
    aria-label="Автомашин хайх"
    className="relative z-30 mx-auto w-full max-w-[1040px] rounded-lg bg-search-surface p-5 text-search-text"
    onSubmit={(event) => {
      event.preventDefault();
      onSearch?.(readHomeSearchFilters(new FormData(event.currentTarget)));
    }}
    onReset={() => {
      setExtraCount(0);
      setLocalCondition("");
      onFiltersChange?.({});
    }}
    onChange={(event) => {
      const values = new FormData(event.currentTarget);
      const groups = ["year", "price", "variant", "category", "fuel", "transmission", "drivetrain", "steering", "color"];
      setExtraCount(groups.filter((key) => [key, `${key}_min`, `${key}_max`].some((name) => String(values.get(name) ?? "").trim())).length);
      onFiltersChange?.(readHomeSearchFilters(values));
    }}
  >
    <div className="grid min-w-0 grid-cols-1 items-end gap-5 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.1fr_1.1fr_auto] lg:gap-4">
      <SelectField label="Машины марк" name="brand" disabled />
      <SelectField label="Машины загвар" name="model" disabled />
      <RangeField label="Гүйлт (км)" name="mileage" />
      <RangeField label="Хөдөлгүүр (cc)" name="engine" maxLength={5} />
      <button type="submit" className="flex h-11 items-center justify-center gap-2 rounded bg-primary px-7 text-sm font-semibold transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:col-span-2 lg:col-span-1">
        <IconSearch size={18} aria-hidden="true" />Хайх
      </button>
    </div>

    <div className="mt-4 flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-1">
      <button type="button" aria-expanded={expanded} aria-controls={detailsId} onClick={() => setExpanded((value) => !value)} className="flex min-h-11 items-center gap-2 rounded text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
        {expanded ? <IconMinus size={18} aria-hidden="true" /> : <IconPlus size={18} aria-hidden="true" />}
        {expanded ? "Хураах" : "Дэлгэрэнгүй хайлт"}
        {activeCount > 0 && <span className="text-search-muted">({activeCount})</span>}
      </button>
      <button type="reset" className="flex min-h-11 items-center gap-1.5 rounded text-sm text-search-muted hover:text-search-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
        <IconX size={16} aria-hidden="true" />Цэвэрлэх
      </button>
    </div>

    <div id={detailsId} hidden={!expanded} className="mt-4 border-t border-search-border pt-6">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <RangeField label="Үйлдвэрлэсэн он" name="year" maxLength={4} />
        <RangeField label="Үнэ (₮)" name="price" maxLength={11} />
        <SelectField label="Хувилбар" name="variant" disabled />
        <SelectField label="Машины төрөл" name="category" disabled />
        <SelectField label="Шинэ / хуучин" name="condition" value={selectedCondition} onChange={(value) => {
          const next = value as VehicleConditionFilter;
          setLocalCondition(next);
          onConditionChange?.(next);
        }} options={[["new", "Шинэ"], ["used", "Хуучин"]]} />
        <SelectField label="Түлш" name="fuel" options={[["gasoline", "Бензин"], ["diesel", "Дизель"], ["hybrid", "Хайбрид"], ["plug_in_hybrid", "Plug-in hybrid"], ["electric", "Цахилгаан"], ["lpg", "LPG"], ["cng", "CNG"]]} />
        <SelectField label="Хурдны хайрцаг" name="transmission" options={[["manual", "Механик"], ["automatic", "Автомат"], ["cvt", "CVT"], ["e_cvt", "E-CVT"], ["dct", "DCT"], ["amt", "AMT"]]} />
        <SelectField label="Хөтлөгч" name="drivetrain" options={[["fwd", "Урд (FWD)"], ["rwd", "Хойд (RWD)"], ["awd", "Бүх дугуй (AWD)"], ["four_wheel_drive", "Дөрвөн дугуй (4WD)"]]} />
        <SelectField label="Жолооны байрлал" name="steering" options={[["left", "Зүүн"], ["right", "Баруун"]]} />
        <SelectField label="Гадна өнгө" name="color" disabled />
      </div>
    </div>
  </form>;
}
