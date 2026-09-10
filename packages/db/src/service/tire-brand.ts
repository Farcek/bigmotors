import { CATALOG_LIMITS } from "@bigmotors/core";
import { NappError } from "@napp/error";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { tireBrands } from "../schema/references.js";
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
const tireBrandId = z.string().uuid();

export type TireBrand = typeof tireBrands.$inferSelect;
export type CreateTireBrandInput = z.input<typeof fields>;
export type UpdateTireBrandInput = z.input<typeof updateFields>;
export type ListTireBrandsParams = z.input<typeof listParams>;

function parse<T extends z.ZodType>(schema: T, value: unknown): z.output<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new NappError("Invalid tire brand input.", { code: "TIRE_BRAND_INVALID_INPUT", status: 400 });
  }
  return result.data;
}

function storageError(error: unknown): never {
  if (error instanceof NappError) throw error;
  // Drizzle wraps driver errors; constraints remain the authority for races.
  const cause = error instanceof Error && error.cause ? error.cause : error;
  if (typeof cause === "object" && cause !== null && "code" in cause && "constraint" in cause) {
    if (cause.code === "23505" && cause.constraint === "tire_brands_name_unique") {
      throw new NappError("A tire brand with this name already exists.", { code: "TIRE_BRAND_NAME_CONFLICT", status: 409 });
    }
    if ((cause.code === "23503" || cause.code === "23001")
      && (cause.constraint === "tire_models_brand_id_tire_brands_id_fk"
        || cause.constraint === "tires_brand_id_tire_brands_id_fk")) {
      throw new NappError("This tire brand is in use. Deactivate it instead.", { code: "TIRE_BRAND_IN_USE", status: 409 });
    }
  }
  throw new NappError("Tire brand storage operation failed.", { code: "TIRE_BRAND_STORAGE_ERROR", status: 500, cause: error });
}

function requireTireBrand(row: TireBrand | undefined): TireBrand {
  if (!row) throw new NappError("Tire brand not found.", { code: "TIRE_BRAND_NOT_FOUND", status: 404 });
  return row;
}

export class TireBrandService {
  static [TOKEN] = Token.create<TireBrandService>("TireBrandService");
  static [INJECT] = defineInject(TireBrandService,
    [TKN_DB] as const
  );

  constructor(private readonly db: BigMotorsDb) { }

  async list(param: ListTireBrandsParams = {}): Promise<TireBrand[]> {
    const input = parse(listParams, param);
    try {
      return await this.db.select().from(tireBrands)
        .where(input.isActive === undefined ? undefined : eq(tireBrands.isActive, input.isActive))
        .orderBy(asc(tireBrands.sortOrder), asc(tireBrands.name), asc(tireBrands.id))
        .limit(input.limit).offset(input.offset);
    } catch (error) {
      storageError(error);
    }
  }

  async create(param: CreateTireBrandInput): Promise<TireBrand> {
    const input = parse(fields, param);
    try {
      const [row] = await this.db.insert(tireBrands).values(input).returning();
      return requireTireBrand(row);
    } catch (error) {
      storageError(error);
    }
  }

  async update(id: string, param: UpdateTireBrandInput): Promise<TireBrand> {
    const key = parse(tireBrandId, id);
    const input = parse(updateFields, param);
    try {
      const [row] = await this.db.update(tireBrands).set(input).where(eq(tireBrands.id, key)).returning();
      return requireTireBrand(row);
    } catch (error) {
      storageError(error);
    }
  }

  async delete(id: string): Promise<TireBrand> {
    const key = parse(tireBrandId, id);
    try {
      const [row] = await this.db.delete(tireBrands).where(eq(tireBrands.id, key)).returning();
      return requireTireBrand(row);
    } catch (error) {
      storageError(error);
    }
  }
}
