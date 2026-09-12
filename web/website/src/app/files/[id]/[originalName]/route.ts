export function GET() {
  return Response.json(
    { error: { code: "FILE_READ_NOT_IMPLEMENTED", message: "Website file read is not implemented yet." } },
    { status: 501, headers: { "Cache-Control": "no-store" } },
  );
}
