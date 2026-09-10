import { CATALOG_LIMITS } from "@bigmotors/core";
import { NappError } from "@napp/error";
import { asc, eq } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { z } from "zod";
import { branches } from "../schema/branches.js";
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
const branchId = z.string().uuid();

export type Branch = typeof branches.$inferSelect;
export type CreateBranchInput = z.input<typeof fields>;
export type UpdateBranchInput = z.input<typeof updateFields>;
export type ListBranchesParams = z.input<typeof listParams>;

function parse<T extends z.ZodType>(schema: T, value: unknown): z.output<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new NappError("Invalid branch input.", { code: "BRANCH_INVALID_INPUT", status: 400 });
  }
  return result.data;
}

function storageError(error: unknown): never {
  if (error instanceof NappError) throw error;
  // Drizzle wraps driver errors; constraints remain the authority for races.
  const cause = error instanceof Error && error.cause ? error.cause : error;
  if (typeof cause === "object" && cause !== null && "code" in cause && "constraint" in cause) {
    if (cause.code === "23505" && cause.constraint === "branches_name_unique") {
      throw new NappError("A branch with this name already exists.", { code: "BRANCH_NAME_CONFLICT", status: 409 });
    }
    if ((cause.code === "23503" || cause.code === "23001")
      && (cause.constraint === "vehicles_branch_id_branches_id_fk"
        || cause.constraint === "parts_branch_id_branches_id_fk"
        || cause.constraint === "tires_branch_id_branches_id_fk")) {
      throw new NappError("This branch is in use. Deactivate it instead.", { code: "BRANCH_IN_USE", status: 409 });
    }
  }
  throw new NappError("Branch storage operation failed.", { code: "BRANCH_STORAGE_ERROR", status: 500, cause: error });
}

function requireBranch(row: Branch | undefined): Branch {
  if (!row) throw new NappError("Branch not found.", { code: "BRANCH_NOT_FOUND", status: 404 });
  return row;
}

export class BranchService {
  static [TOKEN] = Token.create<BranchService>("BranchService");
  static [INJECT] = defineInject(BranchService,
    [TKN_DB] as const
  );

  constructor(private readonly db: BigMotorsDb) { }

  async list(param: ListBranchesParams = {}): Promise<Branch[]> {
    const input = parse(listParams, param);
    try {
      return await this.db.select().from(branches)
        .where(input.isActive === undefined ? undefined : eq(branches.isActive, input.isActive))
        .orderBy(asc(branches.sortOrder), asc(branches.name), asc(branches.id))
        .limit(input.limit).offset(input.offset);
    } catch (error) {
      storageError(error);
    }
  }

  async create(param: CreateBranchInput): Promise<Branch> {
    const input = parse(fields, param);
    try {
      const [row] = await this.db.insert(branches).values(input).returning();
      return requireBranch(row);
    } catch (error) {
      storageError(error);
    }
  }

  async update(id: string, param: UpdateBranchInput): Promise<Branch> {
    const key = parse(branchId, id);
    const input = parse(updateFields, param);
    try {
      const [row] = await this.db.update(branches).set(input).where(eq(branches.id, key)).returning();
      return requireBranch(row);
    } catch (error) {
      storageError(error);
    }
  }

  async delete(id: string): Promise<Branch> {
    const key = parse(branchId, id);
    try {
      const [row] = await this.db.delete(branches).where(eq(branches.id, key)).returning();
      return requireBranch(row);
    } catch (error) {
      storageError(error);
    }
  }
}
