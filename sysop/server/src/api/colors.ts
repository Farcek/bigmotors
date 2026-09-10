import { Colors } from "@bigmotors/sysop-dti";
import { ColorService, type Color } from "@bigmotors/db";

import type { APIDti } from "./dti.js";

function toEntity(row: Color): Colors.Entity {
    return {
        ...row,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}

export function buildColorsApi(dti: APIDti): void {
    dti.action(Colors.list, async ({ query, meta: { di } }) => {
        const rows = await di.resolve(ColorService).list(query);
        return rows.map(toEntity);
    });
    dti.action(Colors.create, async ({ body, meta: { di } }) =>
        toEntity(await di.resolve(ColorService).create(body))
    );
    dti.action(Colors.update, async ({ params, body, meta: { di } }) =>
        toEntity(await di.resolve(ColorService).update(params.id, body))
    );
    dti.action(Colors.remove, async ({ params, meta: { di } }) =>
        toEntity(await di.resolve(ColorService).delete(params.id))
    );
}
