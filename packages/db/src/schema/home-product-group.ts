import { sql } from "drizzle-orm";
import { boolean, check, index, integer, jsonb, pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import type { VehicleFilters } from "@bigmotors/core";
import { idColumn, nonBlank, timestamps } from "./common.js";
import { files } from "./files.js";

export const homeProductGroup = pgTable("home_product_group", {
  id: idColumn(),
  title: varchar("title", { length: 255 }).notNull(),
  description: varchar("description", { length: 512 }),
  imageId: uuid("image_id").references(() => files.id, { onDelete: "restrict" }),
  filters: jsonb("filters").$type<VehicleFilters>().notNull().default({}),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps(),
}, (t) => [
  nonBlank("home_product_group_title_nonblank", t.title),
  check("home_product_group_filters_object", sql`jsonb_typeof(${t.filters}) = 'object'`),
  index("home_product_group_order_idx").on(t.isActive, t.sortOrder, t.id),
  index("home_product_group_image_idx").on(t.imageId),
]);
export type HomeProductGroup = typeof homeProductGroup.$inferSelect;
