import "server-only";
import { PageService } from "@bigmotors/db";
import { connection } from "next/server";
import { cache } from "react";
import { getWebsiteContainer } from "./db";
import { isContentSlug, readContentPage } from "./page-queries";

export const getContentPage = cache(async (slug: string) => {
  if (!isContentSlug(slug)) return null;
  await connection();
  return readContentPage(slug, getWebsiteContainer().resolve(PageService));
});
