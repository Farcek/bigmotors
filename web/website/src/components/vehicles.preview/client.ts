import { vehicleListingToQuery, type VehicleListingQuery } from "@bigmotors/core";
import type { VehicleCatalogResult } from "./model";

export async function fetchCatalogVehicles(query: VehicleListingQuery, signal: AbortSignal, fetcher: typeof fetch = fetch): Promise<VehicleCatalogResult> {
  let response: Response;
  try { response = await fetcher(`/api/vehicles/search?${vehicleListingToQuery(query)}`, { signal, cache: "no-store" }); }
  catch (error) {
    if (signal.aborted) throw error;
    throw new Error("Сервертэй холбогдож чадсангүй. Дахин оролдоно уу.");
  }
  if (!response.ok) throw new Error(response.status === 400 ? "Хайлтын утгуудыг шалгана уу." : "Автомашины жагсаалтыг ачаалж чадсангүй.");
  let result: VehicleCatalogResult;
  try { result = await response.json() as VehicleCatalogResult; }
  catch { throw new Error("Хайлтын хариу буруу байна. Дахин оролдоно уу."); }
  if (!result || !Array.isArray(result.items) || result.items.length > Number(query.page_size)
    || result.pageSize !== Number(query.page_size) || !Number.isSafeInteger(result.total) || result.total < 0
    || !Number.isInteger(result.page) || result.page < 1 || !Number.isInteger(result.pageCount)
    || result.pageCount !== Math.ceil(result.total / result.pageSize) || result.page > Math.max(1, result.pageCount)
    || result.items.length !== Math.min(result.pageSize, Math.max(0, result.total - (result.page - 1) * result.pageSize))
    || !result.brandCounts || typeof result.brandCounts !== "object" || Array.isArray(result.brandCounts)
    || Object.values(result.brandCounts).some((count) => !Number.isSafeInteger(count) || count < 0)) throw new Error("Хайлтын хариу буруу байна. Дахин оролдоно уу.");
  return result;
}
