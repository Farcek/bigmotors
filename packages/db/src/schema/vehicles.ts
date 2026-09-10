import { sql } from "drizzle-orm";
import { boolean, check, foreignKey, index, integer, pgTable, primaryKey, smallint, text, uuid, varchar } from "drizzle-orm/pg-core";
import { DRIVETRAINS, FUEL_TYPES, STEERING_POSITIONS, TRANSMISSIONS, VEHICLE_ARRIVAL_STATUSES, VEHICLE_CONDITIONS, VEHICLE_SALE_STATUSES } from "@bigmotors/core";
import { branches } from "./branches.js";
import { enumCheck } from "./common.js";
import { products } from "./products.js";
import { colors, vehicleBodyTypes, vehicleBrands, vehicleFeatures, vehicleModels, vehicleVariants } from "./references.js";

export const vehicles = pgTable("vehicles", {
  productId: uuid("product_id").primaryKey(), productType: text("product_type", { enum: ["vehicle"] }).notNull().default("vehicle"),
  brandId: uuid("brand_id").references(() => vehicleBrands.id, { onDelete: "restrict" }), modelId: uuid("model_id"), variantId: uuid("variant_id"),
  manufactureYear: smallint("manufacture_year"), importYear: smallint("import_year"), vin: text("vin"),
  bodyTypeId: uuid("body_type_id").references(() => vehicleBodyTypes.id, { onDelete: "restrict" }),
  fuelType: text("fuel_type", { enum: FUEL_TYPES }), engineCapacityCc: integer("engine_capacity_cc"),
  transmission: text("transmission", { enum: TRANSMISSIONS }), drivetrain: text("drivetrain", { enum: DRIVETRAINS }),
  steeringPosition: text("steering_position", { enum: STEERING_POSITIONS }),
  exteriorColorId: uuid("exterior_color_id").references(() => colors.id, { onDelete: "restrict" }),
  interiorColorId: uuid("interior_color_id").references(() => colors.id, { onDelete: "restrict" }),
  seatCount: smallint("seat_count"), condition: text("condition", { enum: VEHICLE_CONDITIONS }), mileageKm: integer("mileage_km"),
  branchId: uuid("branch_id").references(() => branches.id, { onDelete: "restrict" }), conditionDescription: varchar("condition_description", { length: 512 }),
  saleStatus: text("sale_status", { enum: VEHICLE_SALE_STATUSES }), arrivalStatus: text("arrival_status", { enum: VEHICLE_ARRIVAL_STATUSES }),
  financingAvailable: boolean("financing_available"),
}, (t) => [
  foreignKey({ name: "vehicles_product_type_fk", columns: [t.productId, t.productType], foreignColumns: [products.id, products.productType] }).onDelete("restrict"),
  check("vehicles_type_check", sql`${t.productType} = 'vehicle'`),
  foreignKey({ name: "vehicles_brand_model_fk", columns: [t.brandId, t.modelId], foreignColumns: [vehicleModels.brandId, vehicleModels.id] }).onDelete("restrict"),
  foreignKey({ name: "vehicles_model_variant_fk", columns: [t.modelId, t.variantId], foreignColumns: [vehicleVariants.modelId, vehicleVariants.id] }).onDelete("restrict"),
  check("vehicles_model_parent_check", sql`${t.modelId} is null or ${t.brandId} is not null`),
  check("vehicles_variant_parent_check", sql`${t.variantId} is null or ${t.modelId} is not null`),
  enumCheck("vehicles_fuel_check", t.fuelType, FUEL_TYPES), enumCheck("vehicles_transmission_check", t.transmission, TRANSMISSIONS),
  enumCheck("vehicles_drivetrain_check", t.drivetrain, DRIVETRAINS), enumCheck("vehicles_steering_check", t.steeringPosition, STEERING_POSITIONS),
  enumCheck("vehicles_condition_check", t.condition, VEHICLE_CONDITIONS), enumCheck("vehicles_sale_check", t.saleStatus, VEHICLE_SALE_STATUSES),
  enumCheck("vehicles_arrival_check", t.arrivalStatus, VEHICLE_ARRIVAL_STATUSES),
  check("vehicles_manufacture_year_check", sql`${t.manufactureYear} >= 1900`), check("vehicles_import_year_check", sql`${t.importYear} >= 1900`),
  check("vehicles_year_order_check", sql`${t.importYear} >= ${t.manufactureYear}`),
  check("vehicles_engine_capacity_check", sql`${t.engineCapacityCc} between 1 and 30000`),
  check("vehicles_electric_engine_check", sql`${t.fuelType} is distinct from 'electric' or ${t.engineCapacityCc} is null`),
  check("vehicles_mileage_check", sql`${t.mileageKm} between 0 and 9999999`), check("vehicles_seats_check", sql`${t.seatCount} between 1 and 100`),
  index("vehicles_brand_model_idx").on(t.brandId, t.modelId), index("vehicles_model_idx").on(t.modelId), index("vehicles_variant_idx").on(t.variantId),
  index("vehicles_year_idx").on(t.manufactureYear), index("vehicles_mileage_idx").on(t.mileageKm), index("vehicles_sale_idx").on(t.saleStatus),
  index("vehicles_body_type_idx").on(t.bodyTypeId), index("vehicles_branch_idx").on(t.branchId),
  index("vehicles_exterior_color_idx").on(t.exteriorColorId), index("vehicles_interior_color_idx").on(t.interiorColorId),
]);
export const vehicleFeatureLinks = pgTable("vehicle_feature_links", {
  productId: uuid("product_id").notNull().references(() => vehicles.productId, { onDelete: "restrict" }),
  featureId: uuid("feature_id").notNull().references(() => vehicleFeatures.id, { onDelete: "restrict" }),
}, (t) => [primaryKey({ columns: [t.productId, t.featureId] }), index("vehicle_feature_links_feature_idx").on(t.featureId)]);

export type Vehicle = typeof vehicles.$inferSelect;
export type NewVehicle = typeof vehicles.$inferInsert;
