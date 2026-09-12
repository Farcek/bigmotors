import { PAGE_SLUG_PATTERN, PAGE_STATUSES } from "@bigmotors/core";
import { createAction } from "@napp/dti-core";
import { z } from "zod";
import { idParams, referenceListQuery } from "./common.js";

export namespace Pages {
  export const jsonObject = z.record(z.string(), z.json());
  export const createBody = z.object({
    title: z.string().trim().min(1).max(255),
    slug: z.string().trim().min(1).max(255).regex(PAGE_SLUG_PATTERN),
    description: z.string().trim().max(512).transform(v => v || null).nullable().optional(),
    mainImageId: z.string().uuid().nullable().optional(),
    meta: jsonObject.optional(), content: jsonObject.optional(), status: z.enum(PAGE_STATUSES).optional(),
  }).strict();
  export const updateBody = createBody.partial().refine(v => Object.values(v).some(value => value !== undefined), "At least one field is required.");
  export const entity = z.object({
    id: z.string().uuid(), title: z.string(), slug: z.string(), description: z.string().nullable(),
    mainImageId: z.string().uuid().nullable(), meta: jsonObject, content: jsonObject,
    status: z.enum(PAGE_STATUSES), publishedAt: z.string().datetime({ offset: true }).nullable(),
    createdAt: z.string().datetime({ offset: true }), updatedAt: z.string().datetime({ offset: true }),
  }).strict();
  export const listEntity = entity.omit({ meta: true, content: true });
  export const listResult = z.array(listEntity);
  export const listQuery = referenceListQuery.omit({ isActive: true }).extend({
    search: z.string().trim().max(255).optional(), status: z.enum(PAGE_STATUSES).optional(),
  });
  export type Entity = z.infer<typeof entity>;
  export type ListEntity = z.infer<typeof listEntity>;
  export type CreateBody = z.input<typeof createBody>;
  export const list = createAction("pageList", { query: listQuery, result: listResult }, { method: "GET", path: "/pages" });
  export const get = createAction("pageGet", { params: idParams, result: entity }, { method: "GET", path: "/pages/:id" });
  export const create = createAction("pageCreate", { body: createBody, result: entity }, { method: "POST", path: "/pages" });
  export const update = createAction("pageUpdate", { params: idParams, body: updateBody, result: entity }, { method: "PATCH", path: "/pages/:id" });
  export const remove = createAction("pageDelete", { params: idParams, result: entity }, { method: "DELETE", path: "/pages/:id" });
}
