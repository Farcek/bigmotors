import { CATALOG_LIMITS } from "@bigmotors/core";
import { z } from "zod";

const integer = z.number().int().min(-2_147_483_648).max(2_147_483_647);
const queryNumber = z.union([z.number(), z.string().regex(/^\d+$/).transform(Number)]);
export const queryBoolean = z.union([z.boolean(), z.enum(["true", "false"]).transform((value) => value === "true")]);

export const idParams = z.object({ id: z.string().uuid() }).strict();
export const referenceListQuery = z.object({
  limit: queryNumber.pipe(z.number().int().min(1).max(100)).default(50),
  offset: queryNumber.pipe(integer.min(0)).default(0),
  isActive: queryBoolean.optional(),
}).strict();

export const referenceCreateFields = {
  name: z.string().trim().min(1).max(CATALOG_LIMITS.title),
  description: z.string().trim().max(CATALOG_LIMITS.description)
    .transform((value) => value === "" ? null : value).nullable().optional(),
  sortOrder: integer.optional(),
  isActive: z.boolean().optional(),
};

export const referenceEntityFields = {
  id: z.string().uuid(),
  name: z.string().min(1).max(CATALOG_LIMITS.title),
  description: z.string().max(CATALOG_LIMITS.description).nullable(),
  sortOrder: integer,
  isActive: z.boolean(),
  // Wire values are ISO strings; server handlers serialize DB Date values.
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
};
