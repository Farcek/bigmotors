import { defineInject, INJECT, TOKEN, Token } from "@napp/di";
import { NappError } from "@napp/error";
import { vehicleSearchParams, type VehicleSearchParams } from "@bigmotors/core";
import { and, asc, eq, ilike } from "drizzle-orm";
import { z } from "zod";
import { TKN_DB, type BigMotorsDb } from "../db.js";
import { homeProductGroup } from "../schema/home-product-group.js";
import { files } from "../schema/files.js";
import { colors, vehicleBodyTypes, vehicleBrands, vehicleModels, vehicleVariants } from "../schema/references.js";

const fields = z.object({
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().max(512).transform((v) => v || null).nullable().optional(),
  imageId: z.string().uuid().nullable().optional(),
  filters: vehicleSearchParams,
  sortOrder: z.number().int().min(-2147483648).max(2147483647).optional(),
  isActive: z.boolean().optional(),
}).strict();
const updateFields = fields.partial().refine((v) => Object.values(v).some((value) => value !== undefined));
const listFields = z.object({ limit: z.number().int().min(1).max(100).default(20), offset: z.number().int().min(0).max(2147483647).default(0), search: z.string().trim().max(255).optional(), isActive: z.boolean().optional() }).strict();
export type CreateHomeProductGroupInput = z.input<typeof fields>;
export type UpdateHomeProductGroupInput = z.input<typeof updateFields>;
export type ListHomeProductGroupInput = z.input<typeof listFields>;
function parse<S extends z.ZodType>(schema: S, value: unknown): z.output<S> {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new NappError("Invalid home product group input.", { code: "HOME_GROUP_INVALID_INPUT", status: 400 });
  return parsed.data;
}
function required<T>(value: T | undefined): T {
  if (!value) throw new NappError("Home product group not found.", { code: "HOME_GROUP_NOT_FOUND", status: 404 });
  return value;
}
async function storage<T>(action: () => Promise<T>) {
  try { return await action(); } catch (error) {
    if (error instanceof NappError) throw error;
    const cause = error instanceof Error && error.cause ? error.cause : error;
    if (typeof cause === "object" && cause !== null && "code" in cause && cause.code === "23503") throw new NappError("Image no longer exists.", { code: "HOME_GROUP_REFERENCE_NOT_FOUND", status: 409 });
    throw new NappError("Home product group storage failed.", { code: "HOME_GROUP_STORAGE_ERROR", status: 500, cause: error });
  }
}
type Transaction = Parameters<Parameters<BigMotorsDb["transaction"]>[0]>[0];
async function checkReferences(tx: Transaction, filters: VehicleSearchParams) {
  const invalid = () => new NappError("Invalid filter reference or hierarchy.", { code: "HOME_GROUP_INVALID_REFERENCE", status: 400 });
  for (const [key, table] of [["brand", vehicleBrands], ["category", vehicleBodyTypes], ["color", colors]] as const) {
    if (filters[key] && !(await tx.select({ id: table.id }).from(table).where(eq(table.id, filters[key]!)).for("share"))[0]) throw invalid();
  }
  let modelBrand: string | undefined;
  if (filters.model) {
    const [model] = await tx.select().from(vehicleModels).where(eq(vehicleModels.id, filters.model)).for("share");
    if (!model || (filters.brand && model.brandId !== filters.brand)) throw invalid();
    modelBrand = model.brandId;
  }
  if (filters.variant) {
    const [variant] = await tx.select().from(vehicleVariants).where(eq(vehicleVariants.id, filters.variant)).for("share");
    if (!variant || (filters.model && variant.modelId !== filters.model)) throw invalid();
    if (filters.brand && !modelBrand) {
      const [model] = await tx.select().from(vehicleModels).where(eq(vehicleModels.id, variant.modelId)).for("share");
      if (!model || model.brandId !== filters.brand) throw invalid();
    }
  }
}

export class HomeProductGroupService {
  static [TOKEN] = Token.create<HomeProductGroupService>("HomeProductGroupService");
  static [INJECT] = defineInject(HomeProductGroupService, [TKN_DB] as const);
  constructor(private readonly db: BigMotorsDb) {}
  async listPublic() {
    return storage(() => this.db.select({
      id: homeProductGroup.id, title: homeProductGroup.title, filters: homeProductGroup.filters,
      imageId: files.id, imageName: files.originalName,
    }).from(homeProductGroup).leftJoin(files, eq(files.id, homeProductGroup.imageId))
      .where(eq(homeProductGroup.isActive, true)).orderBy(asc(homeProductGroup.sortOrder), asc(homeProductGroup.id)));
  }
  async list(params: ListHomeProductGroupInput = {}) {
    const input = parse(listFields, params);
    const pattern = input.search?.replace(/[\\%_]/g, "\\$&");
    return storage(() => this.db.select().from(homeProductGroup).where(and(
      pattern ? ilike(homeProductGroup.title, `%${pattern}%`) : undefined,
      input.isActive === undefined ? undefined : eq(homeProductGroup.isActive, input.isActive),
    )).orderBy(asc(homeProductGroup.sortOrder), asc(homeProductGroup.id)).limit(input.limit).offset(input.offset));
  }
  async findById(id: string) {
    const key = parse(z.string().uuid(), id);
    return storage(async () => required((await this.db.select().from(homeProductGroup).where(eq(homeProductGroup.id, key)))[0]));
  }
  async create(body: CreateHomeProductGroupInput) {
    const input = parse(fields, body);
    return storage(() => this.db.transaction(async (tx) => {
      await checkReferences(tx, input.filters);
      return required((await tx.insert(homeProductGroup).values(input).returning())[0]);
    }));
  }
  async update(id: string, body: UpdateHomeProductGroupInput) {
    const key = parse(z.string().uuid(), id); const input = parse(updateFields, body);
    return storage(() => this.db.transaction(async (tx) => {
      required((await tx.select().from(homeProductGroup).where(eq(homeProductGroup.id, key)).for("update"))[0]);
      if (input.filters) await checkReferences(tx, input.filters);
      return required((await tx.update(homeProductGroup).set(input).where(eq(homeProductGroup.id, key)).returning())[0]);
    }));
  }
  async delete(id: string) {
    const key = parse(z.string().uuid(), id);
    return storage(async () => required((await this.db.delete(homeProductGroup).where(eq(homeProductGroup.id, key)).returning())[0]));
  }
}
