import type { PublicVehicleService } from "@bigmotors/db";
import sanitizeHtml from "sanitize-html";
import type { VehicleDetailData } from "../components/vehicle.detail/model";
import { readPublicVehicles } from "./public-vehicle-response";

type DetailService = Pick<PublicVehicleService, "detail" | "list">;
const headers = { "Cache-Control": "no-store" };

export async function readVehicleDetail(service: DetailService, id: string) {
  const record = await service.detail(id);
  if (!record) return null;
  const { content, photos, mainImageId, mainImageName, brandId, bodyTypeId, ...fields } = record;
  const ordered = mainImageId && mainImageName
    ? [{ id: mainImageId, originalName: mainImageName }, ...photos.filter((photo) => photo.id !== mainImageId)] : photos;
  const gallery = ordered.map((photo, index) => ({
    src: `/files/${photo.id}/${encodeURIComponent(photo.originalName)}`,
    alt: `${record.title}: зураг ${index + 1}`,
  }));
  const contentHtml = sanitizeHtml(content ?? "", {
    allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "s", "h2", "h3", "ul", "ol", "li", "blockquote", "a"],
    allowedAttributes: { a: ["href"] }, allowedSchemes: ["http", "https"], allowProtocolRelative: false,
  });
  const item: VehicleDetailData = {
    ...fields, photos: gallery, imageUrl: gallery[0]?.src ?? null, imageCount: gallery.length,
    contentHtml: sanitizeHtml(contentHtml, { allowedTags: [], allowedAttributes: {} }).replace(/&nbsp;|&#160;/g, " ").trim() ? contentHtml : null,
  };
  const similar = await readPublicVehicles(service, bodyTypeId ? { category: bodyTypeId } : brandId ? { brand: brandId } : {});
  const related = new Map(similar.items.filter((vehicle) => vehicle.id !== item.id).map((vehicle) => [vehicle.id, vehicle]));
  // Prefer the same body type, then brand, and fill any remaining slots from the public catalog.
  const fallbacks = [...(bodyTypeId && brandId ? [{ brand: brandId }] : []), ...(bodyTypeId || brandId ? [{}] : [])];
  for (const query of fallbacks) {
    if (related.size >= 4) break;
    const result = await readPublicVehicles(service, query);
    for (const vehicle of result.items) if (vehicle.id !== item.id && !related.has(vehicle.id)) related.set(vehicle.id, vehicle);
  }
  return { item, related: [...related.values()].slice(0, 4) };
}

export async function vehicleDetailResponse(id: string, service: DetailService): Promise<Response> {
  try {
    const result = await readVehicleDetail(service, id);
    return result ? Response.json(result, { headers }) : Response.json({ code: "VEHICLE_NOT_FOUND" }, { status: 404, headers });
  } catch {
    console.error("Public vehicle detail failed.");
    return Response.json({ code: "VEHICLE_DETAIL_FAILED" }, { status: 500, headers });
  }
}
