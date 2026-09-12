import {
  CATALOG_LIMITS as L, CURRENCIES, DRIVETRAINS, FUEL_TYPES, PRICE_DISPLAY_MODES,
  PUBLICATION_STATUSES, STEERING_POSITIONS, TRANSMISSIONS,
  VEHICLE_ARRIVAL_STATUSES, VEHICLE_CONDITIONS, VEHICLE_SALE_STATUSES,
} from "@bigmotors/core";
import { z } from "zod";

const id = z.string().uuid().transform((value) => value.toLowerCase());
const short = (max: number) => z.string().trim().max(max).transform((s) => s || null).nullable();
const year = z.number().int().min(L.yearMin).max(32767)
  .refine((n) => n <= new Date().getUTCFullYear(), "Year cannot be in the future.");
const price = z.number().int().min(L.priceMin).max(L.priceMax);
const mileage = z.number().int().min(L.mileageMin).max(L.mileageMax);
export const vehicleProductFields = z.object({
  title: z.string().trim().min(1).max(L.title), description: short(L.description), content: z.string().nullable(),
  mainImageId: id.nullable(), itemTitle: short(L.title), itemDesc: short(L.description), itemImageId: id.nullable(),
  price: price.nullable(), currency: z.enum(CURRENCIES).nullable(), priceDisplayMode: z.enum(PRICE_DISPLAY_MODES).nullable(),
  isFeatured: z.boolean(), internalNote: z.string().nullable(),
}).strict();
export const vehicleDetailFields = z.object({
  brandId: id.nullable(), modelId: id.nullable(), variantId: id.nullable(),
  manufactureYear: year.nullable(), importYear: year.nullable(), vin: z.string().nullable(),
  bodyTypeId: id.nullable(), fuelType: z.enum(FUEL_TYPES).nullable(),
  engineCapacityCc: z.number().int().min(L.engineCapacityMin).max(L.engineCapacityMax).nullable(),
  transmission: z.enum(TRANSMISSIONS).nullable(), drivetrain: z.enum(DRIVETRAINS).nullable(),
  steeringPosition: z.enum(STEERING_POSITIONS).nullable(), exteriorColorId: id.nullable(), interiorColorId: id.nullable(),
  seatCount: z.number().int().min(L.seatsMin).max(L.seatsMax).nullable(), condition: z.enum(VEHICLE_CONDITIONS).nullable(),
  mileageKm: mileage.nullable(), branchId: id.nullable(), locationId: id.nullable(), conditionDescription: short(L.description),
  saleStatus: z.enum(VEHICLE_SALE_STATUSES).nullable(), arrivalStatus: z.enum(VEHICLE_ARRIVAL_STATUSES).nullable(),
  financingAvailable: z.boolean().nullable(),
}).strict();
const fields = vehicleProductFields.extend(vehicleDetailFields.shape).extend({
  images: z.array(z.object({ fileId: id, sortOrder: z.number().int().min(0).max(2147483647) }).strict())
    .refine((rows) => new Set(rows.map((r) => r.fileId)).size === rows.length),
  featureIds: z.array(id).refine((rows) => new Set(rows).size === rows.length),
}).partial();
export const vehicleCreateInput = fields.required({ title: true });
export const vehicleUpdateInput = fields.refine((v) => Object.values(v).some((x) => x !== undefined));
export const vehicleId = id;
export const vehicleListInput = z.object({
  limit: z.number().int().min(1).max(100).default(50), offset: z.number().int().min(0).max(2147483647).default(0),
  search: z.string().trim().min(1).max(L.title).optional(), publicationStatus: z.enum(PUBLICATION_STATUSES).optional(),
  isFeatured: z.boolean().optional(), brandId: id.optional(), modelId: id.optional(), variantId: id.optional(),
  bodyTypeId: id.optional(), branchId: id.optional(), locationId: id.optional(),
  condition: z.enum(VEHICLE_CONDITIONS).optional(), saleStatus: z.enum(VEHICLE_SALE_STATUSES).optional(),
  arrivalStatus: z.enum(VEHICLE_ARRIVAL_STATUSES).optional(), fuelType: z.enum(FUEL_TYPES).optional(),
  transmission: z.enum(TRANSMISSIONS).optional(), drivetrain: z.enum(DRIVETRAINS).optional(),
  steeringPosition: z.enum(STEERING_POSITIONS).optional(), priceDisplayMode: z.enum(PRICE_DISPLAY_MODES).optional(),
  priceMin: price.optional(), priceMax: price.optional(), manufactureYearMin: year.optional(), manufactureYearMax: year.optional(),
  mileageKmMin: mileage.optional(), mileageKmMax: mileage.optional(),
  sort: z.enum(["created_desc", "updated_desc", "title_asc", "price_asc", "price_desc", "year_desc", "mileage_asc"]).default("created_desc"),
}).strict().refine((v) => [[v.priceMin, v.priceMax], [v.manufactureYearMin, v.manufactureYearMax], [v.mileageKmMin, v.mileageKmMax]]
  .every(([min, max]) => min === undefined || max === undefined || min <= max));

export type CreateVehicleInput = z.input<typeof vehicleCreateInput>;
export type UpdateVehicleInput = z.input<typeof vehicleUpdateInput>;
export type ListVehiclesParams = z.input<typeof vehicleListInput>;
