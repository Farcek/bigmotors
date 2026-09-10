import { VehicleBrands } from "@bigmotors/sysop-dti";
import { VehicleBrandService, type VehicleBrand } from "@bigmotors/db";
import type { APIDti } from "./dti.js";

function toEntity(row: VehicleBrand): VehicleBrands.Entity {
    return {
        ...row,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}

export function buildVehicleBrandsApi(dti: APIDti): void {
    dti.action(VehicleBrands.list, async ({ query, meta: { di } }) => {
        const rows = await di.resolve(VehicleBrandService).list(query);
        return rows.map(toEntity);
    });
    dti.action(VehicleBrands.create, async ({ body, meta: { di } }) =>
        toEntity(await di.resolve(VehicleBrandService).create(body))
    );
    dti.action(VehicleBrands.update, async ({ params, body, meta: { di } }) =>
        toEntity(await di.resolve(VehicleBrandService).update(params.id, body))
    );
    dti.action(VehicleBrands.remove, async ({ params, meta: { di } }) =>
        toEntity(await di.resolve(VehicleBrandService).delete(params.id))
    );
}
