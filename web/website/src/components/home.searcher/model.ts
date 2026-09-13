import type { PublicVehicleLookups } from "@bigmotors/db";
import type { VehicleSearchParams } from "@bigmotors/core";
export { VEHICLE_SEARCH_FIELDS as SEARCH_FIELDS, readVehicleSearchForm as readHomeSearchFilters, getVehicleSearchHref } from "@bigmotors/core";
import type { CarCardData } from "../car.card/model";

export type HomeSearchLookups = PublicVehicleLookups;
export type HomeVehicleResult = { items: CarCardData[]; total: number; page: number; pageCount: number; pageSize: number };
export const EMPTY_LOOKUPS: HomeSearchLookups = { brands: [], models: [], variants: [], categories: [], colors: [] };

export type HomeSearchFilters = VehicleSearchParams;
export type VehicleConditionFilter = "" | "new" | "used";
export type GridColumns = 2 | 3 | 4 | 6;

export function homePageCount(total: number): number {
  return Number.isFinite(total) ? Math.min(3, Math.max(0, Math.floor(total))) : 0;
}
