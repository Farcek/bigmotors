import { sql } from "drizzle-orm";
import { bigint, boolean, check, index, integer, pgTable, text, timestamp, unique, uuid, varchar, type AnyPgColumn, type PgTableExtraConfigValue } from "drizzle-orm/pg-core";
import { CATALOG_LIMITS, CURRENCIES, PRICE_DISPLAY_MODES, PRODUCT_TYPES, PUBLICATION_STATUSES } from "@bigmotors/core";
import { enumCheck, idColumn, nonBlank, nonNegative, timestamps } from "./common.js";
import { files } from "./files.js";

export const products = pgTable("products", {
  id: idColumn(), productType: text("product_type", { enum: PRODUCT_TYPES }).notNull(),
  title: varchar("title", { length: 255 }).notNull(), description: varchar("description", { length: 512 }),
  content: text("content"), mainImageId: uuid("main_image_id").references(() => files.id, { onDelete: "restrict" }),
  itemTitle: varchar("item_title", { length: 255 }), itemDesc: varchar("item_desc", { length: 512 }), itemImageId: uuid("item_image_id").references(() => files.id, { onDelete: "restrict" }),
  price: bigint("price", { mode: "number" }), currency: text("currency", { enum: CURRENCIES }),
  priceDisplayMode: text("price_display_mode", { enum: PRICE_DISPLAY_MODES }),
  publicationStatus: text("publication_status", { enum: PUBLICATION_STATUSES }).notNull().default("draft"),
  isFeatured: boolean("is_featured").notNull().default(false), internalNote: text("internal_note"),
  firstPublishedAt: timestamp("first_published_at", { withTimezone: true }), ...timestamps(),
}, (t): PgTableExtraConfigValue[] => [
  unique("products_id_type_unique").on(t.id, t.productType),
  enumCheck("products_type_check", t.productType, PRODUCT_TYPES),
  enumCheck("products_currency_check", t.currency, CURRENCIES),
  enumCheck("products_price_mode_check", t.priceDisplayMode, PRICE_DISPLAY_MODES),
  enumCheck("products_publication_check", t.publicationStatus, PUBLICATION_STATUSES),
  nonBlank("products_title_nonblank", t.title),
  check("products_price_range", sql`${t.price} between ${sql.raw(String(CATALOG_LIMITS.priceMin))} and ${sql.raw(String(CATALOG_LIMITS.priceMax))}`),
  check("products_published_required", sql`${t.publicationStatus} <> 'published' or (${t.mainImageId} is not null and ${t.priceDisplayMode} is not null and ${t.firstPublishedAt} is not null and (${t.priceDisplayMode} <> 'show_price' or ${t.price} is not null) and (${t.price} is null or ${t.currency} is not null))`),
  index("products_published_idx").on(t.productType, t.firstPublishedAt.desc(), t.id).where(sql`${t.publicationStatus} = 'published'`),
  index("products_public_price_idx").on(t.productType, t.price, t.id).where(sql`${t.publicationStatus} = 'published' and ${t.priceDisplayMode} = 'show_price'`),
  index("products_main_image_idx").on(t.mainImageId), index("products_item_image_idx").on(t.itemImageId),
]);

export const productImages = pgTable("product_images", {
  id: idColumn(), productId: uuid("product_id").notNull().references((): AnyPgColumn => products.id, { onDelete: "restrict" }),
  fileId: uuid("file_id").notNull().references(() => files.id, { onDelete: "restrict" }),
  sortOrder: integer("sort_order").notNull().default(0),
}, (t) => [
  unique("product_images_product_file_unique").on(t.productId, t.fileId),
  index("product_images_file_idx").on(t.fileId),
  index("product_images_order_idx").on(t.productId, t.sortOrder, t.id),
  nonNegative("product_images_sort_order_check", t.sortOrder),
]);

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type ProductImage = typeof productImages.$inferSelect;
export type NewProductImage = typeof productImages.$inferInsert;
