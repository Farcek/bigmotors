import { isGalleryLinkUrl } from "@bigmotors/core";
import sanitizeHtml from "sanitize-html";
import type { HomeSlide } from "../components/home.carousel/types";

type GallerySlide = {
  id: string;
  imageId: string;
  originalName: string;
  title: string | null;
  label: string | null;
  desc: string | null;
  linkUrl: string | null;
  linkLabel: string | null;
};

function cleanHtml(value: string | null): string {
  const html = sanitizeHtml(value ?? "", {
    allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "s", "ul", "ol", "li", "a"],
    allowedAttributes: { a: ["href"] },
    allowedSchemes: ["https", "http"],
    allowProtocolRelative: false,
    transformTags: {
      a: (_tag, attributes): sanitizeHtml.Tag => {
        const href = attributes.href?.trim();
        return href && isGalleryLinkUrl(href)
          ? { tagName: "a", attribs: { href } }
          : { tagName: "span", attribs: {} };
      },
    },
  });
  const text = sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} });
  return text.replace(/&nbsp;|&#160;/g, " ").trim() ? html : "";
}

export function toHomeSlides(items: readonly GallerySlide[]): HomeSlide[] {
  return items.map((item) => {
    const linkUrl = item.linkUrl?.trim() || null;
    return {
      id: item.id,
      imageUrl: `/files/${encodeURIComponent(item.imageId)}/${encodeURIComponent(item.originalName)}`,
      labelHtml: cleanHtml(item.label),
      titleHtml: cleanHtml(item.title),
      descriptionHtml: cleanHtml(item.desc),
      linkUrl: isGalleryLinkUrl(linkUrl) ? linkUrl : null,
      linkLabel: item.linkLabel?.trim() || "Дэлгэрэнгүй",
    };
  });
}
