import { CATALOG_LIMITS } from "@bigmotors/core";
import { NappError } from "@napp/error";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { tireModels, tireBrands } from "../schema/references.js";
import { TKN_DB, type BigMotorsDb } from "../db.js";
import { defineInject, INJECT, Token, TOKEN } from "@napp/di";

const fields = z.object({
  name: z.string().trim().min(1).max(CATALOG_LIMITS.title),
  description: z.string().trim().max(CATALOG_LIMITS.description)
    .transform((value) => value === "" ? null : value).nullable().optional(),
  sortOrder: z.number().int().min(-2_147_483_648).max(2_147_483_647).optional(),
  isActive: z.boolean().optional(),
}).strict();

const createFields = fields.extend({ brandId: z.string().uuid() });

const updateFields = fields.partial().refine(
  (value) => Object.values(value).some((field) => field !== undefined),
  "At least one field is required.",
);
const listParams = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).max(2_147_483_647).default(0),
  isActive: z.boolean().optional(),
  brandId: z.string().uuid().optional(),
}).strict();
const tireModelId = z.string().uuid();

export type TireModel = typeof tireModels.$inferSelect;
export type CreateTireModelInput = z.input<typeof createFields>;
export type UpdateTireModelInput = z.input<typeof updateFields>;
export type ListTireModelsParams = z.input<typeof listParams>;

function parse<T extends z.ZodType>(schema: T, value: unknown): z.output<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new NappError("Invalid tire model input.", { code: "TIRE_MODEL_INVALID_INPUT", status: 400 });
  }
  return result.data;
}

function storageError(error: unknown): never {
  if (error instanceof NappError) throw error;
  // Drizzle wraps driver errors; constraints remain the authority for races.
  const cause = error instanceof Error && error.cause ? error.cause : error;
  if (typeof cause === "object" && cause !== null && "code" in cause && "constraint" in cause) {
    if (cause.code === "23505" && (cause.constraint === "tire_models_brand_name_unique")) {
      throw new NappError("A tire model with this name already exists.", { code: "TIRE_MODEL_NAME_CONFLICT", status: 409 });
    }
    if ((cause.code === "23503" || cause.code === "23001")
      && (cause.constraint === "tires_brand_model_fk")) {
      throw new NappError("This tire model is in use. Deactivate it instead.", { code: "TIRE_MODEL_IN_USE", status: 409 });
    }
  }
  throw new NappError("Tire model storage operation failed.", { code: "TIRE_MODEL_STORAGE_ERROR", status: 500, cause: error });
}

function requireTireModel(row: TireModel | undefined): TireModel {
  if (!row) throw new NappError("Tire model not found.", { code: "TIRE_MODEL_NOT_FOUND", status: 404 });
  return row;
}

export class TireModelService {
  static [TOKEN] = Token.create<TireModelService>("TireModelService");
  static [INJECT] = defineInject(TireModelService,
    [TKN_DB] as const
  );

  constructor(private readonly db: BigMotorsDb) { }

  async list(param: ListTireModelsParams = {}): Promise<TireModel[]> {
    const input = parse(listParams, param);
    try {
      return await this.db.select().from(tireModels)
        .where(and(
          input.isActive === undefined ? undefined : eq(tireModels.isActive, input.isActive),
          input.brandId === undefined ? undefined : eq(tireModels.brandId, input.brandId),
        ))
        .orderBy(asc(tireModels.sortOrder), asc(tireModels.name), asc(tireModels.id))
        .limit(input.limit).offset(input.offset);
    } catch (error) {
      storageError(error);
    }
  }

  async create(param: CreateTireModelInput): Promise<TireModel> {
    const input = parse(createFields, param);
    try {
      // Hold parent rows through insertion so validation and creation are atomic.
      return await this.db.transaction(async (tx) => {
        const [parent] = await tx.select().from(tireBrands).where(eq(tireBrands.id, input.brandId)).for("share");
        if (!parent) throw new NappError("Parent reference not found.", { code: "TIRE_MODEL_PARENT_NOT_FOUND", status: 400 });
        if (!parent.isActive) throw new NappError("Parent reference is inactive.", { code: "TIRE_MODEL_PARENT_INACTIVE", status: 409 });
        const [row] = await tx.insert(tireModels).values(input).returning();
        return requireTireModel(row);
      });
    } catch (error) {
      storageError(error);
    }
  }

  async update(id: string, param: UpdateTireModelInput): Promise<TireModel> {
    const key = parse(tireModelId, id);
    const input = parse(updateFields, param);
    try {
      const [row] = await this.db.update(tireModels).set(input).where(eq(tireModels.id, key)).returning();
      return requireTireModel(row);
    } catch (error) {
      storageError(error);
    }
  }

  async delete(id: string): Promise<TireModel> {
    const key = parse(tireModelId, id);
    try {
      const [row] = await this.db.delete(tireModels).where(eq(tireModels.id, key)).returning();
      return requireTireModel(row);
    } catch (error) {
      storageError(error);
    }
  }
}
