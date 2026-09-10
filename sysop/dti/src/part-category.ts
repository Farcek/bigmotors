import { createAction } from "@napp/dti-core";
import { z } from "zod";
import { queryBoolean, idParams, referenceCreateFields, referenceEntityFields, referenceListQuery } from "./common.js";

export namespace PartCategories {
  export const entity = z.object({ ...referenceEntityFields, parentId: z.string().uuid().nullable() }).strict();
  export const createBody = z.object({ ...referenceCreateFields, parentId: z.string().uuid().nullable().default(null) }).strict();
  export const updateBody = z.object(referenceCreateFields).strict().partial().refine(
    (value) => Object.values(value).some((field) => field !== undefined),
    "At least one field is required.",
  );
  export const params = idParams;
  export const listQuery = referenceListQuery.extend({
    parentId: z.string().uuid().optional(),
    rootOnly: queryBoolean.optional(),
  }).refine((value) => !(value.rootOnly === true && value.parentId !== undefined), "rootOnly and parentId cannot be combined.");
  export const listResult = z.array(entity);

  export type Entity = z.infer<typeof entity>;
  export type CreateBody = z.input<typeof createBody>;
  export type UpdateBody = z.input<typeof updateBody>;
  export type Params = z.infer<typeof params>;
  export type ListQuery = z.input<typeof listQuery>;
  export type ListResult = z.infer<typeof listResult>;

  export const list = createAction("partCategoryList", { query: listQuery, result: listResult }, { path: "/part-categories", method: "GET" });
  export const create = createAction("partCategoryCreate", { body: createBody, result: entity }, { path: "/part-categories", method: "POST" });
  export const update = createAction("partCategoryUpdate", { params, body: updateBody, result: entity }, { path: "/part-categories/:id", method: "PATCH" });
  export const remove = createAction("partCategoryDelete", { params, result: entity }, { path: "/part-categories/:id", method: "DELETE" });
}
