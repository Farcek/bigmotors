import { ConfigFiles } from "@bigmotors/core";
import { VehicleService, type VehicleEntity, type VehicleFile, type VehicleListItem, type VehicleWriteOptions } from "@bigmotors/db";
import { Vehicles, type Files } from "@bigmotors/sysop-dti";
import type { Container } from "@napp/di";
import { NappError } from "@napp/error";
import type { APIDti } from "./dti.js";
import { resolveStoredFile } from "../files/storage-path.js";

function fileEntity(file: VehicleFile): Files.UploadResult {
  return { ...file, createdAt: file.createdAt.toISOString(), updatedAt: file.updatedAt.toISOString() };
}
function listItem(row: VehicleListItem): Vehicles.ListItem {
  return {
    ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
    firstPublishedAt: row.firstPublishedAt?.toISOString() ?? null,
    mainImage: row.mainImage ? fileEntity(row.mainImage) : null,
    itemImage: row.itemImage ? fileEntity(row.itemImage) : null,
  };
}
function entity(row: VehicleEntity): Vehicles.Entity {
  return { ...row, ...listItem(row), images: row.images.map((image) => ({ ...image, file: fileEntity(image.file) })) };
}
function writeOptions(di: Container): VehicleWriteOptions {
  return { async verifyFiles(records) {
    if (!records.length) return;
    const root = di.resolve(ConfigFiles).FILES_ROOT;
    for (const record of records) {
      try { await resolveStoredFile(root, record.filePath); }
      catch (error) {
        const code = error instanceof Error && "code" in error ? error.code : undefined;
        if (code === "ENOENT" || code === "ENOTDIR" || code === "FILE_NOT_FOUND") {
          throw new NappError("Selected file is missing from storage.", { code: "VEHICLE_FILE_UNAVAILABLE", status: 409 });
        }
        throw error;
      }
    }
  } };
}

export function buildVehiclesApi(dti: APIDti): void {
  dti.action(Vehicles.list, async ({ query, meta: { di } }) => {
    const result = await di.resolve(VehicleService).list(query);
    return { ...result, items: result.items.map(listItem) };
  });
  dti.action(Vehicles.get, async ({ params, meta: { di } }) => entity(await di.resolve(VehicleService).get(params.id)));
  dti.action(Vehicles.create, async ({ body, meta: { di } }) => entity(await di.resolve(VehicleService).create(body, writeOptions(di))));
  dti.action(Vehicles.update, async ({ params, body, meta: { di } }) => entity(await di.resolve(VehicleService).update(params.id, body, writeOptions(di))));
  dti.action(Vehicles.publish, async ({ params, meta: { di } }) => entity(await di.resolve(VehicleService).publish(params.id, writeOptions(di))));
  dti.action(Vehicles.hide, async ({ params, meta: { di } }) => entity(await di.resolve(VehicleService).hide(params.id)));
  dti.action(Vehicles.archive, async ({ params, meta: { di } }) => entity(await di.resolve(VehicleService).archive(params.id)));
  dti.action(Vehicles.restore, async ({ params, meta: { di } }) => entity(await di.resolve(VehicleService).restore(params.id)));
}
