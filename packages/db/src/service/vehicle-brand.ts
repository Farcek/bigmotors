import { CATALOG_LIMITS } from "@bigmotors/core";
import { NappError } from "@napp/error";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { vehicleBrands } from "../schema/references.js";
import { TKN_DB, type BigMotorsDb } from "../db.js";
import { defineInject, INJECT, Token, TOKEN } from "@napp/di";

const fields = z.object({
  name: z.string().trim().min(1).max(CATALOG_LIMITS.title),
  description: z.string().trim().max(CATALOG_LIMITS.description)
    .transform((value) => value === "" ? null : value).nullable().optional(),
  sortOrder: z.number().int().min(-2_147_483_648).max(2_147_483_647).optional(),
  isActive: z.boolean().optional(),
}).strict();

const updateFields = fields.partial().refine(
  (value) => Object.values(value).some((field) => field !== undefined),
  "At least one field is required.",
);
const listParams = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).max(2_147_483_647).default(0),
  isActive: z.boolean().optional(),
}).strict();
const vehicleBrandId = z.string().uuid();

export type VehicleBrand = typeof vehicleBrands.$inferSelect;
export type CreateVehicleBrandInput = z.input<typeof fields>;
export type UpdateVehicleBrandInput = z.input<typeof updateFields>;
export type ListVehicleBrandsParams = z.input<typeof listParams>;

function parse<T extends z.ZodType>(schema: T, value: unknown): z.output<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new NappError("Invalid vehicle brand input.", { code: "VEHICLE_BRAND_INVALID_INPUT", status: 400 });
  }
  return result.data;
}

function storageError(error: unknown): never {
  if (error instanceof NappError) throw error;
  // Drizzle wraps driver errors; constraints remain the authority for races.
  const cause = error instanceof Error && error.cause ? error.cause : error;
  if (typeof cause === "object" && cause !== null && "code" in cause && "constraint" in cause) {
    if (cause.code === "23505" && cause.constraint === "vehicle_brands_name_unique") {
      throw new NappError("A vehicle brand with this name already exists.", { code: "VEHICLE_BRAND_NAME_CONFLICT", status: 409 });
    }
    if ((cause.code === "23503" || cause.code === "23001")
      && (cause.constraint === "vehicle_models_brand_id_vehicle_brands_id_fk"
        || cause.constraint === "vehicles_brand_id_vehicle_brands_id_fk"
        || cause.constraint === "part_fitments_brand_id_vehicle_brands_id_fk")) {
      throw new NappError("This vehicle brand is in use. Deactivate it instead.", { code: "VEHICLE_BRAND_IN_USE", status: 409 });
    }
  }
  throw new NappError("Vehicle brand storage operation failed.", { code: "VEHICLE_BRAND_STORAGE_ERROR", status: 500, cause: error });
}

function requireVehicleBrand(row: VehicleBrand | undefined): VehicleBrand {
  if (!row) throw new NappError("Vehicle brand not found.", { code: "VEHICLE_BRAND_NOT_FOUND", status: 404 });
  return row;
}

export class VehicleBrandService {
  static [TOKEN] = Token.create<VehicleBrandService>("VehicleBrandService");
  static [INJECT] = defineInject(VehicleBrandService,
    [TKN_DB] as const
  );

  constructor(private readonly db: BigMotorsDb) { }

  async list(param: ListVehicleBrandsParams = {}): Promise<VehicleBrand[]> {
    const input = parse(listParams, param);
    try {
      return await this.db.select().from(vehicleBrands)
        .where(input.isActive === undefined ? undefined : eq(vehicleBrands.isActive, input.isActive))
        .orderBy(asc(vehicleBrands.sortOrder), asc(vehicleBrands.name), asc(vehicleBrands.id))
        .limit(input.limit).offset(input.offset);
    } catch (error) {
      storageError(error);
    }
  }

  async create(param: CreateVehicleBrandInput): Promise<VehicleBrand> {
    const input = parse(fields, param);
    try {
      const [row] = await this.db.insert(vehicleBrands).values(input).returning();
      return requireVehicleBrand(row);
    } catch (error) {
      storageError(error);
    }
  }

  async update(id: string, param: UpdateVehicleBrandInput): Promise<VehicleBrand> {
    const key = parse(vehicleBrandId, id);
    const input = parse(updateFields, param);
    try {
      const [row] = await this.db.update(vehicleBrands).set(input).where(eq(vehicleBrands.id, key)).returning();
      return requireVehicleBrand(row);
    } catch (error) {
      storageError(error);
    }
  }

  async delete(id: string): Promise<VehicleBrand> {
    const key = parse(vehicleBrandId, id);
    try {
      const [row] = await this.db.delete(vehicleBrands).where(eq(vehicleBrands.id, key)).returning();
      return requireVehicleBrand(row);
    } catch (error) {
      storageError(error);
    }
  }
}
