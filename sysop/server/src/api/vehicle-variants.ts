import { VehicleVariants } from "@bigmotors/sysop-dti";
import { VehicleVariantService, type VehicleVariant } from "@bigmotors/db";
import type { APIDti } from "./dti.js";

function toEntity(row: VehicleVariant): VehicleVariants.Entity {
    return {
        ...row,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}

export function buildVehicleVariantsApi(dti: APIDti): void {
    dti.action(VehicleVariants.list, async ({ query, meta: { di } }) => {
        const rows = await di.resolve(VehicleVariantService).list(query);
        return rows.map(toEntity);
    });
    dti.action(VehicleVariants.create, async ({ body, meta: { di } }) =>
        toEntity(await di.resolve(VehicleVariantService).create(body))
    );
    dti.action(VehicleVariants.update, async ({ params, body, meta: { di } }) =>
        toEntity(await di.resolve(VehicleVariantService).update(params.id, body))
    );
    dti.action(VehicleVariants.remove, async ({ params, meta: { di } }) =>
        toEntity(await di.resolve(VehicleVariantService).delete(params.id))
    );
}
