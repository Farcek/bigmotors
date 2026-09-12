import { PageService } from "@bigmotors/db";
import { Pages } from "@bigmotors/sysop-dti";
import type { APIDti } from "./dti.js";

function serialize<T extends { createdAt: Date; updatedAt: Date; publishedAt: Date | null }>(row: T) {
  return { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), publishedAt: row.publishedAt?.toISOString() ?? null };
}
export function buildPagesApi(dti: APIDti): void {
  dti.action(Pages.list, async ({ query, meta: { di } }) => (await di.resolve(PageService).list(query)).map(serialize));
  dti.action(Pages.get, async ({ params, meta: { di } }) => serialize(await di.resolve(PageService).findById(params.id)));
  dti.action(Pages.create, async ({ body, meta: { di } }) => serialize(await di.resolve(PageService).create(body)));
  dti.action(Pages.update, async ({ params, body, meta: { di } }) => serialize(await di.resolve(PageService).update(params.id, body)));
  dti.action(Pages.remove, async ({ params, meta: { di } }) => serialize(await di.resolve(PageService).delete(params.id)));
}
