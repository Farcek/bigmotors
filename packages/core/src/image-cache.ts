import { createHash, randomUUID } from "node:crypto";
import { lstat, mkdir, readFile, realpath, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { FILE_IMAGE_WIDTHS, FileImageError, type FileImageWidth } from "./file-image.js";

export const FILE_IMAGE_CACHE_CONTROL = "public, max-age=3600";
const pending = new Map<string, Promise<string>>();
const waiting: Array<() => void> = [];
let active = 0;

async function limited<T>(work: () => Promise<T>): Promise<T> {
  if (active >= 2) {
    if (waiting.length >= 32) throw new FileImageError("FILE_IMAGE_BUSY", 503, "Image service is busy. Try again shortly.");
    await new Promise<void>((resolve) => waiting.push(resolve));
  } else active++;
  try { return await work(); }
  finally {
    const next = waiting.shift();
    if (next) next(); else active--;
  }
}

async function cached(target: string): Promise<boolean> {
  try {
    const info = await lstat(target);
    if (!info.isFile() || info.isSymbolicLink() || info.size === 0) throw new Error("Invalid image cache entry.");
    return true;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return false;
    throw error;
  }
}

export async function resizeStoredImage(source: string, cacheRoot: string, width: FileImageWidth): Promise<string> {
  if (!FILE_IMAGE_WIDTHS.includes(width)) throw new FileImageError("FILE_IMAGE_INVALID_WIDTH", 400, "Invalid image width.");
  if (!cacheRoot.trim() || !path.isAbsolute(cacheRoot)
    || (process.platform === "win32" && path.parse(cacheRoot).root.length < 3)) throw new Error("Invalid image cache configuration.");
  const info = await stat(source);
  if (!info.isFile()) throw Object.assign(new Error("File not found."), { code: "ENOENT" });
  if (info.size > 64 * 1024 * 1024) throw new FileImageError("FILE_IMAGE_TOO_LARGE", 413, "Image is too large to resize.");
  await mkdir(cacheRoot, { recursive: true });
  const root = await realpath(cacheRoot);
  const folder = path.join(root, "image-v1");
  await mkdir(folder, { recursive: true });
  if ((await realpath(folder)) !== folder || (await lstat(folder)).isSymbolicLink()) throw new Error("Invalid image cache directory.");
  const key = createHash("sha256").update(JSON.stringify([source, info.size, info.mtimeMs, info.ctimeMs, width])).digest("hex");
  const target = path.join(folder, `${key}.webp`);
  if (await cached(target)) return target;
  const existing = pending.get(target);
  if (existing) return existing;
  const work = limited(async () => {
    if (await cached(target)) return target;
    // A bounded source buffer prevents libvips from retaining open source handles on Windows.
    const bytes = await readFile(source);
    if (bytes.length > 64 * 1024 * 1024) throw new FileImageError("FILE_IMAGE_TOO_LARGE", 413, "Image is too large to resize.");
    const image = sharp(bytes, { limitInputPixels: 40_000_000, failOn: "warning", animated: false });
    let output: Buffer;
    try {
      const metadata = await image.metadata();
      if (!metadata.format || !["jpeg", "png", "webp", "avif", "heif", "gif"].includes(metadata.format)
        || (metadata.pages ?? 1) > 1) throw new Error("Unsupported image.");
      // Keep the full image and orientation. CSS owns presentation cropping.
      output = await image.autoOrient().resize({ width, height: 1920, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 80 }).timeout({ seconds: 20 }).toBuffer();
    } catch {
      throw new FileImageError("FILE_IMAGE_UNSUPPORTED", 415, "Image cannot be resized. Use the original file.");
    } finally { image.destroy(); }
    const temporary = path.join(folder, `${key}-${randomUUID()}.tmp`);
    try {
      await writeFile(temporary, output, { flag: "wx", mode: 0o600 });
      await rename(temporary, target);
    } finally { await rm(temporary, { force: true }); }
    return target;
  });
  pending.set(target, work);
  try { return await work; } finally { pending.delete(target); }
}
