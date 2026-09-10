import { createAction } from "@napp/dti-core";
import { z } from "zod";
import { idParams, referenceCreateFields, referenceEntityFields, referenceListQuery } from "./common.js";

export namespace VehicleBodyTypes {
  export const entity = z.object(referenceEntityFields).strict();
  export const createBody = z.object(referenceCreateFields).strict();
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

  export const list = createAction("vehicleBodyTypeList", { query: listQuery, result: listResult }, { path: "/vehicle-body-types", method: "GET" });
  export const create = createAction("vehicleBodyTypeCreate", { body: createBody, result: entity }, { path: "/vehicle-body-types", method: "POST" });
  export const update = createAction("vehicleBodyTypeUpdate", { params, body: updateBody, result: entity }, { path: "/vehicle-body-types/:id", method: "PATCH" });
  export const remove = createAction("vehicleBodyTypeDelete", { params, result: entity }, { path: "/vehicle-body-types/:id", method: "DELETE" });
}
