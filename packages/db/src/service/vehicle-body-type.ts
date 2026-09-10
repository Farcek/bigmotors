import { CATALOG_LIMITS } from "@bigmotors/core";
import { NappError } from "@napp/error";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { vehicleBodyTypes } from "../schema/references.js";
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
const vehicleBodyTypeId = z.string().uuid();

export type VehicleBodyType = typeof vehicleBodyTypes.$inferSelect;
export type CreateVehicleBodyTypeInput = z.input<typeof fields>;
export type UpdateVehicleBodyTypeInput = z.input<typeof updateFields>;
export type ListVehicleBodyTypesParams = z.input<typeof listParams>;

function parse<T extends z.ZodType>(schema: T, value: unknown): z.output<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new NappError("Invalid vehicle body type input.", { code: "VEHICLE_BODY_TYPE_INVALID_INPUT", status: 400 });
  }
  return result.data;
}

function storageError(error: unknown): never {
  if (error instanceof NappError) throw error;
  // Drizzle wraps driver errors; constraints remain the authority for races.
  const cause = error instanceof Error && error.cause ? error.cause : error;
  if (typeof cause === "object" && cause !== null && "code" in cause && "constraint" in cause) {
    if (cause.code === "23505" && cause.constraint === "vehicle_body_types_name_unique") {
      throw new NappError("A vehicle body type with this name already exists.", { code: "VEHICLE_BODY_TYPE_NAME_CONFLICT", status: 409 });
    }
    if ((cause.code === "23503" || cause.code === "23001")
      && (cause.constraint === "vehicles_body_type_id_vehicle_body_types_id_fk")) {
      throw new NappError("This vehicle body type is in use. Deactivate it instead.", { code: "VEHICLE_BODY_TYPE_IN_USE", status: 409 });
    }
  }
  throw new NappError("Vehicle body type storage operation failed.", { code: "VEHICLE_BODY_TYPE_STORAGE_ERROR", status: 500, cause: error });
}

function requireVehicleBodyType(row: VehicleBodyType | undefined): VehicleBodyType {
  if (!row) throw new NappError("Vehicle body type not found.", { code: "VEHICLE_BODY_TYPE_NOT_FOUND", status: 404 });
  return row;
}

export class VehicleBodyTypeService {
  static [TOKEN] = Token.create<VehicleBodyTypeService>("VehicleBodyTypeService");
  static [INJECT] = defineInject(VehicleBodyTypeService,
    [TKN_DB] as const
  );

  constructor(private readonly db: BigMotorsDb) { }

  async list(param: ListVehicleBodyTypesParams = {}): Promise<VehicleBodyType[]> {
    const input = parse(listParams, param);
    try {
      return await this.db.select().from(vehicleBodyTypes)
        .where(input.isActive === undefined ? undefined : eq(vehicleBodyTypes.isActive, input.isActive))
        .orderBy(asc(vehicleBodyTypes.sortOrder), asc(vehicleBodyTypes.name), asc(vehicleBodyTypes.id))
        .limit(input.limit).offset(input.offset);
    } catch (error) {
      storageError(error);
    }
  }

  async create(param: CreateVehicleBodyTypeInput): Promise<VehicleBodyType> {
    const input = parse(fields, param);
    try {
      const [row] = await this.db.insert(vehicleBodyTypes).values(input).returning();
      return requireVehicleBodyType(row);
    } catch (error) {
      storageError(error);
    }
  }

  async update(id: string, param: UpdateVehicleBodyTypeInput): Promise<VehicleBodyType> {
    const key = parse(vehicleBodyTypeId, id);
    const input = parse(updateFields, param);
    try {
      const [row] = await this.db.update(vehicleBodyTypes).set(input).where(eq(vehicleBodyTypes.id, key)).returning();
      return requireVehicleBodyType(row);
    } catch (error) {
      storageError(error);
    }
  }

  async delete(id: string): Promise<VehicleBodyType> {
    const key = parse(vehicleBodyTypeId, id);
    try {
      const [row] = await this.db.delete(vehicleBodyTypes).where(eq(vehicleBodyTypes.id, key)).returning();
      return requireVehicleBodyType(row);
    } catch (error) {
      storageError(error);
    }
  }
}
