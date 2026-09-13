import { CATALOG_LIMITS, VEHICLE_SEARCH_FIELDS, VEHICLE_LISTING_SORTS, vehicleListingQuery, normalizeVehicleSearchParams, vehicleSearchParams, type VehicleListingQuery, type VehicleSearchField, type VehicleSearchParams } from "@bigmotors/core";
import { EMPTY_LOOKUPS, type HomeSearchLookups, type HomeVehicleResult } from "../home.searcher/model";
export type VehicleCatalogResult = HomeVehicleResult & { brandCounts: Record<string, number> };

export type RangeName = "price" | "year" | "mileage" | "engine";
export type Option = { value: string; label: string };
type Preset = Option & { min: string; max: string };
export const RANGE_PRESETS: Record<Exclude<RangeName, "engine">, Preset[]> = {
  price: [
    { value: "under20", label: "< 20 сая", min: "", max: "19999999" },
    { value: "20to50", label: "20–50 сая", min: "20000000", max: "50000000" },
    { value: "50to100", label: "50–100 сая", min: "50000000", max: "100000000" },
    { value: "over100", label: "100 сая+", min: "100000000", max: "" },
  ],
  year: [2024, 2022, 2020].map((year) => ({ value: String(year), label: `${year}+`, min: String(year), max: "" })),
  mileage: [50000, 100000, 150000].map((max) => ({ value: String(max), label: `< ${max.toLocaleString("en-US")} км`, min: "", max: String(max - 1) })),
};

export function changeFilter(values: VehicleSearchParams, field: VehicleSearchField, value: string): VehicleSearchParams {
  return normalizeVehicleSearchParams({ ...values, [field]: value,
    ...(field === "brand" ? { model: "", variant: "" } : field === "model" ? { variant: "" } : {}),
  });
}

export function applyPreset(values: VehicleSearchParams, name: Exclude<RangeName, "engine">, value: string): VehicleSearchParams {
  const preset = RANGE_PRESETS[name].find((item) => item.value === value);
  return normalizeVehicleSearchParams({ ...values, [`${name}_min`]: preset?.min ?? "", [`${name}_max`]: preset?.max ?? "" });
}

export function selectedPreset(values: VehicleSearchParams, name: Exclude<RangeName, "engine">): string | undefined {
  const min = values[`${name}_min`] ?? ""; const max = values[`${name}_max`] ?? "";
  if (!min && !max) return "";
  const same = (a: string, b: string) => a === b || (!!a && !!b && /^\d+$/.test(a) && /^\d+$/.test(b) && Number(a) === Number(b));
  return RANGE_PRESETS[name].find((preset) => same(min, preset.min) && same(max, preset.max))?.value;
}

export function filterErrors(values: VehicleSearchParams, lookups: HomeSearchLookups = EMPTY_LOOKUPS): Partial<Record<VehicleSearchField, string>> {
  const result = vehicleSearchParams.safeParse(values);
  const errors: Partial<Record<VehicleSearchField, string>> = {};
  if (!result.success) for (const issue of result.error.issues) {
    const key = issue.path[0] as VehicleSearchField;
    errors[key] ??= issue.message === "Invalid range." ? "Дээд утга доод утгаас бага байж болохгүй."
      : issue.message === "Future year." ? "Ирээдүйн он оруулж болохгүй."
      : key?.endsWith("_min") || key?.endsWith("_max") ? "Зөвшөөрөгдөх хязгаарт бүхэл тоо оруулна уу." : "Сонголтын утга буруу байна.";
  }
  const model = lookups.models.find((row) => row.id === values.model);
  const variant = lookups.variants.find((row) => row.id === values.variant);
  if (model && values.brand && model.brandId !== values.brand) errors.model = "Сонгосон марктай тохирох загвар сонгоно уу.";
  if (variant && values.model && variant.modelId !== values.model) errors.variant = "Сонгосон загвартай тохирох хувилбар сонгоно уу.";
  return errors;
}

export const rangeLimits = {
  price: [0, CATALOG_LIMITS.priceMax], year: [CATALOG_LIMITS.yearMin, new Date().getUTCFullYear()],
  mileage: [0, CATALOG_LIMITS.mileageMax], engine: [0, CATALOG_LIMITS.engineCapacityMax],
};

// Sort/page are listing controls, not fields in the shared product-group filter contract.
export const PREVIEW_SORTS = VEHICLE_LISTING_SORTS;
export type PreviewSort = (typeof PREVIEW_SORTS)[number];
export function readPreviewQuery(query: Record<string, string | string[] | undefined>, lookups: HomeSearchLookups = EMPTY_LOOKUPS) {
  const { sort, page, page_size, columns, ...raw } = query;
  const messages: string[] = [];
  const filters: VehicleSearchParams = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!VEHICLE_SEARCH_FIELDS.includes(key as VehicleSearchField)) { messages.push("URL-д танихгүй шүүлтүүр байна."); continue; }
    if (Array.isArray(value)) { messages.push("Нэг талбарт зөвхөн нэг утга сонгоно уу."); continue; }
    if (value !== undefined) filters[key as VehicleSearchField] = value.trim();
  }
  if (sort !== undefined && !PREVIEW_SORTS.includes(sort as PreviewSort)) messages.push("Эрэмбийн утга буруу байна.");
  if (page !== undefined && (typeof page !== "string" || !/^[1-9]\d{0,5}$/.test(page))) messages.push("Хуудасны дугаар буруу байна.");
  const parsed = vehicleSearchParams.safeParse(filters);
  const normalized = parsed.success ? parsed.data : normalizeVehicleSearchParams(filters);
  const variant = lookups.variants.find((row) => row.id === normalized.variant);
  if (!normalized.model && variant) normalized.model = variant.modelId;
  const model = lookups.models.find((row) => row.id === normalized.model);
  if (!normalized.brand && model) normalized.brand = model.brandId;
  const listing = vehicleListingQuery.safeParse({ ...normalized, sort, page, page_size, columns });
  if (!listing.success && !Object.keys(filterErrors(normalized, lookups)).length) messages.push("Хайлтын параметрүүдийг шалгана уу.");
  return {
    filters: normalized,
    sort: PREVIEW_SORTS.includes(sort as PreviewSort) ? sort as PreviewSort : "newest" as const,
    message: [...new Set(messages)].join(" "),
    query: listing.success && !messages.length && !Object.keys(filterErrors(normalized, lookups)).length ? listing.data : null,
  };
}

export function listingFilters(query: VehicleListingQuery): VehicleSearchParams {
  return normalizeVehicleSearchParams(query);
}
