import { VehicleBodyTypes } from "@bigmotors/sysop-dti";
import { VehicleBodyTypeService, type VehicleBodyType } from "@bigmotors/db";
import type { APIDti } from "./dti.js";

function toEntity(row: VehicleBodyType): VehicleBodyTypes.Entity {
    return {
        ...row,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}

export function buildVehicleBodyTypesApi(dti: APIDti): void {
    dti.action(VehicleBodyTypes.list, async ({ query, meta: { di } }) => {
        const rows = await di.resolve(VehicleBodyTypeService).list(query);
        return rows.map(toEntity);
    });
    dti.action(VehicleBodyTypes.create, async ({ body, meta: { di } }) =>
        toEntity(await di.resolve(VehicleBodyTypeService).create(body))
    );
    dti.action(VehicleBodyTypes.update, async ({ params, body, meta: { di } }) =>
        toEntity(await di.resolve(VehicleBodyTypeService).update(params.id, body))
    );
    dti.action(VehicleBodyTypes.remove, async ({ params, meta: { di } }) =>
        toEntity(await di.resolve(VehicleBodyTypeService).delete(params.id))
    );
}
