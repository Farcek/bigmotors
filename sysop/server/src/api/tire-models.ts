import { TireModels } from "@bigmotors/sysop-dti";
import { TireModelService, type TireModel } from "@bigmotors/db";
import type { APIDti } from "./dti.js";

function toEntity(row: TireModel): TireModels.Entity {
    return {
        ...row,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}

export function buildTireModelsApi(dti: APIDti): void {
    dti.action(TireModels.list, async ({ query, meta: { di } }) => {
        const rows = await di.resolve(TireModelService).list(query);
        return rows.map(toEntity);
    });
    dti.action(TireModels.create, async ({ body, meta: { di } }) =>
        toEntity(await di.resolve(TireModelService).create(body))
    );
    dti.action(TireModels.update, async ({ params, body, meta: { di } }) =>
        toEntity(await di.resolve(TireModelService).update(params.id, body))
    );
    dti.action(TireModels.remove, async ({ params, meta: { di } }) =>
        toEntity(await di.resolve(TireModelService).delete(params.id))
    );
}
