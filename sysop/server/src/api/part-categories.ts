import { PartCategories } from "@bigmotors/sysop-dti";
import { PartCategoryService, type PartCategory } from "@bigmotors/db";
import type { APIDti } from "./dti.js";

function toEntity(row: PartCategory): PartCategories.Entity {
    return {
        ...row,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}

export function buildPartCategoriesApi(dti: APIDti): void {
    dti.action(PartCategories.list, async ({ query, meta: { di } }) => {
        const rows = await di.resolve(PartCategoryService).list(query);
        return rows.map(toEntity);
    });
    dti.action(PartCategories.create, async ({ body, meta: { di } }) =>
        toEntity(await di.resolve(PartCategoryService).create(body))
    );
    dti.action(PartCategories.update, async ({ params, body, meta: { di } }) =>
        toEntity(await di.resolve(PartCategoryService).update(params.id, body))
    );
    dti.action(PartCategories.remove, async ({ params, meta: { di } }) =>
        toEntity(await di.resolve(PartCategoryService).delete(params.id))
    );
}
