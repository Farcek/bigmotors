import { PAGE_SLUG_PATTERN, PAGE_STATUSES } from "@bigmotors/core";
import { defineInject, INJECT, TOKEN, Token } from "@napp/di";
import { NappError } from "@napp/error";
import { and, desc, eq, getTableColumns, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { TKN_DB, type BigMotorsDb } from "../db.js";
import { pages } from "../schema/page.js";

const fields = z.object({
  title: z.string().trim().min(1).max(255),
  slug: z.string().trim().min(1).max(255).regex(PAGE_SLUG_PATTERN),
  description: z.string().trim().max(512).transform(v => v || null).nullable().optional(),
  mainImageId: z.string().uuid().nullable().optional(),
  meta: z.record(z.string(), z.json()).optional(),
  content: z.record(z.string(), z.json()).optional(),
  status: z.enum(PAGE_STATUSES).optional(),
}).strict();
const updateFields = fields.partial().refine(v => Object.values(v).some(value => value !== undefined));
const listFields = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).max(2147483647).default(0),
  search: z.string().trim().max(255).optional(), status: z.enum(PAGE_STATUSES).optional(),
}).strict();
export type CreatePageInput = z.input<typeof fields>;
export type UpdatePageInput = z.input<typeof updateFields>;
export type ListPageInput = z.input<typeof listFields>;

function parse<S extends z.ZodType>(schema: S, value: unknown): z.output<S> {
  const result = schema.safeParse(value);
  if (!result.success) throw new NappError("Invalid page input.", { code: "PAGE_INVALID_INPUT", status: 400 });
  return result.data;
}
function required<T>(row: T | undefined): T {
  if (!row) throw new NappError("Page not found.", { code: "PAGE_NOT_FOUND", status: 404 });
  return row;
}
async function storage<T>(action: () => Promise<T>): Promise<T> {
  try { return await action(); } catch (error) {
    if (error instanceof NappError) throw error;
    const cause = error instanceof Error && error.cause ? error.cause : error;
    if (typeof cause === "object" && cause !== null && "code" in cause) {
      if (cause.code === "23505") throw new NappError("Page slug already exists.", { code: "PAGE_SLUG_CONFLICT", status: 409 });
      if (cause.code === "23503") throw new NappError("Image no longer exists.", { code: "PAGE_IMAGE_NOT_FOUND", status: 409 });
      if (cause.code === "23514") throw new NappError("Page content or fields are invalid.", { code: "PAGE_INVALID_INPUT", status: 400 });
    }
    throw new NappError("Page storage operation failed.", { code: "PAGE_STORAGE_ERROR", status: 500, cause: error });
  }
}

export class PageService {
  static [TOKEN] = Token.create<PageService>("PageService");
  static [INJECT] = defineInject(PageService, [TKN_DB] as const);
  constructor(private readonly db: BigMotorsDb) {}

  async list(params: ListPageInput = {}) {
    const input = parse(listFields, params);
    const pattern = input.search?.replace(/[\\%_]/g, "\\$&");
    const { meta, content, ...summary } = getTableColumns(pages);
    return storage(() => this.db.select(summary).from(pages).where(and(
      pattern ? or(ilike(pages.title, `%${pattern}%`), ilike(pages.slug, `%${pattern}%`)) : undefined,
      input.status ? eq(pages.status, input.status) : undefined,
    )).orderBy(desc(pages.updatedAt), desc(pages.id)).limit(input.limit).offset(input.offset));
  }
  async findById(id: string) {
    const key = parse(z.string().uuid(), id);
    return storage(async () => required((await this.db.select().from(pages).where(eq(pages.id, key)))[0]));
  }
  async findPublishedBySlug(slug: string) {
    const key = parse(fields.shape.slug, slug);
    return storage(async () => required((await this.db.select().from(pages)
      .where(and(eq(pages.slug, key), eq(pages.status, "published"))))[0]));
  }
  async create(body: CreatePageInput) {
    const input = parse(fields, body);
    return storage(async () => required((await this.db.insert(pages).values(input).returning())[0]));
  }
  async update(id: string, body: UpdatePageInput) {
    const key = parse(z.string().uuid(), id); const input = parse(updateFields, body);
    return storage(async () => required((await this.db.update(pages).set(input).where(eq(pages.id, key)).returning())[0]));
  }
  async delete(id: string) {
    const key = parse(z.string().uuid(), id);
    return storage(async () => required((await this.db.delete(pages).where(eq(pages.id, key)).returning())[0]));
  }
}
