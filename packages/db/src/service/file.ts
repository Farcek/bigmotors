import { CATALOG_LIMITS } from "@bigmotors/core";
import { defineInject, INJECT, TOKEN, Token } from "@napp/di";
import { NappError } from "@napp/error";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { TKN_DB, type BigMotorsDb } from "../db.js";
import { files, type File } from "../schema/files.js";

const inputSchema = z.object({
  id: z.string().uuid(),
  filePath: z.string().min(1).refine((value) =>
    !value.includes("\\") && !value.includes(":") && !value.includes("\0")
    && value.split("/").every((part) => part !== "" && part !== "." && part !== "..")),
  originalName: z.string().min(1).refine((value) => !value.includes("\0")),
  title: z.string().trim().max(CATALOG_LIMITS.title).transform((value) => value || null).nullable().optional(),
  description: z.string().trim().max(CATALOG_LIMITS.description).transform((value) => value || null).nullable().optional(),
}).strict();

export type CreateUploadedFileInput = z.input<typeof inputSchema>;

export class FilePersistenceError extends NappError {
  constructor(readonly writeMayHaveCommitted: boolean, cause: unknown) {
    super("File storage operation failed.", { code: "FILE_UPLOAD_STORAGE_ERROR", status: 500, cause });
  }
}

export class FileService {
  static [TOKEN] = Token.create<FileService>("FileService");
  static [INJECT] = defineInject(FileService, [TKN_DB] as const);
  constructor(private readonly db: BigMotorsDb) {}

  async findById(id: string): Promise<File> {
    if (!z.string().uuid().safeParse(id).success) {
      throw new NappError("Invalid file ID.", { code: "FILE_INVALID_ID", status: 400 });
    }
    const [row] = await this.db.select().from(files).where(eq(files.id, id)).limit(1);
    if (!row) throw new NappError("File not found.", { code: "FILE_NOT_FOUND", status: 404 });
    return row;
  }

  async createUploadedFile(param: CreateUploadedFileInput): Promise<File> {
    const parsed = inputSchema.safeParse(param);
    if (!parsed.success) {
      throw new NappError("Invalid file input.", { code: "FILE_UPLOAD_INVALID_INPUT", status: 400 });
    }
    const input = parsed.data;
    try {
      const [row] = await this.db.insert(files).values(input).returning();
      if (!row) throw new Error("File insert did not return a row.");
      return row;
    } catch (error) {
      // A transport failure can arrive after PostgreSQL committed the INSERT.
      try {
        const [existing] = await this.db.select().from(files).where(eq(files.id, input.id));
        if (existing?.filePath === input.filePath) return existing;
      } catch { /* Keep the disk file when the commit outcome cannot be established. */ }
      const cause = error instanceof Error && error.cause ? error.cause : error;
      const code = typeof cause === "object" && cause !== null && "code" in cause ? String(cause.code) : "";
      const rejectedStatement = /^(22|23|40|42)[A-Z0-9]{3}$/.test(code);
      throw new FilePersistenceError(!rejectedStatement, error);
    }
  }
}
