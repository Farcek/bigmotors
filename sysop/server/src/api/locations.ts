import { Locations } from "@bigmotors/sysop-dti";
import { LocationService, type Location } from "@bigmotors/db";
import type { APIDti } from "./dti.js";

function toEntity(row: Location): Locations.Entity {
    return {
        ...row,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}

export function buildLocationsApi(dti: APIDti): void {
    dti.action(Locations.list, async ({ query, meta: { di } }) => {
        const rows = await di.resolve(LocationService).list(query);
        return rows.map(toEntity);
    });
    dti.action(Locations.create, async ({ body, meta: { di } }) =>
        toEntity(await di.resolve(LocationService).create(body))
    );
    dti.action(Locations.update, async ({ params, body, meta: { di } }) =>
        toEntity(await di.resolve(LocationService).update(params.id, body))
    );
    dti.action(Locations.remove, async ({ params, meta: { di } }) =>
        toEntity(await di.resolve(LocationService).delete(params.id))
    );
}
