import { z } from "zod";
import { CATALOG_LIMITS, DRIVETRAINS, FUEL_TYPES, STEERING_POSITIONS, TRANSMISSIONS, VEHICLE_CONDITIONS } from "./catalog.js";

export const vehicleQueryNumber = (min: number, max: number) => z.union([z.number(), z.string().regex(/^\d{1,11}$/).transform(Number)]).pipe(z.number().int().min(min).max(max));
const numeric = (min: number, max: number) => z.string().trim().regex(/^\d{1,11}$/).refine((value) => Number(value) >= min && Number(value) <= max, "Out of range.").optional();
const uuid = z.string().trim().uuid().transform((value) => value.toLowerCase()).optional();
const fields = z.object({
  brand: uuid, model: uuid,
  mileage_min: numeric(0, CATALOG_LIMITS.mileageMax), mileage_max: numeric(0, CATALOG_LIMITS.mileageMax),
  engine_min: numeric(0, CATALOG_LIMITS.engineCapacityMax), engine_max: numeric(0, CATALOG_LIMITS.engineCapacityMax),
  year_min: numeric(CATALOG_LIMITS.yearMin, 32767), year_max: numeric(CATALOG_LIMITS.yearMin, 32767),
  price_min: numeric(0, CATALOG_LIMITS.priceMax), price_max: numeric(0, CATALOG_LIMITS.priceMax),
  variant: uuid, category: uuid,
  condition: z.enum(VEHICLE_CONDITIONS).optional(), fuel: z.enum(FUEL_TYPES).optional(),
  transmission: z.enum(TRANSMISSIONS).optional(), drivetrain: z.enum(DRIVETRAINS).optional(), steering: z.enum(STEERING_POSITIONS).optional(), color: uuid,
}).strict();

export type VehicleSearchField = keyof typeof fields.shape;
export type VehicleSearchParams = Partial<Record<VehicleSearchField, string | undefined>>;
export const VEHICLE_SEARCH_FIELDS = fields.keyof().options;
export const VEHICLE_SEARCH_NUMERIC_FIELDS = VEHICLE_SEARCH_FIELDS.filter((key): key is Extract<VehicleSearchField, `${string}_min` | `${string}_max`> => key.endsWith("_min") || key.endsWith("_max"));

// Empty controls are omitted without coercing non-string values or dropping unknown keys.
function omitEmptyValues(value: unknown): unknown {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return value;
  return Object.fromEntries(Object.entries(value).flatMap(([key, item]) => {
    if (item === undefined && VEHICLE_SEARCH_FIELDS.includes(key as VehicleSearchField)) return [];
    if (typeof item === "string") return item.trim() ? [[key, item.trim()]] : (VEHICLE_SEARCH_FIELDS.includes(key as VehicleSearchField) ? [] : [[key, item]]);
    return [[key, item]];
  }));
}
const validatedParams = z.transform<VehicleSearchParams, unknown>(omitEmptyValues).pipe(fields.superRefine((value, ctx) => {
  for (const prefix of ["mileage", "engine", "year", "price"] as const) {
    const min = value[`${prefix}_min`]; const max = value[`${prefix}_max`];
    if (min !== undefined && max !== undefined && Number(min) > Number(max)) ctx.addIssue({ code: "custom", path: [`${prefix}_max`], message: "Invalid range." });
  }
  for (const key of ["year_min", "year_max"] as const) if (value[key] !== undefined && Number(value[key]) > new Date().getUTCFullYear()) ctx.addIssue({ code: "custom", path: [key], message: "Future year." });
}));

export const vehicleSearchParams = validatedParams.transform((value): VehicleSearchParams => value);
type ValidatedParams = z.output<typeof validatedParams>;
export type ParsedVehicleFilters = { [K in keyof ValidatedParams]: K extends (typeof VEHICLE_SEARCH_NUMERIC_FIELDS)[number] ? number | undefined : ValidatedParams[K] };
export const parsedVehicleFilters = validatedParams.transform((value): ParsedVehicleFilters => Object.fromEntries(
  Object.entries(value).map(([key, item]) => [key, VEHICLE_SEARCH_NUMERIC_FIELDS.includes(key as (typeof VEHICLE_SEARCH_NUMERIC_FIELDS)[number]) && item !== undefined ? Number(item) : item]),
) as ParsedVehicleFilters);

export function normalizeVehicleSearchParams(value: VehicleSearchParams): VehicleSearchParams {
  return Object.fromEntries(VEHICLE_SEARCH_FIELDS.flatMap((key) => {
    const item = value[key]?.trim();
    return item ? [[key, item]] : [];
  }));
}
export function vehicleSearchToQuery(value: VehicleSearchParams): URLSearchParams {
  return new URLSearchParams(normalizeVehicleSearchParams(value) as Record<string, string>);
}
export function getVehicleSearchHref(value: VehicleSearchParams): string {
  const query = vehicleSearchToQuery(value);
  return query.size ? `/vehicles?${query}` : "/vehicles";
}
export function readVehicleSearchParams(query: URLSearchParams): VehicleSearchParams {
  if (Array.from(query.keys()).some((key) => query.getAll(key).length > 1)) throw new Error("Duplicate vehicle search field.");
  return vehicleSearchParams.parse(Object.fromEntries(query));
}
export function readVehicleSearchForm(data: Pick<FormData, "get">): VehicleSearchParams {
  return normalizeVehicleSearchParams(Object.fromEntries(VEHICLE_SEARCH_FIELDS.flatMap((key) => {
    const value = data.get(key);
    return typeof value === "string" ? [[key, value]] : [];
  })));
}
