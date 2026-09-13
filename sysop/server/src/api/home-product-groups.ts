import { HomeProductGroupService } from "@bigmotors/db";
import { HomeProductGroups } from "@bigmotors/sysop-dti";
import type { APIDti } from "./dti.js";

function serialize<T extends { createdAt: Date; updatedAt: Date }>(row: T) {
  return { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}
export function buildHomeProductGroupsApi(dti: APIDti): void {
  dti.action(HomeProductGroups.list, async ({ query, meta: { di } }) => (await di.resolve(HomeProductGroupService).list(query)).map(serialize));
  dti.action(HomeProductGroups.get, async ({ params, meta: { di } }) => serialize(await di.resolve(HomeProductGroupService).findById(params.id)));
  dti.action(HomeProductGroups.create, async ({ body, meta: { di } }) => serialize(await di.resolve(HomeProductGroupService).create(body)));
  dti.action(HomeProductGroups.update, async ({ params, body, meta: { di } }) => serialize(await di.resolve(HomeProductGroupService).update(params.id, body)));
  dti.action(HomeProductGroups.remove, async ({ params, meta: { di } }) => serialize(await di.resolve(HomeProductGroupService).delete(params.id)));
}
