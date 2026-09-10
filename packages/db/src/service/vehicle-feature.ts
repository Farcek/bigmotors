import { CATALOG_LIMITS } from "@bigmotors/core";
import { NappError } from "@napp/error";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { vehicleFeatures } from "../schema/references.js";
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
const vehicleFeatureId = z.string().uuid();

export type VehicleFeature = typeof vehicleFeatures.$inferSelect;
export type CreateVehicleFeatureInput = z.input<typeof fields>;
export type UpdateVehicleFeatureInput = z.input<typeof updateFields>;
export type ListVehicleFeaturesParams = z.input<typeof listParams>;

function parse<T extends z.ZodType>(schema: T, value: unknown): z.output<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new NappError("Invalid vehicle feature input.", { code: "VEHICLE_FEATURE_INVALID_INPUT", status: 400 });
  }
  return result.data;
}

function storageError(error: unknown): never {
  if (error instanceof NappError) throw error;
  // Drizzle wraps driver errors; constraints remain the authority for races.
  const cause = error instanceof Error && error.cause ? error.cause : error;
  if (typeof cause === "object" && cause !== null && "code" in cause && "constraint" in cause) {
    if (cause.code === "23505" && cause.constraint === "vehicle_features_name_unique") {
      throw new NappError("A vehicle feature with this name already exists.", { code: "VEHICLE_FEATURE_NAME_CONFLICT", status: 409 });
    }
    if ((cause.code === "23503" || cause.code === "23001")
      && (cause.constraint === "vehicle_feature_links_feature_id_vehicle_features_id_fk")) {
      throw new NappError("This vehicle feature is in use. Deactivate it instead.", { code: "VEHICLE_FEATURE_IN_USE", status: 409 });
    }
  }
  throw new NappError("Vehicle feature storage operation failed.", { code: "VEHICLE_FEATURE_STORAGE_ERROR", status: 500, cause: error });
}

function requireVehicleFeature(row: VehicleFeature | undefined): VehicleFeature {
  if (!row) throw new NappError("Vehicle feature not found.", { code: "VEHICLE_FEATURE_NOT_FOUND", status: 404 });
  return row;
}

export class VehicleFeatureService {
  static [TOKEN] = Token.create<VehicleFeatureService>("VehicleFeatureService");
  static [INJECT] = defineInject(VehicleFeatureService,
    [TKN_DB] as const
  );

  constructor(private readonly db: BigMotorsDb) { }

  async list(param: ListVehicleFeaturesParams = {}): Promise<VehicleFeature[]> {
    const input = parse(listParams, param);
    try {
      return await this.db.select().from(vehicleFeatures)
        .where(input.isActive === undefined ? undefined : eq(vehicleFeatures.isActive, input.isActive))
        .orderBy(asc(vehicleFeatures.sortOrder), asc(vehicleFeatures.name), asc(vehicleFeatures.id))
        .limit(input.limit).offset(input.offset);
    } catch (error) {
      storageError(error);
    }
  }

  async create(param: CreateVehicleFeatureInput): Promise<VehicleFeature> {
    const input = parse(fields, param);
    try {
      const [row] = await this.db.insert(vehicleFeatures).values(input).returning();
      return requireVehicleFeature(row);
    } catch (error) {
      storageError(error);
    }
  }

  async update(id: string, param: UpdateVehicleFeatureInput): Promise<VehicleFeature> {
    const key = parse(vehicleFeatureId, id);
    const input = parse(updateFields, param);
    try {
      const [row] = await this.db.update(vehicleFeatures).set(input).where(eq(vehicleFeatures.id, key)).returning();
      return requireVehicleFeature(row);
    } catch (error) {
      storageError(error);
    }
  }

  async delete(id: string): Promise<VehicleFeature> {
    const key = parse(vehicleFeatureId, id);
    try {
      const [row] = await this.db.delete(vehicleFeatures).where(eq(vehicleFeatures.id, key)).returning();
      return requireVehicleFeature(row);
    } catch (error) {
      storageError(error);
    }
  }
}
