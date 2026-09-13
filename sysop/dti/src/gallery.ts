import { createAction } from "@napp/dti-core";
import { z } from "zod";
import { isGalleryLinkUrl } from "@bigmotors/core";
import { idParams, referenceListQuery } from "./common.js";

const optionalText = (length: number) => z.string().trim().max(length).transform((v) => v || null).nullable().optional();
const dates = { created: z.string().datetime({ offset: true }), updated: z.string().datetime({ offset: true }) };
const hasFields = (v: object) => Object.values(v).some((field) => field !== undefined);

export namespace Galleries {
  export const entity = z.object({ id: z.string().uuid(), key: z.string().min(1).max(255), name: z.string().min(1).max(255), desc: z.string().max(512).nullable(), ...dates }).strict();
  export const createBody = z.object({ key: z.string().trim().min(1).max(255), name: z.string().trim().min(1).max(255), desc: optionalText(512) }).strict();
  export const updateBody = createBody.partial().refine(hasFields, "At least one field is required.");
  export const listQuery = referenceListQuery.omit({ isActive: true }).extend({ search: z.string().trim().max(255).optional() });
  export const listResult = z.array(entity);
  export type Entity = z.infer<typeof entity>;
  export type CreateBody = z.input<typeof createBody>;
  export const list = createAction("galleryList", { query: listQuery, result: listResult }, { method: "GET", path: "/galleries" });
  export const get = createAction("galleryGet", { params: idParams, result: entity }, { method: "GET", path: "/galleries/:id" });
  export const create = createAction("galleryCreate", { body: createBody, result: entity }, { method: "POST", path: "/galleries" });
  export const update = createAction("galleryUpdate", { params: idParams, body: updateBody, result: entity }, { method: "PATCH", path: "/galleries/:id" });
  export const remove = createAction("galleryDelete", { params: idParams, result: entity }, { method: "DELETE", path: "/galleries/:id" });
}

export namespace GalleryItems {
  export const entity = z.object({
    id: z.string().uuid(), galleryId: z.string().uuid(), imageId: z.string().uuid(),
    sortOrder: z.number().int().min(-2147483648).max(2147483647),
    title: z.string().max(255).nullable(), label: z.string().max(255).nullable(), desc: z.string().max(512).nullable(), ...dates,
    linkUrl: z.string().max(2048).nullable(), linkLabel: z.string().max(255).nullable(),
  }).strict();
  export const createBody = z.object({
    imageId: z.string().uuid(), sortOrder: z.number().int().min(-2147483648).max(2147483647).optional(),
    title: optionalText(255), label: optionalText(255), desc: optionalText(512),
    linkUrl: optionalText(2048).refine(isGalleryLinkUrl), linkLabel: optionalText(255),
  }).strict();
  export const updateBody = createBody.omit({ imageId: true }).partial().refine(hasFields, "At least one field is required.");
  export const ownerParams = z.object({ galleryId: z.string().uuid() }).strict();
  export const params = ownerParams.extend({ id: z.string().uuid() });
  export const listQuery = referenceListQuery.omit({ isActive: true });
  export const listEntity = entity.extend({ originalName: z.string() });
  export const listResult = z.array(listEntity);
  export type Entity = z.infer<typeof entity>;
  export type ListEntity = z.infer<typeof listEntity>;
  export type CreateBody = z.input<typeof createBody>;
  export const list = createAction("galleryItemList", { params: ownerParams, query: listQuery, result: listResult }, { method: "GET", path: "/galleries/:galleryId/items" });
  export const create = createAction("galleryItemCreate", { params: ownerParams, body: createBody, result: entity }, { method: "POST", path: "/galleries/:galleryId/items" });
  export const update = createAction("galleryItemUpdate", { params, body: updateBody, result: entity }, { method: "PATCH", path: "/galleries/:galleryId/items/:id" });
  export const remove = createAction("galleryItemDelete", { params, result: entity }, { method: "DELETE", path: "/galleries/:galleryId/items/:id" });
}
