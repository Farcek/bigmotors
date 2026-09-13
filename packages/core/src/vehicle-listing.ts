import { z } from "zod";
import { vehicleSearchParams, type VehicleSearchParams } from "./vehicle-search.js";

export const VEHICLE_LISTING_SORTS = ["newest", "price_asc", "price_desc"] as const;
export const VEHICLE_LISTING_COLUMNS = ["2", "3", "4", "6"] as const;
export const VEHICLE_LISTING_PAGE_SIZES = ["12", "18", "24", "36"] as const;
export const vehicleListingQuery = z.preprocess((input) => {
  if (!input || typeof input !== "object" || Array.isArray(input)) return input;
  const { page, page_size, sort, columns, ...filters } = input as Record<string, unknown>;
  return { page, page_size, sort, columns, filters };
}, z.object({
  filters: vehicleSearchParams,
  page: z.string().regex(/^[1-9]\d{0,5}$/).default("1"),
  page_size: z.enum(VEHICLE_LISTING_PAGE_SIZES).default("24"),
  sort: z.enum(VEHICLE_LISTING_SORTS).default("newest"),
  columns: z.enum(VEHICLE_LISTING_COLUMNS).default("3"),
}).transform(({ filters, ...controls }) => ({ ...filters, ...controls })));

export type VehicleListingQuery = z.output<typeof vehicleListingQuery>;
export type VehicleListingInput = VehicleSearchParams & Partial<Pick<VehicleListingQuery, "page" | "page_size" | "sort" | "columns">>;

export function readVehicleListingQuery(params: URLSearchParams): VehicleListingQuery {
  if ([...params.keys()].some((key) => params.getAll(key).length > 1)) throw new Error("Duplicate vehicle listing field.");
  return vehicleListingQuery.parse(Object.fromEntries(params));
}

export function vehicleListingToQuery(input: VehicleListingInput): URLSearchParams {
  return new URLSearchParams(vehicleListingQuery.parse(input) as Record<string, string>);
}

export function vehicleListingPageSize(columns: VehicleListingQuery["columns"], desktop: boolean): VehicleListingQuery["page_size"] {
  return desktop ? ({ "2": "12", "3": "18", "4": "24", "6": "36" } as const)[columns] : "24";
}
