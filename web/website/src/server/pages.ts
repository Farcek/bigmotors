import "server-only";
import { PageService, SettingsService } from "@bigmotors/db";
import { connection } from "next/server";
import { cache } from "react";
import { getWebsiteContainer } from "./db";
import { isContentSlug, readContentPage, readHomepage } from "./page-queries";

export const getHomepage = cache(async () => {
  await connection();
  const di = getWebsiteContainer();
  return readHomepage(di.resolve(SettingsService), di.resolve(PageService));
});

export const getContentPage = cache(async (slug: string) => {
  if (!isContentSlug(slug)) return null;
  await connection();
  return readContentPage(slug, getWebsiteContainer().resolve(PageService));
});
