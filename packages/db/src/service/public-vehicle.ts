import { defineInject, INJECT, TOKEN, Token } from "@napp/di";
import { NappError } from "@napp/error";
import { parsedVehicleFilters, vehicleQueryNumber, type VehicleSearchParams } from "@bigmotors/core";
import { and, asc, count, desc, eq, gte, lte, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { z } from "zod";
import { TKN_DB, type BigMotorsDb } from "../db.js";
import { products, productImages } from "../schema/products.js";
import { vehicles } from "../schema/vehicles.js";
import { files } from "../schema/files.js";
import { colors, vehicleBrands, vehicleModels, vehicleVariants, vehicleBodyTypes } from "../schema/references.js";

export const HOME_VEHICLE_PAGE_SIZE = 12;
export const publicVehicleQuery = z.preprocess((input) => {
  if (!input || typeof input !== "object" || Array.isArray(input)) return input;
  const { page, ...filters } = input as Record<string, unknown>;
  return { page, filters };
}, z.object({ page: vehicleQueryNumber(1, 3).default(1), filters: parsedVehicleFilters }).transform(({ page, filters }) => ({ ...filters, page })));
export type PublicVehicleQuery = VehicleSearchParams & { page?: number | string };
export class PublicVehicleQueryError extends NappError {
  constructor() { super("Invalid vehicle search.", { code: "INVALID_VEHICLE_SEARCH", status: 400 }); }
}

function publicVehicleWhere(query: z.output<typeof publicVehicleQuery>) {
    const filters: SQL[] = [eq(products.productType, "vehicle"), eq(products.publicationStatus, "published"), eq(vehicles.saleStatus, "available")];
    const refs = { brand: vehicles.brandId, model: vehicles.modelId, variant: vehicles.variantId, category: vehicles.bodyTypeId, color: vehicles.exteriorColorId };
    for (const key of Object.keys(refs) as (keyof typeof refs)[]) if (query[key]) filters.push(eq(refs[key], query[key]!));
    if (query.condition) filters.push(eq(vehicles.condition, query.condition));
    if (query.fuel) filters.push(eq(vehicles.fuelType, query.fuel));
    if (query.transmission) filters.push(eq(vehicles.transmission, query.transmission));
    if (query.drivetrain) filters.push(eq(vehicles.drivetrain, query.drivetrain));
    if (query.steering) filters.push(eq(vehicles.steeringPosition, query.steering));
    const ranges = { mileage: vehicles.mileageKm, engine: vehicles.engineCapacityCc, year: vehicles.manufactureYear, price: products.price };
    for (const key of Object.keys(ranges) as (keyof typeof ranges)[]) {
      const min = query[`${key}_min`]; const max = query[`${key}_max`];
      if (min !== undefined) filters.push(gte(ranges[key], min));
      if (max !== undefined) filters.push(lte(ranges[key], max));
    }
    // Hidden prices must neither be returned nor influence price-filter results.
    if (query.price_min !== undefined || query.price_max !== undefined) filters.push(eq(products.priceDisplayMode, "show_price"));
    return and(...filters)!;
}

export class PublicVehicleService {
  static [TOKEN] = Token.create<PublicVehicleService>("PublicVehicleService");
  static [INJECT] = defineInject(PublicVehicleService, [TKN_DB] as const);
  constructor(private readonly db: BigMotorsDb) {}

  async countGroups(inputs: VehicleSearchParams[]): Promise<number[]> {
    const conditions = inputs.map((input) => {
      const filters = parsedVehicleFilters.safeParse(input);
      if (!filters.success) throw new PublicVehicleQueryError();
      return publicVehicleWhere({ ...filters.data, page: 1 });
    });
    const totals: number[] = [];
    // Count groups together without fetching cards or issuing one query per group.
    for (let offset = 0; offset < conditions.length; offset += 100) {
      const batch = conditions.slice(offset, offset + 100);
      const selection = Object.fromEntries(batch.map((where, i) => [`group_${i}`, sql<number>`count(*) filter (where ${where})`.mapWith(Number)]));
      const [row] = await this.db.select(selection).from(products).innerJoin(vehicles, eq(vehicles.productId, products.id));
      totals.push(...batch.map((_, i) => row?.[`group_${i}`] ?? 0));
    }
    return totals;
  }

  async list(input: PublicVehicleQuery = {}) {
    const parsed = publicVehicleQuery.safeParse(input);
    if (!parsed.success) throw new PublicVehicleQueryError();
    const query = parsed.data;
    const where = publicVehicleWhere(query);
    const main = alias(files, "main_file"); const item = alias(files, "item_file");
    return this.db.transaction(async (tx) => {
      const [row] = await tx.select({ total: count() }).from(products).innerJoin(vehicles, eq(vehicles.productId, products.id)).where(where);
      const total = row?.total ?? 0;
      const pageCount = Math.min(3, Math.ceil(total / HOME_VEHICLE_PAGE_SIZE));
      const page = Math.min(query.page, Math.max(1, pageCount));
      const items = await tx.select({
        id: products.id, title: products.title, itemTitle: products.itemTitle, description: products.description, itemDesc: products.itemDesc,
        mainImageId: main.id, mainImageName: main.originalName, itemImageId: item.id, itemImageName: item.originalName,
        manufactureYear: vehicles.manufactureYear, mileageKm: vehicles.mileageKm, transmission: vehicles.transmission,
        fuelType: vehicles.fuelType, engineCapacityCc: vehicles.engineCapacityCc, financingAvailable: vehicles.financingAvailable, youtubeUrl: vehicles.youtubeUrl,
        price: sql<number | null>`case when ${products.priceDisplayMode} = 'show_price' then ${products.price} else null end`.mapWith((value) => value === null ? null : Number(value)),
        currency: products.currency, priceDisplayMode: products.priceDisplayMode,
        imageCount: sql<number>`(select count(*) from ${productImages} where ${productImages.productId} = ${products.id})`.mapWith(Number),
      }).from(products).innerJoin(vehicles, eq(vehicles.productId, products.id))
        .leftJoin(main, eq(main.id, products.mainImageId)).leftJoin(item, eq(item.id, products.itemImageId)).where(where)
        .orderBy(desc(products.firstPublishedAt), asc(products.id)).limit(HOME_VEHICLE_PAGE_SIZE).offset((page - 1) * HOME_VEHICLE_PAGE_SIZE);
      return { items, total, page, pageCount, pageSize: HOME_VEHICLE_PAGE_SIZE };
    }, { isolationLevel: "repeatable read", accessMode: "read only" });
  }

  async lookups() {
    return this.db.transaction(async (tx) => {
      const brands = await tx.select({ id: vehicleBrands.id, name: vehicleBrands.name }).from(vehicleBrands).where(eq(vehicleBrands.isActive, true)).orderBy(asc(vehicleBrands.sortOrder), asc(vehicleBrands.name), asc(vehicleBrands.id));
      const models = await tx.select({ id: vehicleModels.id, name: vehicleModels.name, brandId: vehicleModels.brandId }).from(vehicleModels).innerJoin(vehicleBrands, eq(vehicleBrands.id, vehicleModels.brandId)).where(and(eq(vehicleModels.isActive, true), eq(vehicleBrands.isActive, true))).orderBy(asc(vehicleModels.sortOrder), asc(vehicleModels.name), asc(vehicleModels.id));
      const variants = await tx.select({ id: vehicleVariants.id, name: vehicleVariants.name, modelId: vehicleVariants.modelId }).from(vehicleVariants).innerJoin(vehicleModels, eq(vehicleModels.id, vehicleVariants.modelId)).innerJoin(vehicleBrands, eq(vehicleBrands.id, vehicleModels.brandId)).where(and(eq(vehicleVariants.isActive, true), eq(vehicleModels.isActive, true), eq(vehicleBrands.isActive, true))).orderBy(asc(vehicleVariants.sortOrder), asc(vehicleVariants.name), asc(vehicleVariants.id));
      const categories = await tx.select({ id: vehicleBodyTypes.id, name: vehicleBodyTypes.name }).from(vehicleBodyTypes).where(eq(vehicleBodyTypes.isActive, true)).orderBy(asc(vehicleBodyTypes.sortOrder), asc(vehicleBodyTypes.name), asc(vehicleBodyTypes.id));
      const palette = await tx.select({ id: colors.id, name: colors.name }).from(colors).where(eq(colors.isActive, true)).orderBy(asc(colors.sortOrder), asc(colors.name), asc(colors.id));
      return { brands, models, variants, categories, colors: palette };
    }, { isolationLevel: "repeatable read", accessMode: "read only" });
  }
}

export type PublicVehicleResult = Awaited<ReturnType<PublicVehicleService["list"]>>;
export type PublicVehicleLookups = Awaited<ReturnType<PublicVehicleService["lookups"]>>;
