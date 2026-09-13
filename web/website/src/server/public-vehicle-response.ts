import { PublicVehicleQueryError, type PublicVehicleQuery, type PublicVehicleService } from "@bigmotors/db";
import { readVehicleSearchParams, readVehicleListingQuery, type VehicleListingInput } from "@bigmotors/core";
import type { HomeVehicleResult } from "../components/home.searcher/model";

export async function readPublicVehicles(service: Pick<PublicVehicleService, "list">, query: PublicVehicleQuery): Promise<HomeVehicleResult> {
  const result = await service.list(query);
  return { ...result, items: presentItems(result.items) };
}

function presentItems(items: Awaited<ReturnType<PublicVehicleService["list"]>>["items"]) {
  return items.map(({ mainImageId, mainImageName, itemImageId, itemImageName, ...item }) => ({
    ...item,
    imageUrl: mainImageId && mainImageName ? `/files/${mainImageId}/${encodeURIComponent(mainImageName)}` : null,
    itemImageUrl: itemImageId && itemImageName ? `/files/${itemImageId}/${encodeURIComponent(itemImageName)}` : null,
  }));
}

export async function readCatalogVehicles(service: Pick<PublicVehicleService, "search">, query: VehicleListingInput) {
  const result = await service.search(query);
  return { ...result, brandCounts: result.brandCounts ?? {}, items: presentItems(result.items) };
}

export async function catalogVehicleResponse(request: Request, service: Pick<PublicVehicleService, "search">): Promise<Response> {
  const headers = { "Cache-Control": "no-store" };
  try {
    if (request.url.length > 4096) throw new PublicVehicleQueryError();
    let query;
    try { query = readVehicleListingQuery(new URL(request.url).searchParams); }
    catch { throw new PublicVehicleQueryError(); }
    return Response.json(await readCatalogVehicles(service, query), { headers });
  } catch (error) {
    if (error instanceof PublicVehicleQueryError) return Response.json({ code: "INVALID_VEHICLE_SEARCH" }, { status: 400, headers });
    console.error("Vehicle catalog search failed.");
    return Response.json({ code: "VEHICLE_SEARCH_FAILED" }, { status: 500, headers });
  }
}

export async function publicVehicleResponse(request: Request, service: Pick<PublicVehicleService, "list">): Promise<Response> {
  const headers = { "Cache-Control": "no-store" };
  try {
    const params = new URL(request.url).searchParams;
    if (request.url.length > 4096 || Array.from(params.keys()).some((key) => params.getAll(key).length > 1)) throw new PublicVehicleQueryError();
    const page = params.get("page");
    params.delete("page");
    let query: PublicVehicleQuery;
    try { query = { ...readVehicleSearchParams(params), ...(page === null ? {} : { page }) }; }
    catch { throw new PublicVehicleQueryError(); }
    return Response.json(await readPublicVehicles(service, query), { headers });
  } catch (error) {
    if (error instanceof PublicVehicleQueryError) return Response.json({ code: "INVALID_VEHICLE_SEARCH" }, { status: 400, headers });
    console.error("Public vehicle search failed.");
    return Response.json({ code: "VEHICLE_SEARCH_FAILED" }, { status: 500, headers });
  }
}
