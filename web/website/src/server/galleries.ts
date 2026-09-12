import "server-only";
import { GalleryService } from "@bigmotors/db";
import { connection } from "next/server";
import { cache } from "react";
import { getWebsiteContainer } from "./db";
import { readGalleryByKey } from "./gallery-queries";

export const getGalleryByKey = cache(async (key: string) => {
  await connection();
  return readGalleryByKey(key, getWebsiteContainer().resolve(GalleryService));
});
