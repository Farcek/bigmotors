import { createAction } from "@napp/dti-core";
import { z } from "zod";
import { referenceListQuery } from "./common.js";

export namespace Settings {
  export const key = z.string().min(1).max(255).refine(v => v.trim().length > 0 && !v.includes("\0"));
  export const value = z.string().max(255).refine(v => !v.includes("\0"));
  export const entity = z.object({ key, value }).strict();
  export const params = z.object({ key }).strict();
  export const createBody = entity;
  export const updateBody = entity.pick({ value: true });
  export const saveBody = z.object({ entries: z.array(entity).min(1).max(100)
    .refine(entries => new Set(entries.map(row => row.key)).size === entries.length, "Keys must be unique.") }).strict();
  export const listQuery = referenceListQuery.omit({ isActive: true }).extend({ key: key.optional(), search: z.string().max(255).optional() });
  export const listResult = z.array(entity);
  export type Entity = z.infer<typeof entity>;
  export const list = createAction("settingsList", { query: listQuery, result: listResult }, { method: "GET", path: "/settings" });
  export const get = createAction("settingsGet", { params, result: entity }, { method: "GET", path: "/settings/:key" });
  export const create = createAction("settingsCreate", { body: createBody, result: entity }, { method: "POST", path: "/settings" });
  export const update = createAction("settingsUpdate", { params, body: updateBody, result: entity }, { method: "PATCH", path: "/settings/:key" });
  export const remove = createAction("settingsDelete", { params, result: entity }, { method: "DELETE", path: "/settings/:key" });
  export const save = createAction("settingsSave", { body: saveBody, result: listResult }, { method: "PUT", path: "/settings" });
}
