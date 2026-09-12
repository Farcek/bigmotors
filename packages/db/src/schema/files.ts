import { sql } from "drizzle-orm";
import { pgTable, text, uuid, varchar } from "drizzle-orm/pg-core";
import { idColumn, nonBlank, timestamps } from "./common.js";

export const files = pgTable("files", {
  id: idColumn(),
  filePath: text("file_path").notNull().unique(),
  originalName: text("original_name").notNull(),
  title: varchar("title", { length: 255 }),
  description: varchar("description", { length: 512 }),
  ...timestamps(),
  usage: uuid("usage").array().notNull().default(sql`'{}'::uuid[]`),
}, (t) => [nonBlank("files_path_nonblank", t.filePath)]);

export type File = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;
