import { index, integer, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { idColumn, nonBlank } from "./common.js";
import { files } from "./files.js";

const dates = () => ({
  created: timestamp("created", { withTimezone: true }).notNull().defaultNow(),
  updated: timestamp("updated", { withTimezone: true }).notNull().defaultNow(),
});

export const gallery = pgTable("gallery", {
  id: idColumn(),
  key: varchar("key", { length: 255 }).notNull().unique("gallery_key_unique"),
  name: varchar("name", { length: 255 }).notNull(),
  desc: varchar("desc", { length: 512 }),
  ...dates(),
}, (t) => [nonBlank("gallery_name_nonblank", t.name), nonBlank("gallery_key_nonblank", t.key)]);

export const galleryItem = pgTable("gallery_item", {
  id: idColumn(),
  galleryId: uuid("gallery_id").notNull().references(() => gallery.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").notNull().default(0),
  ...dates(),
  title: varchar("title", { length: 255 }),
  label: varchar("label", { length: 255 }),
  desc: varchar("desc", { length: 512 }),
  imageId: uuid("image_id").notNull().references(() => files.id, { onDelete: "restrict" }),
}, (t) => [
  index("gallery_item_order_idx").on(t.galleryId, t.sortOrder, t.id),
  index("gallery_item_image_idx").on(t.imageId),
]);

export type Gallery = typeof gallery.$inferSelect;
export type GalleryItem = typeof galleryItem.$inferSelect;
