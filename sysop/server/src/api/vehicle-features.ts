import { VehicleFeatures } from "@bigmotors/sysop-dti";
import { VehicleFeatureService, type VehicleFeature } from "@bigmotors/db";
import type { APIDti } from "./dti.js";

function toEntity(row: VehicleFeature): VehicleFeatures.Entity {
    return {
        ...row,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}

export function buildVehicleFeaturesApi(dti: APIDti): void {
    dti.action(VehicleFeatures.list, async ({ query, meta: { di } }) => {
        const rows = await di.resolve(VehicleFeatureService).list(query);
        return rows.map(toEntity);
    });
    dti.action(VehicleFeatures.create, async ({ body, meta: { di } }) =>
        toEntity(await di.resolve(VehicleFeatureService).create(body))
    );
    dti.action(VehicleFeatures.update, async ({ params, body, meta: { di } }) =>
        toEntity(await di.resolve(VehicleFeatureService).update(params.id, body))
    );
    dti.action(VehicleFeatures.remove, async ({ params, meta: { di } }) =>
        toEntity(await di.resolve(VehicleFeatureService).delete(params.id))
    );
}
