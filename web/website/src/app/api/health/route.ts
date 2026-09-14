export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    { status: "ok", service: "@bigmotors/website" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
