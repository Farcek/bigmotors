import { getPublicVehicleService } from "../../../../server/public-vehicles";
import { vehicleDetailResponse } from "../../../../server/vehicle-detail-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { return await vehicleDetailResponse((await params).id, getPublicVehicleService()); }
  catch {
    console.error("Vehicle detail service unavailable.");
    return Response.json({ code: "VEHICLE_DETAIL_FAILED" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
