import { PAGE_SLUG_PATTERN } from "@bigmotors/core";
import type { Page, PageService } from "@bigmotors/db";

type PageReader = Pick<PageService, "findPublishedBySlug">;

function hasCode(error: unknown, codes: string[]): boolean {
  return typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" && codes.includes(error.code);
}

export function isContentSlug(slug: string): boolean {
  return slug.length <= 255 && PAGE_SLUG_PATTERN.test(slug) && !["vehicles", "parts", "tires", "files", "api", "_next"].includes(slug);
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
