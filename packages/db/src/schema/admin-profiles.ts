import { pgTable, text, varchar } from "drizzle-orm/pg-core";
import { idColumn, nonBlank, timestamps } from "./common.js";

export const adminProfiles = pgTable("admin_profiles", {
  id: idColumn(), userlySub: text("userly_sub").notNull().unique(),
  displayName: varchar("display_name", { length: 255 }), email: text("email"), ...timestamps(),
}, (t) => [nonBlank("admin_profiles_sub_nonblank", t.userlySub)]);

export type AdminProfile = typeof adminProfiles.$inferSelect;
export type NewAdminProfile = typeof adminProfiles.$inferInsert;
