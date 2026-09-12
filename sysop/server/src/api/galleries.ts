import { GalleryService } from "@bigmotors/db";
import { Galleries, GalleryItems } from "@bigmotors/sysop-dti";
import type { APIDti } from "./dti.js";

function serialize<T extends { created: Date; updated: Date }>(row: T) {
  return { ...row, created: row.created.toISOString(), updated: row.updated.toISOString() };
}

export function buildGalleriesApi(dti: APIDti): void {
  dti.action(Galleries.list, async ({ query, meta: { di } }) => (await di.resolve(GalleryService).list(query)).map(serialize));
  dti.action(Galleries.get, async ({ params, meta: { di } }) => serialize(await di.resolve(GalleryService).findById(params.id)));
  dti.action(Galleries.create, async ({ body, meta: { di } }) => serialize(await di.resolve(GalleryService).create(body)));
  dti.action(Galleries.update, async ({ params, body, meta: { di } }) => serialize(await di.resolve(GalleryService).update(params.id, body)));
  dti.action(Galleries.remove, async ({ params, meta: { di } }) => serialize(await di.resolve(GalleryService).delete(params.id)));
  dti.action(GalleryItems.list, async ({ params, query, meta: { di } }) => (await di.resolve(GalleryService).listItems(params.galleryId, query)).map(serialize));
  dti.action(GalleryItems.create, async ({ params, body, meta: { di } }) => serialize(await di.resolve(GalleryService).createItem(params.galleryId, body)));
  dti.action(GalleryItems.update, async ({ params, body, meta: { di } }) => serialize(await di.resolve(GalleryService).updateItem(params.galleryId, params.id, body)));
  dti.action(GalleryItems.remove, async ({ params, meta: { di } }) => serialize(await di.resolve(GalleryService).deleteItem(params.galleryId, params.id)));
}
