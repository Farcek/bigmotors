import { z } from "zod";
import { CATALOG_LIMITS, DRIVETRAINS, FUEL_TYPES, STEERING_POSITIONS, TRANSMISSIONS, VEHICLE_CONDITIONS } from "./catalog.js";

export const vehicleQueryNumber = (min: number, max: number) => z.union([z.number(), z.string().regex(/^\d{1,11}$/).transform(Number)]).pipe(z.number().int().min(min).max(max));
const uuid = z.string().uuid().transform((value) => value.toLowerCase()).optional();
export const vehicleFilterFields = z.object({
  brand: uuid, model: uuid, variant: uuid, category: uuid, color: uuid,
  condition: z.enum(VEHICLE_CONDITIONS).optional(), fuel: z.enum(FUEL_TYPES).optional(),
  transmission: z.enum(TRANSMISSIONS).optional(), drivetrain: z.enum(DRIVETRAINS).optional(), steering: z.enum(STEERING_POSITIONS).optional(),
  mileage_min: vehicleQueryNumber(0, CATALOG_LIMITS.mileageMax).optional(), mileage_max: vehicleQueryNumber(0, CATALOG_LIMITS.mileageMax).optional(),
  engine_min: vehicleQueryNumber(0, CATALOG_LIMITS.engineCapacityMax).optional(), engine_max: vehicleQueryNumber(0, CATALOG_LIMITS.engineCapacityMax).optional(),
  year_min: vehicleQueryNumber(CATALOG_LIMITS.yearMin, 32767).optional(), year_max: vehicleQueryNumber(CATALOG_LIMITS.yearMin, 32767).optional(),
  price_min: vehicleQueryNumber(0, CATALOG_LIMITS.priceMax).optional(), price_max: vehicleQueryNumber(0, CATALOG_LIMITS.priceMax).optional(),
}).strict();
export type VehicleFilters = z.output<typeof vehicleFilterFields>;
export function validateVehicleRanges(value: VehicleFilters, ctx: z.RefinementCtx) {
  for (const prefix of ["mileage", "engine", "year", "price"] as const) {
    const min = value[`${prefix}_min`]; const max = value[`${prefix}_max`];
    if (min !== undefined && max !== undefined && min > max) ctx.addIssue({ code: "custom", path: [`${prefix}_max`], message: "Invalid range." });
  }
  for (const key of ["year_min", "year_max"] as const) if (value[key] !== undefined && value[key] > new Date().getUTCFullYear()) ctx.addIssue({ code: "custom", path: [key], message: "Future year." });
}
export const vehicleFilters = vehicleFilterFields.superRefine(validateVehicleRanges);
