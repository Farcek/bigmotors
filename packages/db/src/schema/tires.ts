import { sql } from "drizzle-orm";
import { boolean, check, foreignKey, index, integer, numeric, pgTable, text, unique, uuid, varchar } from "drizzle-orm/pg-core";
import { AVAILABILITY_STATUSES, PRICE_UNITS, TIRE_APPLICATIONS, TIRE_CONDITIONS, TIRE_CONSTRUCTIONS, TIRE_SEASONS, TIRE_STUD_TYPES, TIRE_TREAD_TYPES } from "@bigmotors/core";
import { branches } from "./branches.js";
import { enumCheck, idColumn, nonBlank } from "./common.js";
import { products } from "./products.js";
import { tireBrands, tireModels } from "./references.js";

export const tires = pgTable("tires", {
  productId: uuid("product_id").primaryKey(), productType: text("product_type", { enum: ["tire"] }).notNull().default("tire"),
  brandId: uuid("brand_id").references(() => tireBrands.id, { onDelete: "restrict" }), modelId: uuid("model_id"),
  sku: text("sku").unique(), manufacturerCode: text("manufacturer_code"), condition: text("condition", { enum: TIRE_CONDITIONS }),
  widthMm: integer("width_mm"), aspectRatio: numeric("aspect_ratio", { precision: 5, scale: 2 }),
  rimDiameterInch: numeric("rim_diameter_inch", { precision: 5, scale: 2 }), construction: text("construction", { enum: TIRE_CONSTRUCTIONS }),
  sizeLabel: text("size_label"), season: text("season", { enum: TIRE_SEASONS }), vehicleApplication: text("vehicle_application", { enum: TIRE_APPLICATIONS }),
  treadType: text("tread_type", { enum: TIRE_TREAD_TYPES }), loadIndex: text("load_index"), speedIndex: text("speed_index"), loadMarking: text("load_marking"),
  isRunFlat: boolean("is_run_flat"), studType: text("stud_type", { enum: TIRE_STUD_TYPES }),
  priceUnit: text("price_unit", { enum: PRICE_UNITS }), packageDescription: varchar("package_description", { length: 512 }),
  availabilityStatus: text("availability_status", { enum: AVAILABILITY_STATUSES }), branchId: uuid("branch_id").references(() => branches.id, { onDelete: "restrict" }),
}, (t) => [
  foreignKey({ name: "tires_product_type_fk", columns: [t.productId, t.productType], foreignColumns: [products.id, products.productType] }).onDelete("restrict"),
  check("tires_type_check", sql`${t.productType} = 'tire'`),
  foreignKey({ name: "tires_brand_model_fk", columns: [t.brandId, t.modelId], foreignColumns: [tireModels.brandId, tireModels.id] }).onDelete("restrict"),
  check("tires_model_parent_check", sql`${t.modelId} is null or ${t.brandId} is not null`),
  enumCheck("tires_condition_check", t.condition, TIRE_CONDITIONS), enumCheck("tires_construction_check", t.construction, TIRE_CONSTRUCTIONS),
  enumCheck("tires_season_check", t.season, TIRE_SEASONS), enumCheck("tires_application_check", t.vehicleApplication, TIRE_APPLICATIONS),
  enumCheck("tires_tread_check", t.treadType, TIRE_TREAD_TYPES), enumCheck("tires_stud_check", t.studType, TIRE_STUD_TYPES),
  enumCheck("tires_price_unit_check", t.priceUnit, PRICE_UNITS), enumCheck("tires_availability_check", t.availabilityStatus, AVAILABILITY_STATUSES),
  check("tires_width_check", sql`${t.widthMm} > 0`),
  check("tires_aspect_ratio_check", sql`${t.aspectRatio} > 0 and ${t.aspectRatio} <= 100`),
  check("tires_rim_diameter_check", sql`${t.rimDiameterInch} > 0 and ${t.rimDiameterInch} < 'Infinity'::numeric and ${t.rimDiameterInch} <> 'NaN'::numeric`),
  nonBlank("tires_sku_nonblank", t.sku),
  index("tires_brand_model_idx").on(t.brandId, t.modelId), index("tires_model_idx").on(t.modelId),
  index("tires_size_idx").on(t.widthMm, t.aspectRatio, t.rimDiameterInch), index("tires_season_idx").on(t.season), index("tires_branch_idx").on(t.branchId),
]);
export const tireMarkings = pgTable("tire_markings", {
  id: idColumn(), productId: uuid("product_id").notNull().references(() => tires.productId, { onDelete: "restrict" }),
  marking: text("marking").notNull(), description: varchar("description", { length: 512 }), sortOrder: integer("sort_order").notNull().default(0),
}, (t) => [unique("tire_markings_product_marking_unique").on(t.productId, t.marking), nonBlank("tire_markings_marking_nonblank", t.marking)]);

export type Tire = typeof tires.$inferSelect;
export type NewTire = typeof tires.$inferInsert;
