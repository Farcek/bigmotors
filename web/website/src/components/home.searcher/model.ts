export const SEARCH_FIELDS = [
  "brand", "model", "mileage_min", "mileage_max", "engine_min", "engine_max",
  "year_min", "year_max", "price_min", "price_max", "variant", "category",
  "condition", "fuel", "transmission", "drivetrain", "steering", "color",
] as const;

export type HomeSearchFilters = Partial<Record<(typeof SEARCH_FIELDS)[number], string>>;
export type VehicleConditionFilter = "" | "new" | "used";
export type GridColumns = 2 | 3 | 4 | 6;

export function readHomeSearchFilters(data: FormData): HomeSearchFilters {
  return Object.fromEntries(SEARCH_FIELDS.flatMap((key) => {
    const value = data.get(key);
    return typeof value === "string" && value.trim() ? [[key, value.trim()]] : [];
  }));
}

export function getVehicleSearchHref(filters: HomeSearchFilters): string {
  const query = new URLSearchParams();
  for (const key of SEARCH_FIELDS) {
    const value = filters[key]?.trim();
    if (value) query.set(key, value);
  }
  return query.size ? `/vehicles?${query}` : "/vehicles";
}

export function homePageCount(total: number): number {
  return Number.isFinite(total) ? Math.min(3, Math.max(0, Math.floor(total))) : 0;
}
