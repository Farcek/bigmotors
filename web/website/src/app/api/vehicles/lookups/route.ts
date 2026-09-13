import { getPublicVehicleService } from "../../../../server/public-vehicles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(await getPublicVehicleService().lookups(), { headers: { "Cache-Control": "no-store" } });
  } catch {
    console.error("Public vehicle lookups unavailable.");
    return Response.json({ code: "VEHICLE_LOOKUPS_FAILED" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
