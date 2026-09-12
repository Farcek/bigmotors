import type { GalleryService } from "@bigmotors/db";

type GalleryReader = Pick<GalleryService, "findByKey" | "listItems">;

export async function readGalleryByKey(key: string, service: GalleryReader) {
  let gallery: Awaited<ReturnType<GalleryReader["findByKey"]>>;
  try {
    gallery = await service.findByKey(key);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "GALLERY_NOT_FOUND") return null;
    throw error;
  }

  const items: Awaited<ReturnType<GalleryReader["listItems"]>> = [];
  for (let offset = 0; ; offset += 100) {
    const batch = await service.listItems(gallery.id, { limit: 100, offset });
    items.push(...batch);
    if (batch.length < 100) break;
  }
  return { ...gallery, items };
}
