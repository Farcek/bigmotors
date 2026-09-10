import { Colors } from "@bigmotors/sysop-dti";
import { ColorService } from "@bigmotors/db";

import type { APIDti } from "./dti.js";

export function buildColorsApi(dti: APIDti): void {
    dti.action(Colors.list, async ({ query, meta: { di } }) => {
        const rows = await di.resolve(ColorService).list(query);
        return rows.map((row) => ({
            ...row,
            createdAt: row.createdAt.toISOString(),
            updatedAt: row.updatedAt.toISOString(),
        }));
    });
}
