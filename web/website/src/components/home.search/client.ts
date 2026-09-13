import { getVehicleSearchHref, type HomeSearchFilters, type HomeVehicleResult } from "../home.searcher/model";

export async function fetchHomeVehicles(filters: HomeSearchFilters, page: number, signal: AbortSignal, fetcher: typeof fetch = fetch): Promise<HomeVehicleResult> {
  const params = new URLSearchParams(getVehicleSearchHref(filters).split("?")[1]);
  params.set("page", String(page));
  let response: Response;
  try { response = await fetcher(`/api/vehicles?${params}`, { signal, cache: "no-store" }); }
  catch (error) {
    if (signal.aborted) throw error;
    throw new Error("Сервертэй холбогдож чадсангүй. Дахин оролдоно уу.");
  }
  if (!response.ok) throw new Error(response.status === 400 ? "Хайлтын утгууд болон доод/дээд хязгаарыг шалгана уу." : "Автомашины жагсаалтыг ачаалж чадсангүй. Дахин оролдоно уу.");
  let result: HomeVehicleResult;
  try { result = await response.json() as HomeVehicleResult; }
  catch { throw new Error("Хайлтын хариу буруу байна. Дахин оролдоно уу."); }
  if (!result || !Array.isArray(result.items) || result.items.length > 12 || !Number.isInteger(result.total) || result.total < 0 || !Number.isInteger(result.page) || result.page < 1 || result.page > 3 || !Number.isInteger(result.pageCount) || result.pageCount < 0 || result.pageCount > 3 || result.pageSize !== 12) throw new Error("Хайлтын хариу буруу байна. Дахин оролдоно уу.");
  return result;
}
