import { createAction } from "@napp/dti-core";
import { z } from "zod";
import { idParams, referenceCreateFields, referenceEntityFields, referenceListQuery } from "./common.js";

export namespace VehicleVariants {
  export const entity = z.object({ ...referenceEntityFields, modelId: z.string().uuid() }).strict();
  export const createBody = z.object({ ...referenceCreateFields, modelId: z.string().uuid() }).strict();
  export const updateBody = z.object(referenceCreateFields).strict().partial().refine(
    (value) => Object.values(value).some((field) => field !== undefined),
    "At least one field is required.",
  );
  export const params = idParams;
  export const listQuery = referenceListQuery.extend({
    modelId: z.string().uuid().optional(),
  });
  export const listResult = z.array(entity);

  export type Entity = z.infer<typeof entity>;
  export type CreateBody = z.input<typeof createBody>;
  export type UpdateBody = z.input<typeof updateBody>;
  export type Params = z.infer<typeof params>;
  export type ListQuery = z.input<typeof listQuery>;
  export type ListResult = z.infer<typeof listResult>;

  export const list = createAction("vehicleVariantList", { query: listQuery, result: listResult }, { path: "/vehicle-variants", method: "GET" });
  export const create = createAction("vehicleVariantCreate", { body: createBody, result: entity }, { path: "/vehicle-variants", method: "POST" });
  export const update = createAction("vehicleVariantUpdate", { params, body: updateBody, result: entity }, { path: "/vehicle-variants/:id", method: "PATCH" });
  export const remove = createAction("vehicleVariantDelete", { params, result: entity }, { path: "/vehicle-variants/:id", method: "DELETE" });
}
