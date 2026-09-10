import { createAction } from "@napp/dti-core";
import { z } from "zod";
import { idParams, referenceCreateFields, referenceEntityFields, referenceListQuery } from "./common.js";

export namespace TireModels {
  export const entity = z.object({ ...referenceEntityFields, brandId: z.string().uuid() }).strict();
  export const createBody = z.object({ ...referenceCreateFields, brandId: z.string().uuid() }).strict();
  export const updateBody = z.object(referenceCreateFields).strict().partial().refine(
    (value) => Object.values(value).some((field) => field !== undefined),
    "At least one field is required.",
  );
  export const params = idParams;
  export const listQuery = referenceListQuery.extend({
    brandId: z.string().uuid().optional(),
  });
  export const listResult = z.array(entity);

  export type Entity = z.infer<typeof entity>;
  export type CreateBody = z.input<typeof createBody>;
  export type UpdateBody = z.input<typeof updateBody>;
  export type Params = z.infer<typeof params>;
  export type ListQuery = z.input<typeof listQuery>;
  export type ListResult = z.infer<typeof listResult>;

  export const list = createAction("tireModelList", { query: listQuery, result: listResult }, { path: "/tire-models", method: "GET" });
  export const create = createAction("tireModelCreate", { body: createBody, result: entity }, { path: "/tire-models", method: "POST" });
  export const update = createAction("tireModelUpdate", { params, body: updateBody, result: entity }, { path: "/tire-models/:id", method: "PATCH" });
  export const remove = createAction("tireModelDelete", { params, result: entity }, { path: "/tire-models/:id", method: "DELETE" });
}
