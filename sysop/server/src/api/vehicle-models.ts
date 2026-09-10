import { VehicleModels } from "@bigmotors/sysop-dti";
import { VehicleModelService, type VehicleModel } from "@bigmotors/db";
import type { APIDti } from "./dti.js";

function toEntity(row: VehicleModel): VehicleModels.Entity {
    return {
        ...row,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}

export function buildVehicleModelsApi(dti: APIDti): void {
    dti.action(VehicleModels.list, async ({ query, meta: { di } }) => {
        const rows = await di.resolve(VehicleModelService).list(query);
        return rows.map(toEntity);
    });
    dti.action(VehicleModels.create, async ({ body, meta: { di } }) =>
        toEntity(await di.resolve(VehicleModelService).create(body))
    );
    dti.action(VehicleModels.update, async ({ params, body, meta: { di } }) =>
        toEntity(await di.resolve(VehicleModelService).update(params.id, body))
    );
    dti.action(VehicleModels.remove, async ({ params, meta: { di } }) =>
        toEntity(await di.resolve(VehicleModelService).delete(params.id))
    );
}
