import { CATALOG_LIMITS } from "@bigmotors/core";
import { NappError } from "@napp/error";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { locations } from "../schema/locations.js";
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
const locationId = z.string().uuid();

export type Location = typeof locations.$inferSelect;
export type CreateLocationInput = z.input<typeof fields>;
export type UpdateLocationInput = z.input<typeof updateFields>;
export type ListLocationsParams = z.input<typeof listParams>;

function parse<T extends z.ZodType>(schema: T, value: unknown): z.output<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new NappError("Invalid location input.", { code: "LOCATION_INVALID_INPUT", status: 400 });
  }
  return result.data;
}

function storageError(error: unknown): never {
  if (error instanceof NappError) throw error;
  // Drizzle wraps driver errors; constraints remain the authority for races.
  const cause = error instanceof Error && error.cause ? error.cause : error;
  if (typeof cause === "object" && cause !== null && "code" in cause && "constraint" in cause) {
    if (cause.code === "23505" && cause.constraint === "locations_name_unique") {
      throw new NappError("A location with this name already exists.", { code: "LOCATION_NAME_CONFLICT", status: 409 });
    }
    if ((cause.code === "23503" || cause.code === "23001")
      && (cause.constraint === "vehicles_location_id_locations_id_fk"
        || cause.constraint === "parts_location_id_locations_id_fk"
        || cause.constraint === "tires_location_id_locations_id_fk")) {
      throw new NappError("This location is in use. Deactivate it instead.", { code: "LOCATION_IN_USE", status: 409 });
    }
  }
  throw new NappError("Location storage operation failed.", { code: "LOCATION_STORAGE_ERROR", status: 500, cause: error });
}

function requireLocation(row: Location | undefined): Location {
  if (!row) throw new NappError("Location not found.", { code: "LOCATION_NOT_FOUND", status: 404 });
  return row;
}

export class LocationService {
  static [TOKEN] = Token.create<LocationService>("LocationService");
  static [INJECT] = defineInject(LocationService,
    [TKN_DB] as const
  );

  constructor(private readonly db: BigMotorsDb) { }

  async list(param: ListLocationsParams = {}): Promise<Location[]> {
    const input = parse(listParams, param);
    try {
      return await this.db.select().from(locations)
        .where(input.isActive === undefined ? undefined : eq(locations.isActive, input.isActive))
        .orderBy(asc(locations.sortOrder), asc(locations.name), asc(locations.id))
        .limit(input.limit).offset(input.offset);
    } catch (error) {
      storageError(error);
    }
  }

  async create(param: CreateLocationInput): Promise<Location> {
    const input = parse(fields, param);
    try {
      const [row] = await this.db.insert(locations).values(input).returning();
      return requireLocation(row);
    } catch (error) {
      storageError(error);
    }
  }

  async update(id: string, param: UpdateLocationInput): Promise<Location> {
    const key = parse(locationId, id);
    const input = parse(updateFields, param);
    try {
      const [row] = await this.db.update(locations).set(input).where(eq(locations.id, key)).returning();
      return requireLocation(row);
    } catch (error) {
      storageError(error);
    }
  }

  async delete(id: string): Promise<Location> {
    const key = parse(locationId, id);
    try {
      const [row] = await this.db.delete(locations).where(eq(locations.id, key)).returning();
      return requireLocation(row);
    } catch (error) {
      storageError(error);
    }
  }
}
