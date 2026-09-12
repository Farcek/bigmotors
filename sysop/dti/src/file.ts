import { CATALOG_LIMITS } from "@bigmotors/core";
import { z } from "zod";

export namespace Files {
  // Multipart uses a dedicated Express adapter, not the JSON DTI envelope.
  export const uploadRoute = {
    method: "POST", path: "/files/upload", field: "file",
  } as const;
  export const uploadMetadata = z.object({
    title: z.string().trim().max(CATALOG_LIMITS.title).transform((value) => value || null).optional(),
    description: z.string().trim().max(CATALOG_LIMITS.description).transform((value) => value || null).optional(),
  }).strict();
  export const uploadResult = z.object({
    id: z.string().uuid(), originalName: z.string(),
    title: z.string().max(CATALOG_LIMITS.title).nullable(),
    description: z.string().max(CATALOG_LIMITS.description).nullable(),
    createdAt: z.string().datetime({ offset: true }), updatedAt: z.string().datetime({ offset: true }),
  }).strict();
  export const uploadError = z.object({
    error: z.object({ code: z.string(), message: z.string() }).strict(),
  }).strict();
  export type UploadMetadata = z.input<typeof uploadMetadata>;
  export type UploadResult = z.infer<typeof uploadResult>;
}
