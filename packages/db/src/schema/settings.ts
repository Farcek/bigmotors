import { pgTable, varchar } from "drizzle-orm/pg-core";
import { nonBlank } from "./common.js";

export const settings = pgTable("settings", {
  key: varchar("key", { length: 255 }).primaryKey(),
  value: varchar("value", { length: 255 }).notNull(),
}, t => [nonBlank("settings_key_nonblank", t.key)]);
export type Setting = typeof settings.$inferSelect;
