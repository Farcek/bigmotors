import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VehicleDetail } from "../../../components/vehicle.detail";
import { getPublicVehicleService } from "../../../server/public-vehicles";
import { readVehicleDetail } from "../../../server/vehicle-detail-response";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Автомашины дэлгэрэнгүй",
  robots: { index: false, follow: false },
};

export default async function VehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const result = await readVehicleDetail(getPublicVehicleService(), (await params).id);
  if (!result) notFound();
  return <VehicleDetail item={result.item} related={result.related} />;
}
