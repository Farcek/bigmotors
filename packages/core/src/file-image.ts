export const FILE_IMAGE_WIDTHS = [240, 480, 800, 1280, 1920] as const;
export type FileImageWidth = typeof FILE_IMAGE_WIDTHS[number];

export class FileImageError extends Error {
  constructor(readonly code: string, readonly status: number, message: string) { super(message); }
}

export function parseFileImageWidth(params: URLSearchParams): FileImageWidth | undefined {
  const values = params.getAll("w");
  if (!values.length) return undefined;
  const width = FILE_IMAGE_WIDTHS.find((value) => String(value) === values[0]);
  if (values.length !== 1 || !width) {
    throw new FileImageError("FILE_IMAGE_INVALID_WIDTH", 400, "Image width must be 240, 480, 800, 1280 or 1920.");
  }
  return width;
}

// Only our file route supports resizing; static assets and remote URLs stay intact.
export function getFileImageUrl(src: string, width: FileImageWidth): string {
  if (!/^\/files\/[0-9a-f-]+\/[^/?#]+/i.test(src)) return src;
  const url = new URL(src, "http://files.local");
  if (!/\.(jpe?g|png|webp|avif)$/i.test(url.pathname)) return src;
  url.searchParams.set("w", String(width));
  return `${url.pathname}${url.search}${url.hash}`;
}
