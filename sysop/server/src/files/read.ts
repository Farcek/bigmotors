import path from "node:path";
import { ConfigFiles } from "@bigmotors/core";
import { FileService } from "@bigmotors/db";
import type { Container } from "@napp/di";
import { NappError } from "@napp/error";
import { Router } from "express";
import { resolveStoredFile } from "./storage-path.js";

const inlineTypes: Readonly<Record<string, string>> = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
  ".gif": "image/gif", ".webp": "image/webp", ".avif": "image/avif",
  ".bmp": "image/bmp", ".ico": "image/x-icon",
};

function readError(error: unknown): NappError {
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
      const file = await di.resolve(FileService).findById(req.params.id);
      const root = di.resolve(ConfigFiles).FILES_ROOT;
      const diskPath = await resolveStoredFile(root, file.filePath);

      // Only stored metadata affects presentation; the URL name is never inspected.
      const type = inlineTypes[path.extname(file.originalName).toLowerCase()];
      if (type) res.type(type);
      else res.attachment(file.originalName).type("application/octet-stream");
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Content-Security-Policy", "sandbox; default-src 'none'");
      res.sendFile(diskPath, { dotfiles: "allow", cacheControl: false, lastModified: false, acceptRanges: false }, (error) => {
        if (!error) return;
        if (!res.headersSent) {
          res.removeHeader("Content-Disposition");
          res.removeHeader("Content-Type");
        }
        next(readError(error));
      });
    } catch (error) {
      next(readError(error));
    }
  });
  return router;
}
