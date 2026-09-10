import { CATALOG_LIMITS } from "@bigmotors/core";
import { NappError } from "@napp/error";
import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { partCategories } from "../schema/references.js";
import { TKN_DB, type BigMotorsDb } from "../db.js";
import { defineInject, INJECT, Token, TOKEN } from "@napp/di";

const fields = z.object({
  name: z.string().trim().min(1).max(CATALOG_LIMITS.title),
  description: z.string().trim().max(CATALOG_LIMITS.description)
    .transform((value) => value === "" ? null : value).nullable().optional(),
  sortOrder: z.number().int().min(-2_147_483_648).max(2_147_483_647).optional(),
  isActive: z.boolean().optional(),
}).strict();

const createFields = fields.extend({ parentId: z.string().uuid().nullable().default(null) });

const updateFields = fields.partial().refine(
  (value) => Object.values(value).some((field) => field !== undefined),
  "At least one field is required.",
);
const listParams = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).max(2_147_483_647).default(0),
  isActive: z.boolean().optional(),
  parentId: z.string().uuid().optional(),
  rootOnly: z.boolean().optional(),
}).strict().refine((value) => !(value.rootOnly === true && value.parentId !== undefined), "rootOnly and parentId cannot be combined.");
const partCategoryId = z.string().uuid();

export type PartCategory = typeof partCategories.$inferSelect;
export type CreatePartCategoryInput = z.input<typeof createFields>;
export type UpdatePartCategoryInput = z.input<typeof updateFields>;
export type ListPartCategoriesParams = z.input<typeof listParams>;

function parse<T extends z.ZodType>(schema: T, value: unknown): z.output<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new NappError("Invalid part category input.", { code: "PART_CATEGORY_INVALID_INPUT", status: 400 });
  }
  return result.data;
}

function storageError(error: unknown): never {
  if (error instanceof NappError) throw error;
  // Drizzle wraps driver errors; constraints remain the authority for races.
  const cause = error instanceof Error && error.cause ? error.cause : error;
  if (typeof cause === "object" && cause !== null && "code" in cause && "constraint" in cause) {
    if (cause.code === "23505" && (cause.constraint === "part_categories_root_name_unique" || cause.constraint === "part_categories_parent_name_unique")) {
      throw new NappError("A part category with this name already exists.", { code: "PART_CATEGORY_NAME_CONFLICT", status: 409 });
    }
    if ((cause.code === "23503" || cause.code === "23001")
      && (cause.constraint === "parts_category_id_part_categories_id_fk"
        || cause.constraint === "part_categories_parent_id_part_categories_id_fk")) {
      throw new NappError("This part category is in use. Deactivate it instead.", { code: "PART_CATEGORY_IN_USE", status: 409 });
    }
  }
  throw new NappError("Part category storage operation failed.", { code: "PART_CATEGORY_STORAGE_ERROR", status: 500, cause: error });
}

function requirePartCategory(row: PartCategory | undefined): PartCategory {
  if (!row) throw new NappError("Part category not found.", { code: "PART_CATEGORY_NOT_FOUND", status: 404 });
  return row;
}

export class PartCategoryService {
  static [TOKEN] = Token.create<PartCategoryService>("PartCategoryService");
  static [INJECT] = defineInject(PartCategoryService,
    [TKN_DB] as const
  );

  constructor(private readonly db: BigMotorsDb) { }

  async list(param: ListPartCategoriesParams = {}): Promise<PartCategory[]> {
    const input = parse(listParams, param);
    try {
      return await this.db.select().from(partCategories)
        .where(and(
          input.isActive === undefined ? undefined : eq(partCategories.isActive, input.isActive),
          input.parentId === undefined ? undefined : eq(partCategories.parentId, input.parentId),
          input.rootOnly === true ? isNull(partCategories.parentId) : undefined,
        ))
        .orderBy(asc(partCategories.sortOrder), asc(partCategories.name), asc(partCategories.id))
        .limit(input.limit).offset(input.offset);
    } catch (error) {
      storageError(error);
    }
  }

  async create(param: CreatePartCategoryInput): Promise<PartCategory> {
    const input = parse(createFields, param);
    try {
      // Hold parent rows through insertion so validation and creation are atomic.
      return await this.db.transaction(async (tx) => {
        let parentId = input.parentId;
        const visited = new Set<string>();
        while (parentId !== null) {
          if (visited.has(parentId)) throw new NappError("Invalid category ancestry.", { code: "PART_CATEGORY_INVALID_INPUT", status: 400 });
          visited.add(parentId);
          const [parent] = await tx.select().from(partCategories).where(eq(partCategories.id, parentId)).for("share");
          if (!parent) throw new NappError("Parent category not found.", { code: "PART_CATEGORY_PARENT_NOT_FOUND", status: 400 });
          if (!parent.isActive) throw new NappError("Parent category or ancestor is inactive.", { code: "PART_CATEGORY_PARENT_INACTIVE", status: 409 });
          parentId = parent.parentId;
        }
        const [row] = await tx.insert(partCategories).values(input).returning();
        return requirePartCategory(row);
      });
    } catch (error) {
      storageError(error);
    }
  }

  async update(id: string, param: UpdatePartCategoryInput): Promise<PartCategory> {
    const key = parse(partCategoryId, id);
    const input = parse(updateFields, param);
    try {
      const [row] = await this.db.update(partCategories).set(input).where(eq(partCategories.id, key)).returning();
      return requirePartCategory(row);
    } catch (error) {
      storageError(error);
    }
  }

  async delete(id: string): Promise<PartCategory> {
    const key = parse(partCategoryId, id);
    try {
      const [row] = await this.db.delete(partCategories).where(eq(partCategories.id, key)).returning();
      return requirePartCategory(row);
    } catch (error) {
      storageError(error);
    }
  }
}
