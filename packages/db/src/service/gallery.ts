import { defineInject, INJECT, TOKEN, Token } from "@napp/di";
import { NappError } from "@napp/error";
import { and, asc, eq, ilike } from "drizzle-orm";
import { z } from "zod";
import { TKN_DB, type BigMotorsDb } from "../db.js";
import { gallery, galleryItem } from "../schema/gallery.js";
import { files } from "../schema/files.js";

const optionalText = (length: number) => z.string().trim().max(length).transform((v) => v || null).nullable().optional();
const fields = z.object({ name: z.string().trim().min(1).max(255), desc: optionalText(512) }).strict();
const itemFields = z.object({
  title: optionalText(255), label: optionalText(255), desc: optionalText(512),
  imageId: z.string().uuid(), sortOrder: z.number().int().min(-2147483648).max(2147483647).optional(),
}).strict();
const hasFields = (v: object) => Object.values(v).some((field) => field !== undefined);
const updateFields = fields.partial().refine(hasFields);
const updateItemFields = itemFields.omit({ imageId: true }).partial().refine(hasFields);
const listFields = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).max(2147483647).default(0),
  search: z.string().trim().max(255).optional(),
}).strict();
const idField = z.string().uuid();
export type CreateGalleryInput = z.input<typeof fields>;
export type UpdateGalleryInput = z.input<typeof updateFields>;
export type CreateGalleryItemInput = z.input<typeof itemFields>;
export type UpdateGalleryItemInput = z.input<typeof updateItemFields>;
export type ListGalleryInput = z.input<typeof listFields>;

function parse<S extends z.ZodType>(schema: S, value: unknown): z.output<S> {
  const result = schema.safeParse(value);
  if (!result.success) throw new NappError("Invalid gallery input.", { code: "GALLERY_INVALID_INPUT", status: 400 });
  return result.data;
}
function required<T>(row: T | undefined): T {
  if (!row) throw new NappError("Gallery or item not found.", { code: "GALLERY_NOT_FOUND", status: 404 });
  return row;
}
async function storage<T>(action: () => Promise<T>): Promise<T> {
  try { return await action(); } catch (error) {
    if (error instanceof NappError) throw error;
    const cause = error instanceof Error && error.cause ? error.cause : error;
    if (typeof cause === "object" && cause !== null && "code" in cause && cause.code === "23503") {
      throw new NappError("Gallery or image no longer exists.", { code: "GALLERY_REFERENCE_NOT_FOUND", status: 409 });
    }
    throw new NappError("Gallery storage operation failed.", { code: "GALLERY_STORAGE_ERROR", status: 500, cause: error });
  }
}

export class GalleryService {
  static [TOKEN] = Token.create<GalleryService>("GalleryService");
  static [INJECT] = defineInject(GalleryService, [TKN_DB] as const);
  constructor(private readonly db: BigMotorsDb) {}

  async list(params: ListGalleryInput = {}) {
    const input = parse(listFields, params);
    const pattern = input.search?.replace(/[\\%_]/g, "\\$&");
    return storage(() => this.db.select().from(gallery)
      .where(pattern ? ilike(gallery.name, `%${pattern}%`) : undefined)
      .orderBy(asc(gallery.name), asc(gallery.id)).limit(input.limit).offset(input.offset));
  }
  async findById(id: string) {
    const key = parse(idField, id);
    return storage(async () => required((await this.db.select().from(gallery).where(eq(gallery.id, key)))[0]));
  }
  async create(body: CreateGalleryInput) {
    const input = parse(fields, body);
    return storage(async () => required((await this.db.insert(gallery).values(input).returning())[0]));
  }
  async update(id: string, body: UpdateGalleryInput) {
    const key = parse(idField, id); const input = parse(updateFields, body);
    return storage(async () => required((await this.db.update(gallery).set(input).where(eq(gallery.id, key)).returning())[0]));
  }
  async delete(id: string) {
    const key = parse(idField, id);
    return storage(async () => required((await this.db.delete(gallery).where(eq(gallery.id, key)).returning())[0]));
  }
  async listItems(galleryId: string, params: ListGalleryInput = {}) {
    const input = parse(listFields.omit({ search: true }), params);
    await this.findById(galleryId);
    return storage(() => this.db.select({
      id: galleryItem.id, galleryId: galleryItem.galleryId, sortOrder: galleryItem.sortOrder,
      title: galleryItem.title, label: galleryItem.label, desc: galleryItem.desc, imageId: galleryItem.imageId,
      created: galleryItem.created, updated: galleryItem.updated, originalName: files.originalName,
    }).from(galleryItem).innerJoin(files, eq(files.id, galleryItem.imageId))
      .where(eq(galleryItem.galleryId, galleryId))
      .orderBy(asc(galleryItem.sortOrder), asc(galleryItem.id)).limit(input.limit).offset(input.offset));
  }
  async createItem(galleryId: string, body: CreateGalleryItemInput) {
    const key = parse(idField, galleryId); const input = parse(itemFields, body);
    return storage(async () => required((await this.db.insert(galleryItem).values({ ...input, galleryId: key }).returning())[0]));
  }
  async updateItem(galleryId: string, id: string, body: UpdateGalleryItemInput) {
    const owner = parse(idField, galleryId); const key = parse(idField, id); const input = parse(updateItemFields, body);
    return storage(async () => required((await this.db.update(galleryItem).set(input)
      .where(and(eq(galleryItem.galleryId, owner), eq(galleryItem.id, key))).returning())[0]));
  }
  async deleteItem(galleryId: string, id: string) {
    const owner = parse(idField, galleryId); const key = parse(idField, id);
    return storage(async () => required((await this.db.delete(galleryItem)
      .where(and(eq(galleryItem.galleryId, owner), eq(galleryItem.id, key))).returning())[0]));
  }
}
