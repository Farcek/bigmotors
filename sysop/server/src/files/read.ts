import { ConfigFiles, FileImageError, parseFileImageWidth } from "@bigmotors/core";
import { FILE_IMAGE_CACHE_CONTROL, resizeStoredImage } from "@bigmotors/core/image-cache";
import { storedFileHeaders } from "@bigmotors/core/file-storage";
import { FileService } from "@bigmotors/db";
import type { Container } from "@napp/di";
import { NappError } from "@napp/error";
import { Router } from "express";
import { resolveStoredFile } from "./storage-path.js";

function readError(error: unknown): NappError {
  if (error instanceof FileImageError) return new NappError(error.message, { code: error.code, status: error.status });
  if (error instanceof NappError) return error;
  const code = error instanceof Error && "code" in error ? error.code : undefined;
  if (code === "ENOENT" || code === "ENOTDIR") {
    return new NappError("File not found.", { code: "FILE_NOT_FOUND", status: 404 });
  }
  return new NappError("File read failed.", { code: "FILE_READ_ERROR", status: 500, cause: error });
}

export function buildFileReadRouter(di: Container): Router {
  const router = Router();
  // Public read deliberately does not use the admin API's authorization gate.
  router.get("/files/:id/:originalName", async (req, res, next) => {
    try {
      const width = parseFileImageWidth(new URL(req.originalUrl, "http://files.local").searchParams);
      const file = await di.resolve(FileService).findById(req.params.id);
      const config = di.resolve(ConfigFiles);
      const source = await resolveStoredFile(config.FILES_ROOT, file.filePath);
      const diskPath = width ? await resizeStoredImage(source, config.FILES_CACHE, width) : source;

      // Only stored metadata affects presentation; the URL name is never inspected.
      res.set(width ? { ...storedFileHeaders("image.webp"), "Cache-Control": FILE_IMAGE_CACHE_CONTROL } : storedFileHeaders(file.originalName));
      res.sendFile(diskPath, { dotfiles: "allow", cacheControl: false, lastModified: false, acceptRanges: false }, (error) => {
        if (!error) return;
        if (!res.headersSent) {
          res.setHeader("Cache-Control", "no-store");
          res.removeHeader("Content-Disposition");
          res.removeHeader("Content-Type");
        }
        next(readError(error));
      });
    } catch (error) {
      if (error instanceof FileImageError && error.status === 503) {
        res.setHeader("Retry-After", "1");
        res.status(503).json({ error: { code: error.code, message: error.message } });
        return;
      }
      next(readError(error));
    }
  });
  return router;
}
