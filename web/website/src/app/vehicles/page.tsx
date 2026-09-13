import type { Metadata } from "next";
import { VehiclesPreview } from "../../components/vehicles.preview";
import { readPreviewQuery } from "../../components/vehicles.preview/model";
import { getPublicVehicleService } from "../../server/public-vehicles";
import { readCatalogVehicles } from "../../server/public-vehicle-response";

export const metadata: Metadata = {
  title: "Автомашин",
  robots: { index: false, follow: false },
};

export default async function VehiclesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const service = getPublicVehicleService();
  const lookups = await service.lookups();
  const initial = readPreviewQuery(query, lookups);
  let initialResult = null;
  let message = initial.message;
  if (initial.query) {
    try { initialResult = await readCatalogVehicles(service, initial.query); }
    catch { message = "Автомашины жагсаалтыг ачаалж чадсангүй. Дахин оролдоно уу."; }
  }
  return <VehiclesPreview key={JSON.stringify(query)} initialFilters={initial.filters} initialQuery={initial.query} initialResult={initialResult} initialMessage={message} lookups={lookups} />;
}
