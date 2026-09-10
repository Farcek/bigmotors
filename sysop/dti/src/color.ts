import { createAction } from "@napp/dti-core";
import { z } from "zod";
import { idParams, referenceCreateFields, referenceEntityFields, referenceListQuery } from "./common.js";

export namespace Colors {
  export const entity = z.object({
    ...referenceEntityFields,
    hexCode: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable(),
  }).strict();
  export const createBody = z.object({
    ...referenceCreateFields,
    hexCode: z.string().trim().transform((value) => value === "" ? null : value)
      .pipe(z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable()).nullable().optional(),
  }).strict();
  export const updateBody = createBody.partial().refine(
    (value) => Object.values(value).some((field) => field !== undefined),
    "At least one field is required.",
  );
  export const params = idParams;
  export const listQuery = referenceListQuery;
  export const listResult = z.array(entity);

  export type Entity = z.infer<typeof entity>;
  export type CreateBody = z.input<typeof createBody>;
  export type UpdateBody = z.input<typeof updateBody>;
  export type Params = z.infer<typeof params>;
  export type ListQuery = z.input<typeof listQuery>;
  export type ListResult = z.infer<typeof listResult>;

  export const list = createAction("colorList", { query: listQuery, result: listResult }, { path: "/colors", method: "GET" });
  export const create = createAction("colorCreate", { body: createBody, result: entity }, { path: "/colors", method: "POST" });
  export const update = createAction("colorUpdate", { params, body: updateBody, result: entity }, { path: "/colors/:id", method: "PATCH" });
  export const remove = createAction("colorDelete", { params, result: entity }, { path: "/colors/:id", method: "DELETE" });
}
