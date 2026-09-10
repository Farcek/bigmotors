import { TireBrands } from "@bigmotors/sysop-dti";
import { TireBrandService, type TireBrand } from "@bigmotors/db";
import type { APIDti } from "./dti.js";

function toEntity(row: TireBrand): TireBrands.Entity {
    return {
        ...row,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}

export function buildTireBrandsApi(dti: APIDti): void {
    dti.action(TireBrands.list, async ({ query, meta: { di } }) => {
        const rows = await di.resolve(TireBrandService).list(query);
        return rows.map(toEntity);
    });
    dti.action(TireBrands.create, async ({ body, meta: { di } }) =>
        toEntity(await di.resolve(TireBrandService).create(body))
    );
    dti.action(TireBrands.update, async ({ params, body, meta: { di } }) =>
        toEntity(await di.resolve(TireBrandService).update(params.id, body))
    );
    dti.action(TireBrands.remove, async ({ params, meta: { di } }) =>
        toEntity(await di.resolve(TireBrandService).delete(params.id))
    );
}
