import { getPublicVehicleService } from "../../../server/public-vehicles";
import { publicVehicleResponse } from "../../../server/public-vehicle-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    return await publicVehicleResponse(request, getPublicVehicleService());
  } catch {
    console.error("Public vehicle service unavailable.");
    return Response.json({ code: "VEHICLE_SEARCH_FAILED" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
