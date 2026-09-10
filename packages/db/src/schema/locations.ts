import { pgTable, uniqueIndex } from "drizzle-orm/pg-core";
import { nonBlank, normalizedName, referenceColumns } from "./common.js";

export const locations = pgTable("locations", referenceColumns(), (t) => [
  uniqueIndex("locations_name_unique").on(normalizedName(t.name)),
  nonBlank("locations_name_nonblank", t.name),
]);
