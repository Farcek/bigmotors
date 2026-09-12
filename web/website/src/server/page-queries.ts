import { PAGE_SLUG_PATTERN, SETTINGS_KEY_HOMEPAGE } from "@bigmotors/core";
import type { Page, PageService, SettingsService } from "@bigmotors/db";

type PageReader = Pick<PageService, "findById" | "findPublishedBySlug">;
type SettingsReader = Pick<SettingsService, "findByKey">;

function hasCode(error: unknown, codes: string[]): boolean {
  return typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" && codes.includes(error.code);
}

export function isContentSlug(slug: string): boolean {
  return slug.length <= 255 && PAGE_SLUG_PATTERN.test(slug) && !["vehicles", "parts", "tires", "files", "api", "_next"].includes(slug);
}

export async function readHomepage(settings: SettingsReader, pages: PageReader): Promise<Page | null> {
  let id: string;
  try { id = (await settings.findByKey(SETTINGS_KEY_HOMEPAGE)).value; }
  catch (error) {
    if (hasCode(error, ["SETTINGS_NOT_FOUND"])) return null;
    throw error;
  }
  if (!id) return null;
  try {
    const page = await pages.findById(id);
    return page.status === "published" ? page : null;
  } catch (error) {
    if (hasCode(error, ["PAGE_NOT_FOUND", "PAGE_INVALID_INPUT"])) return null;
    throw error;
  }
}

export async function readContentPage(slug: string, pages: PageReader): Promise<Page | null> {
  if (!isContentSlug(slug)) return null;
  try {
    const page = await pages.findPublishedBySlug(slug);
    return page.status === "published" ? page : null;
  } catch (error) {
    if (hasCode(error, ["PAGE_NOT_FOUND"])) return null;
    throw error;
  }
}
