import { sql } from "drizzle-orm";
import { boolean, check, integer, timestamp, uuid, varchar, type AnyPgColumn } from "drizzle-orm/pg-core";
import { CATALOG_LIMITS } from "@bigmotors/core";

export const idColumn = () => uuid("id").defaultRandom().primaryKey();
export const timestamps = () => ({
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
export const referenceColumns = () => ({
  id: idColumn(), name: varchar("name", { length: CATALOG_LIMITS.title }).notNull(),
  description: varchar("description", { length: CATALOG_LIMITS.description }),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true), ...timestamps(),
});
export function enumCheck(name: string, column: AnyPgColumn, values: readonly string[]) {
  // DDL must contain literals, not query parameters. Values come from core constants.
  const literals = values.map((value) => sql.raw(`'${value.replaceAll("'", "''")}'`));
  return check(name, sql`${column} in (${sql.join(literals, sql`, `)})`);
}
export const nonBlank = (name: string, column: AnyPgColumn) => check(name, sql`length(btrim(${column})) > 0`);
export const nonNegative = (name: string, column: AnyPgColumn) => check(name, sql`${column} >= 0`);
export const normalizedName = (column: AnyPgColumn) => sql`lower(btrim(${column}))`;
