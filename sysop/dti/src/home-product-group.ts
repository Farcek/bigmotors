import { createAction } from "@napp/dti-core";
import { vehicleSearchParams } from "@bigmotors/core";
import { z } from "zod";
import { idParams, referenceEntityFields, referenceCreateFields, referenceListQuery } from "./common.js";

export namespace HomeProductGroups {
  const { name: _entityName, ...entityFields } = referenceEntityFields;
  const { name: _createName, ...createFields } = referenceCreateFields;
  export const entity = z.object({ ...entityFields, title: z.string().min(1).max(255), imageId: z.string().uuid().nullable(), filters: vehicleSearchParams }).strict();
  export const createBody = z.object({ ...createFields, title: z.string().trim().min(1).max(255), imageId: z.string().uuid().nullable().optional(), filters: vehicleSearchParams }).strict();
  export const updateBody = createBody.partial().refine((v) => Object.values(v).some((value) => value !== undefined), "At least one field is required.");
  export const listQuery = referenceListQuery.extend({ search: z.string().trim().max(255).optional() });
  export const listResult = z.array(entity);
  export type Entity = z.infer<typeof entity>;
  export type CreateBody = z.input<typeof createBody>;
  export const list = createAction("homeProductGroupList", { query: listQuery, result: listResult }, { method: "GET", path: "/home-product-groups" });
  export const get = createAction("homeProductGroupGet", { params: idParams, result: entity }, { method: "GET", path: "/home-product-groups/:id" });
  export const create = createAction("homeProductGroupCreate", { body: createBody, result: entity }, { method: "POST", path: "/home-product-groups" });
  export const update = createAction("homeProductGroupUpdate", { params: idParams, body: updateBody, result: entity }, { method: "PATCH", path: "/home-product-groups/:id" });
  export const remove = createAction("homeProductGroupDelete", { params: idParams, result: entity }, { method: "DELETE", path: "/home-product-groups/:id" });
}
