import { PAGE_STATUSES, type JsonObject, type PageStatus } from "@bigmotors/core";
import { sql } from "drizzle-orm";
import { check, index, jsonb, pgTable, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { enumCheck, idColumn, nonBlank, timestamps } from "./common.js";
import { files } from "./files.js";

export const pages = pgTable("pages", {
  id: idColumn(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull(),
  description: varchar("description", { length: 512 }),
  mainImageId: uuid("main_image_id").references(() => files.id, { onDelete: "restrict" }),
  meta: jsonb("meta").$type<JsonObject>().notNull().default({}),
  content: jsonb("content").$type<JsonObject>().notNull().default({}),
  status: varchar("status", { length: 16 }).$type<PageStatus>().notNull().default("draft"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  ...timestamps(),
}, (t) => [
  nonBlank("pages_title_nonblank", t.title),
  uniqueIndex("pages_slug_unique").on(t.slug),
  check("pages_slug_format", sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
  enumCheck("pages_status_valid", t.status, PAGE_STATUSES),
  check("pages_meta_object", sql`jsonb_typeof(${t.meta}) = 'object'`),
  check("pages_content_object", sql`jsonb_typeof(${t.content}) = 'object'`),
  check("pages_published_content", sql`${t.status} <> 'published' OR (${t.content} <> '{}'::jsonb AND ${t.publishedAt} IS NOT NULL)`),
  index("pages_status_idx").on(t.status, t.updatedAt, t.id),
  index("pages_main_image_idx").on(t.mainImageId),
]);
export type Page = typeof pages.$inferSelect;
