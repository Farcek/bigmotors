import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const branchStatus = pgEnum("branch_status", ["active", "inactive"]);

export const branches = pgTable("branches", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  code: text("code").unique(),
  status: branchStatus("status").notNull().default("active"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  managerId: uuid("manager_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});
