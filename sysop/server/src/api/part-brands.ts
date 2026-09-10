import { PartBrands } from "@bigmotors/sysop-dti";
import { PartBrandService, type PartBrand } from "@bigmotors/db";
import type { APIDti } from "./dti.js";

function toEntity(row: PartBrand): PartBrands.Entity {
    return {
        ...row,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}

export function buildPartBrandsApi(dti: APIDti): void {
    dti.action(PartBrands.list, async ({ query, meta: { di } }) => {
        const rows = await di.resolve(PartBrandService).list(query);
        return rows.map(toEntity);
    });
    dti.action(PartBrands.create, async ({ body, meta: { di } }) =>
        toEntity(await di.resolve(PartBrandService).create(body))
    );
    dti.action(PartBrands.update, async ({ params, body, meta: { di } }) =>
        toEntity(await di.resolve(PartBrandService).update(params.id, body))
    );
    dti.action(PartBrands.remove, async ({ params, meta: { di } }) =>
        toEntity(await di.resolve(PartBrandService).delete(params.id))
    );
}
