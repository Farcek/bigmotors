import { CATALOG_LIMITS } from "@bigmotors/core";
import { NappError } from "@napp/error";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { vehicleVariants, vehicleModels, vehicleBrands } from "../schema/references.js";
import { TKN_DB, type BigMotorsDb } from "../db.js";
import { defineInject, INJECT, Token, TOKEN } from "@napp/di";

const fields = z.object({
  name: z.string().trim().min(1).max(CATALOG_LIMITS.title),
  description: z.string().trim().max(CATALOG_LIMITS.description)
    .transform((value) => value === "" ? null : value).nullable().optional(),
  sortOrder: z.number().int().min(-2_147_483_648).max(2_147_483_647).optional(),
  isActive: z.boolean().optional(),
}).strict();

const createFields = fields.extend({ modelId: z.string().uuid() });

const updateFields = fields.partial().refine(
  (value) => Object.values(value).some((field) => field !== undefined),
  "At least one field is required.",
);
const listParams = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).max(2_147_483_647).default(0),
  isActive: z.boolean().optional(),
  modelId: z.string().uuid().optional(),
}).strict();
const vehicleVariantId = z.string().uuid();

export type VehicleVariant = typeof vehicleVariants.$inferSelect;
export type CreateVehicleVariantInput = z.input<typeof createFields>;
export type UpdateVehicleVariantInput = z.input<typeof updateFields>;
export type ListVehicleVariantsParams = z.input<typeof listParams>;

function parse<T extends z.ZodType>(schema: T, value: unknown): z.output<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new NappError("Invalid vehicle variant input.", { code: "VEHICLE_VARIANT_INVALID_INPUT", status: 400 });
  }
  return result.data;
}

function storageError(error: unknown): never {
  if (error instanceof NappError) throw error;
  // Drizzle wraps driver errors; constraints remain the authority for races.
  const cause = error instanceof Error && error.cause ? error.cause : error;
  if (typeof cause === "object" && cause !== null && "code" in cause && "constraint" in cause) {
    if (cause.code === "23505" && (cause.constraint === "vehicle_variants_model_name_unique")) {
      throw new NappError("A vehicle variant with this name already exists.", { code: "VEHICLE_VARIANT_NAME_CONFLICT", status: 409 });
    }
    if ((cause.code === "23503" || cause.code === "23001")
      && (cause.constraint === "vehicles_model_variant_fk")) {
      throw new NappError("This vehicle variant is in use. Deactivate it instead.", { code: "VEHICLE_VARIANT_IN_USE", status: 409 });
    }
  }
  throw new NappError("Vehicle variant storage operation failed.", { code: "VEHICLE_VARIANT_STORAGE_ERROR", status: 500, cause: error });
}

function requireVehicleVariant(row: VehicleVariant | undefined): VehicleVariant {
  if (!row) throw new NappError("Vehicle variant not found.", { code: "VEHICLE_VARIANT_NOT_FOUND", status: 404 });
  return row;
}

export class VehicleVariantService {
  static [TOKEN] = Token.create<VehicleVariantService>("VehicleVariantService");
  static [INJECT] = defineInject(VehicleVariantService,
    [TKN_DB] as const
  );

  constructor(private readonly db: BigMotorsDb) { }

  async list(param: ListVehicleVariantsParams = {}): Promise<VehicleVariant[]> {
    const input = parse(listParams, param);
    try {
      return await this.db.select().from(vehicleVariants)
        .where(and(
          input.isActive === undefined ? undefined : eq(vehicleVariants.isActive, input.isActive),
          input.modelId === undefined ? undefined : eq(vehicleVariants.modelId, input.modelId),
        ))
        .orderBy(asc(vehicleVariants.sortOrder), asc(vehicleVariants.name), asc(vehicleVariants.id))
        .limit(input.limit).offset(input.offset);
    } catch (error) {
      storageError(error);
    }
  }

  async create(param: CreateVehicleVariantInput): Promise<VehicleVariant> {
    const input = parse(createFields, param);
    try {
      // Hold parent rows through insertion so validation and creation are atomic.
      return await this.db.transaction(async (tx) => {
        const [parent] = await tx.select().from(vehicleModels).where(eq(vehicleModels.id, input.modelId)).for("share");
        if (!parent) throw new NappError("Parent reference not found.", { code: "VEHICLE_VARIANT_PARENT_NOT_FOUND", status: 400 });
        if (!parent.isActive) throw new NappError("Parent reference is inactive.", { code: "VEHICLE_VARIANT_PARENT_INACTIVE", status: 409 });
        const [brand] = await tx.select().from(vehicleBrands).where(eq(vehicleBrands.id, parent.brandId)).for("share");
        if (!brand) throw new NappError("Ancestor reference not found.", { code: "VEHICLE_VARIANT_PARENT_NOT_FOUND", status: 400 });
        if (!brand.isActive) throw new NappError("Ancestor reference is inactive.", { code: "VEHICLE_VARIANT_PARENT_INACTIVE", status: 409 });
        const [row] = await tx.insert(vehicleVariants).values(input).returning();
        return requireVehicleVariant(row);
      });
    } catch (error) {
      storageError(error);
    }
  }

  async update(id: string, param: UpdateVehicleVariantInput): Promise<VehicleVariant> {
    const key = parse(vehicleVariantId, id);
    const input = parse(updateFields, param);
    try {
      const [row] = await this.db.update(vehicleVariants).set(input).where(eq(vehicleVariants.id, key)).returning();
      return requireVehicleVariant(row);
    } catch (error) {
      storageError(error);
    }
  }

  async delete(id: string): Promise<VehicleVariant> {
    const key = parse(vehicleVariantId, id);
    try {
      const [row] = await this.db.delete(vehicleVariants).where(eq(vehicleVariants.id, key)).returning();
      return requireVehicleVariant(row);
    } catch (error) {
      storageError(error);
    }
  }
}
