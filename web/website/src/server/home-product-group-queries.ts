import { getVehicleSearchHref } from "@bigmotors/core";
import type { HomeProductGroupService, PublicVehicleService } from "@bigmotors/db";
import type { HomeProductGroupItem } from "../components/home.product.groups";

export async function readHomeProductGroups(
  groups: Pick<HomeProductGroupService, "listPublic">,
  vehicles: Pick<PublicVehicleService, "countGroups">,
): Promise<HomeProductGroupItem[]> {
  const rows = await groups.listPublic();
  if (rows.length === 0) return [];
  const totals = await vehicles.countGroups(rows.map((row) => row.filters));
  return rows.map((row, index) => ({
    id: row.id, title: row.title, href: getVehicleSearchHref(row.filters), total: totals[index] ?? 0,
    imageUrl: row.imageId && row.imageName ? `/files/${row.imageId}/${encodeURIComponent(row.imageName)}` : null,
  }));
}
