import { CATALOG_LIMITS } from "@bigmotors/core";
import { NappError } from "@napp/error";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { partBrands } from "../schema/references.js";
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
const partBrandId = z.string().uuid();

export type PartBrand = typeof partBrands.$inferSelect;
export type CreatePartBrandInput = z.input<typeof fields>;
export type UpdatePartBrandInput = z.input<typeof updateFields>;
export type ListPartBrandsParams = z.input<typeof listParams>;

function parse<T extends z.ZodType>(schema: T, value: unknown): z.output<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new NappError("Invalid part brand input.", { code: "PART_BRAND_INVALID_INPUT", status: 400 });
  }
  return result.data;
}

function storageError(error: unknown): never {
  if (error instanceof NappError) throw error;
  // Drizzle wraps driver errors; constraints remain the authority for races.
  const cause = error instanceof Error && error.cause ? error.cause : error;
  if (typeof cause === "object" && cause !== null && "code" in cause && "constraint" in cause) {
    if (cause.code === "23505" && cause.constraint === "part_brands_name_unique") {
      throw new NappError("A part brand with this name already exists.", { code: "PART_BRAND_NAME_CONFLICT", status: 409 });
    }
    if ((cause.code === "23503" || cause.code === "23001")
      && (cause.constraint === "parts_brand_id_part_brands_id_fk")) {
      throw new NappError("This part brand is in use. Deactivate it instead.", { code: "PART_BRAND_IN_USE", status: 409 });
    }
  }
  throw new NappError("Part brand storage operation failed.", { code: "PART_BRAND_STORAGE_ERROR", status: 500, cause: error });
}

function requirePartBrand(row: PartBrand | undefined): PartBrand {
  if (!row) throw new NappError("Part brand not found.", { code: "PART_BRAND_NOT_FOUND", status: 404 });
  return row;
}

export class PartBrandService {
  static [TOKEN] = Token.create<PartBrandService>("PartBrandService");
  static [INJECT] = defineInject(PartBrandService,
    [TKN_DB] as const
  );

  constructor(private readonly db: BigMotorsDb) { }

  async list(param: ListPartBrandsParams = {}): Promise<PartBrand[]> {
    const input = parse(listParams, param);
    try {
      return await this.db.select().from(partBrands)
        .where(input.isActive === undefined ? undefined : eq(partBrands.isActive, input.isActive))
        .orderBy(asc(partBrands.sortOrder), asc(partBrands.name), asc(partBrands.id))
        .limit(input.limit).offset(input.offset);
    } catch (error) {
      storageError(error);
    }
  }

  async create(param: CreatePartBrandInput): Promise<PartBrand> {
    const input = parse(fields, param);
    try {
      const [row] = await this.db.insert(partBrands).values(input).returning();
      return requirePartBrand(row);
    } catch (error) {
      storageError(error);
    }
  }

  async update(id: string, param: UpdatePartBrandInput): Promise<PartBrand> {
    const key = parse(partBrandId, id);
    const input = parse(updateFields, param);
    try {
      const [row] = await this.db.update(partBrands).set(input).where(eq(partBrands.id, key)).returning();
      return requirePartBrand(row);
    } catch (error) {
      storageError(error);
    }
  }

  async delete(id: string): Promise<PartBrand> {
    const key = parse(partBrandId, id);
    try {
      const [row] = await this.db.delete(partBrands).where(eq(partBrands.id, key)).returning();
      return requirePartBrand(row);
    } catch (error) {
      storageError(error);
    }
  }
}
