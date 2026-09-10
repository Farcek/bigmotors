import { pgTable, uniqueIndex } from "drizzle-orm/pg-core";
import { nonBlank, normalizedName, referenceColumns } from "./common.js";

export const branches = pgTable("branches", referenceColumns(), (t) => [
  uniqueIndex("branches_name_unique").on(normalizedName(t.name)),
  nonBlank("branches_name_nonblank", t.name),
]);
