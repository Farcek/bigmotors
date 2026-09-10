import { Branches } from "@bigmotors/sysop-dti";
import { BranchService, type Branch } from "@bigmotors/db";
import type { APIDti } from "./dti.js";

function toEntity(row: Branch): Branches.Entity {
    return {
        ...row,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}

export function buildBranchesApi(dti: APIDti): void {
    dti.action(Branches.list, async ({ query, meta: { di } }) => {
        const rows = await di.resolve(BranchService).list(query);
        return rows.map(toEntity);
    });
    dti.action(Branches.create, async ({ body, meta: { di } }) =>
        toEntity(await di.resolve(BranchService).create(body))
    );
    dti.action(Branches.update, async ({ params, body, meta: { di } }) =>
        toEntity(await di.resolve(BranchService).update(params.id, body))
    );
    dti.action(Branches.remove, async ({ params, meta: { di } }) =>
        toEntity(await di.resolve(BranchService).delete(params.id))
    );
}
