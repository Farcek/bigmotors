import { sql } from "drizzle-orm";
import { check, foreignKey, index, integer, pgTable, smallint, text, unique, uuid, varchar } from "drizzle-orm/pg-core";
import { AVAILABILITY_STATUSES, PART_CONDITIONS, PART_MOUNTING_POSITIONS, PRICE_UNITS } from "@bigmotors/core";
import { branches } from "./branches.js";
import { enumCheck, idColumn, nonBlank } from "./common.js";
import { products } from "./products.js";
import { partBrands, partCategories, vehicleBrands, vehicleModels } from "./references.js";

export const parts = pgTable("parts", {
  productId: uuid("product_id").primaryKey(), productType: text("product_type", { enum: ["part"] }).notNull().default("part"),
  categoryId: uuid("category_id").references(() => partCategories.id, { onDelete: "restrict" }),
  brandId: uuid("brand_id").references(() => partBrands.id, { onDelete: "restrict" }),
  modelName: varchar("model_name", { length: 255 }), condition: text("condition", { enum: PART_CONDITIONS }),
  sku: text("sku").unique(), partNumber: text("part_number"), mountingPosition: text("mounting_position", { enum: PART_MOUNTING_POSITIONS }),
  priceUnit: text("price_unit", { enum: PRICE_UNITS }), packageDescription: varchar("package_description", { length: 512 }),
  availabilityStatus: text("availability_status", { enum: AVAILABILITY_STATUSES }),
  branchId: uuid("branch_id").references(() => branches.id, { onDelete: "restrict" }),
}, (t) => [
  foreignKey({ name: "parts_product_type_fk", columns: [t.productId, t.productType], foreignColumns: [products.id, products.productType] }).onDelete("restrict"),
  check("parts_type_check", sql`${t.productType} = 'part'`),
  enumCheck("parts_condition_check", t.condition, PART_CONDITIONS), enumCheck("parts_mounting_check", t.mountingPosition, PART_MOUNTING_POSITIONS),
  enumCheck("parts_price_unit_check", t.priceUnit, PRICE_UNITS), enumCheck("parts_availability_check", t.availabilityStatus, AVAILABILITY_STATUSES),
  nonBlank("parts_sku_nonblank", t.sku), index("parts_category_idx").on(t.categoryId), index("parts_brand_idx").on(t.brandId),
  index("parts_number_idx").on(t.partNumber), index("parts_branch_idx").on(t.branchId),
]);

export const partFitments = pgTable("part_fitments", {
  id: idColumn(), productId: uuid("product_id").notNull().references(() => parts.productId, { onDelete: "restrict" }),
  brandId: uuid("brand_id").notNull().references(() => vehicleBrands.id, { onDelete: "restrict" }), modelId: uuid("model_id").notNull(),
  generation: varchar("generation", { length: 255 }), bodyCode: text("body_code"), yearFrom: smallint("year_from"), yearTo: smallint("year_to"),
  engineCode: text("engine_code"), description: varchar("description", { length: 512 }), sortOrder: integer("sort_order").notNull().default(0),
}, (t) => [
  foreignKey({ name: "part_fitments_brand_model_fk", columns: [t.brandId, t.modelId], foreignColumns: [vehicleModels.brandId, vehicleModels.id] }).onDelete("restrict"),
  check("part_fitments_year_order_check", sql`${t.yearFrom} <= ${t.yearTo}`),
  index("part_fitments_product_idx").on(t.productId), index("part_fitments_brand_model_idx").on(t.brandId, t.modelId), index("part_fitments_model_idx").on(t.modelId),
]);
export const partOemNumbers = pgTable("part_oem_numbers", {
  id: idColumn(), productId: uuid("product_id").notNull().references(() => parts.productId, { onDelete: "restrict" }),
  oemNumber: text("oem_number").notNull(), sortOrder: integer("sort_order").notNull().default(0),
}, (t) => [
  unique("part_oem_numbers_product_number_unique").on(t.productId, t.oemNumber),
  index("part_oem_numbers_number_idx").on(t.oemNumber), nonBlank("part_oem_numbers_number_nonblank", t.oemNumber),
]);
export const partSpecifications = pgTable("part_specifications", {
  id: idColumn(), productId: uuid("product_id").notNull().references(() => parts.productId, { onDelete: "restrict" }),
  name: varchar("name", { length: 255 }).notNull(), value: text("value").notNull(), unit: varchar("unit", { length: 255 }),
  sortOrder: integer("sort_order").notNull().default(0),
}, (t) => [index("part_specifications_product_idx").on(t.productId), nonBlank("part_specifications_name_nonblank", t.name), nonBlank("part_specifications_value_nonblank", t.value)]);

export type Part = typeof parts.$inferSelect;
export type NewPart = typeof parts.$inferInsert;
export type PartFitment = typeof partFitments.$inferSelect;
export type NewPartFitment = typeof partFitments.$inferInsert;
