import type { Container } from "@napp/di";
import { ConfigFiles } from "@bigmotors/core";
import { FilePersistenceError, FileService } from "@bigmotors/db";
import { Files } from "@bigmotors/sysop-dti";
import { NappError } from "@napp/error";
import { Router, type Request, type Response } from "express";
import multer from "multer";
import { UploadStorage, type UploadTarget } from "../files/upload-storage.js";

function invalidInput(): NappError {
  return new NappError("Invalid file upload input.", { code: "FILE_UPLOAD_INVALID_INPUT", status: 400 });
}

function receive(req: Request, res: Response, target: UploadTarget, maxBytes: number): Promise<void> {
  const middleware = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, callback) => callback(null, target.directory),
      filename: (_req, _file, callback) => callback(null, target.id),
    }),
    defParamCharset: "utf8",
    // Busboy emits partsLimit on reaching the count, including the final valid part.
    limits: { fileSize: maxBytes, files: 1, fields: 2, parts: 4, fieldNameSize: 32, fieldSize: 4096, fieldNestingDepth: 0 },
  }).single(Files.uploadRoute.field);
  return new Promise((resolve, reject) => middleware(req, res, (error?: unknown) => {
    if (!error) return resolve();
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return reject(new NappError(`File exceeds the ${maxBytes} byte limit.`, { code: "FILE_UPLOAD_TOO_LARGE", status: 413 }));
      }
      return reject(invalidInput());
    }
    if (error instanceof Error && "code" in error && typeof error.code === "string" && /^E[A-Z]+$/.test(error.code)) {
      return reject(error);
    }
    reject(invalidInput());
  }));
}

export function buildFilesApi(di: Container): Router {
  const router = Router();
  router.post(Files.uploadRoute.path, async (req, res) => {
    let target: UploadTarget | undefined;
    let storage: UploadStorage | undefined;
    let preserve = false;
    try {
      if (!req.is("multipart/form-data")) {
        throw new NappError("Expected multipart/form-data.", { code: "FILE_UPLOAD_UNSUPPORTED_MEDIA_TYPE", status: 415 });
      }
      if (Object.keys(req.query).length !== 0) throw invalidInput();
      const config = di.resolve(ConfigFiles);
      const service = di.resolve(FileService);
      storage = di.resolve(UploadStorage);
      target = await storage.prepare();
      if (req.aborted) throw invalidInput();
      await receive(req, res, target, config.FILE_UPLOAD_MAX_BYTES);
      const metadata = Files.uploadMetadata.safeParse(req.body);
      if (!req.file || !metadata.success || req.aborted) throw invalidInput();
      const row = await service.createUploadedFile({
        id: target.id, filePath: target.filePath, originalName: req.file.originalname, ...metadata.data,
      });
      preserve = true;
      const result: Files.UploadResult = {
        id: row.id, originalName: row.originalName, title: row.title, description: row.description,
        createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
      };
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof FilePersistenceError && error.writeMayHaveCommitted) {
        preserve = true;
        console.error("file_upload_commit_uncertain", { fileId: target?.id });
      }
      if (target && storage && !preserve) {
        try { await storage.discard(target); } catch {
          console.error("file_upload_cleanup_failed", { fileId: target.id });
        }
      }
      if (!res.destroyed && !res.headersSent) {
        const known = error instanceof NappError;
        const status = known && error.status && error.status >= 400 && error.status < 500 ? error.status : 500;
        res.status(status).json({ error: {
          code: known ? error.code : "FILE_UPLOAD_STORAGE_ERROR",
          message: status >= 500 ? "File storage operation failed." : (error as NappError).message,
        } });
      }
    }
  });
  return router;
}
