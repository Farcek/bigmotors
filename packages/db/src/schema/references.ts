import { sql } from "drizzle-orm";
import { check, index, pgTable, unique, uniqueIndex, uuid, type AnyPgColumn } from "drizzle-orm/pg-core";
import { nonBlank, normalizedName, referenceColumns } from "./common.js";

export const vehicleBrands = pgTable("vehicle_brands", referenceColumns(), (t) => [
  uniqueIndex("vehicle_brands_name_unique").on(normalizedName(t.name)), nonBlank("vehicle_brands_name_nonblank", t.name),
]);
export const vehicleModels = pgTable("vehicle_models", {
  ...referenceColumns(), brandId: uuid("brand_id").notNull().references(() => vehicleBrands.id, { onDelete: "restrict" }),
}, (t) => [
  unique("vehicle_models_brand_id_id_unique").on(t.brandId, t.id),
  uniqueIndex("vehicle_models_brand_name_unique").on(t.brandId, normalizedName(t.name)),
  nonBlank("vehicle_models_name_nonblank", t.name),
]);
export const vehicleVariants = pgTable("vehicle_variants", {
  ...referenceColumns(), modelId: uuid("model_id").notNull().references(() => vehicleModels.id, { onDelete: "restrict" }),
}, (t) => [
  unique("vehicle_variants_model_id_id_unique").on(t.modelId, t.id),
  uniqueIndex("vehicle_variants_model_name_unique").on(t.modelId, normalizedName(t.name)),
  nonBlank("vehicle_variants_name_nonblank", t.name),
]);
export const vehicleBodyTypes = pgTable("vehicle_body_types", referenceColumns(), (t) => [
  uniqueIndex("vehicle_body_types_name_unique").on(normalizedName(t.name)), nonBlank("vehicle_body_types_name_nonblank", t.name),
]);
export const colors = pgTable("colors", referenceColumns(), (t) => [
  uniqueIndex("colors_name_unique").on(normalizedName(t.name)), nonBlank("colors_name_nonblank", t.name),
]);
export const vehicleFeatures = pgTable("vehicle_features", referenceColumns(), (t) => [
  uniqueIndex("vehicle_features_name_unique").on(normalizedName(t.name)), nonBlank("vehicle_features_name_nonblank", t.name),
]);
export const partCategories = pgTable("part_categories", {
  ...referenceColumns(),
  parentId: uuid("parent_id").references((): AnyPgColumn => partCategories.id, { onDelete: "restrict" }),
}, (t) => [
  uniqueIndex("part_categories_root_name_unique").on(normalizedName(t.name)).where(sql`${t.parentId} is null`),
  uniqueIndex("part_categories_parent_name_unique").on(t.parentId, normalizedName(t.name)).where(sql`${t.parentId} is not null`),
  index("part_categories_parent_idx").on(t.parentId),
  check("part_categories_not_self", sql`${t.parentId} is null or ${t.parentId} <> ${t.id}`),
  nonBlank("part_categories_name_nonblank", t.name),
]);
export const partBrands = pgTable("part_brands", referenceColumns(), (t) => [
  uniqueIndex("part_brands_name_unique").on(normalizedName(t.name)), nonBlank("part_brands_name_nonblank", t.name),
]);
export const tireBrands = pgTable("tire_brands", referenceColumns(), (t) => [
  uniqueIndex("tire_brands_name_unique").on(normalizedName(t.name)), nonBlank("tire_brands_name_nonblank", t.name),
]);
export const tireModels = pgTable("tire_models", {
  ...referenceColumns(), brandId: uuid("brand_id").notNull().references(() => tireBrands.id, { onDelete: "restrict" }),
}, (t) => [
  unique("tire_models_brand_id_id_unique").on(t.brandId, t.id),
  uniqueIndex("tire_models_brand_name_unique").on(t.brandId, normalizedName(t.name)),
  nonBlank("tire_models_name_nonblank", t.name),
]);
