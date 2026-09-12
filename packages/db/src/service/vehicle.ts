import { defineInject, INJECT, TOKEN, Token } from "@napp/di";
import { NappError } from "@napp/error";
import { and, asc, count, desc, eq, getTableColumns, gte, ilike, inArray, lte, notInArray, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { TKN_DB, type BigMotorsDb } from "../db.js";
import { products, productImages, type Product } from "../schema/products.js";
import { vehicles, vehicleFeatureLinks, type Vehicle } from "../schema/vehicles.js";
import { files, type File } from "../schema/files.js";
import { branches } from "../schema/branches.js";
import { locations } from "../schema/locations.js";
import { colors, vehicleBrands, vehicleModels, vehicleVariants, vehicleBodyTypes, vehicleFeatures } from "../schema/references.js";
import {
  vehicleCreateInput, vehicleUpdateInput, vehicleListInput, vehicleProductFields, vehicleDetailFields, vehicleId,
  type CreateVehicleInput, type UpdateVehicleInput, type ListVehiclesParams,
} from "./vehicle-input.js";

export type { CreateVehicleInput, UpdateVehicleInput, ListVehiclesParams } from "./vehicle-input.js";
type Tx = Parameters<Parameters<BigMotorsDb["transaction"]>[0]>[0];
type VehicleRow = Omit<Product, "productType"> & Omit<Vehicle, "productId" | "productType"> & { productType: "vehicle" };
export type VehicleFile = Omit<File, "filePath" | "usage">;
export type VehicleEntity = VehicleRow & {
  mainImage: VehicleFile | null; itemImage: VehicleFile | null;
  images: { id: string; fileId: string; sortOrder: number; file: VehicleFile }[];
  featureIds: string[];
};
export type VehicleListItem = Omit<VehicleEntity, "content" | "internalNote" | "vin" | "images" | "featureIds">;
export interface VehicleListResult { items: VehicleListItem[]; total: number; limit: number; offset: number }
// The owning app validates physical storage without coupling the DB package to disk configuration.
export interface VehicleWriteOptions { verifyFiles?: (records: readonly File[]) => Promise<void> }

function fail(message: string, code = "VEHICLE_INVALID_INPUT", status = 400): never {
  throw new NappError(message, { code, status });
}
function parse<T extends z.ZodType>(schema: T, value: unknown): z.output<T> {
  const result = schema.safeParse(value);
  if (!result.success) fail("Invalid vehicle input.");
  return result.data;
}
function storageError(error: unknown): never {
  if (error instanceof NappError) throw error;
  const cause = error instanceof Error && error.cause ? error.cause : error;
  const code = typeof cause === "object" && cause !== null && "code" in cause ? cause.code : undefined;
  if (code === "23503") fail("A referenced record is missing or changed.", "VEHICLE_REFERENCE_CONFLICT", 409);
  if (code === "23514" || code === "23502" || code === "22003") fail("Vehicle data violates a storage constraint.");
  if (code === "40001" || code === "40P01") fail("Vehicle changed concurrently. Retry the operation.", "VEHICLE_WRITE_CONFLICT", 409);
  throw new NappError("Vehicle storage operation failed.", { code: "VEHICLE_STORAGE_ERROR", status: 500, cause: error });
}
function fileMetadata(row: File): VehicleFile {
  const { filePath, usage, ...metadata } = row;
  return metadata;
}
async function fileMap(tx: Tx, ids: string[]) {
  if (!ids.length) return new Map<string, VehicleFile>();
  const rows = await tx.select().from(files).where(inArray(files.id, [...new Set(ids)]));
  return new Map(rows.map((row) => [row.id, fileMetadata(row)]));
}
function requireFile(map: Map<string, VehicleFile>, id: string): VehicleFile {
  const row = map.get(id);
  if (!row) fail("A referenced file is missing.", "VEHICLE_FILE_NOT_FOUND", 409);
  return row;
}
async function readRow(tx: Tx, id: string, lock = false): Promise<VehicleRow> {
  const query = tx.select().from(products).where(and(eq(products.id, id), eq(products.productType, "vehicle")));
  const [product] = await (lock ? query.for("update") : query);
  if (!product) fail("Vehicle not found.", "VEHICLE_NOT_FOUND", 404);
  const [detail] = await tx.select().from(vehicles).where(eq(vehicles.productId, id));
  if (!detail) fail("Vehicle detail is missing.", "VEHICLE_STORAGE_ERROR", 500);
  const { productId, productType, ...fields } = detail;
  return { ...product, ...fields, productType: "vehicle" };
}
async function readEntity(tx: Tx, id: string): Promise<VehicleEntity> {
  const row = await readRow(tx, id);
  const gallery = await tx.select().from(productImages).where(eq(productImages.productId, id))
    .orderBy(asc(productImages.sortOrder), asc(productImages.id));
  const features = await tx.select().from(vehicleFeatureLinks).where(eq(vehicleFeatureLinks.productId, id)).orderBy(asc(vehicleFeatureLinks.featureId));
  const map = await fileMap(tx, [row.mainImageId, row.itemImageId, ...gallery.map((g) => g.fileId)].filter((v): v is string => v !== null));
  return {
    ...row,
    mainImage: row.mainImageId ? requireFile(map, row.mainImageId) : null,
    itemImage: row.itemImageId ? requireFile(map, row.itemImageId) : null,
    images: gallery.map(({ productId, ...g }) => ({ ...g, file: requireFile(map, g.fileId) })),
    featureIds: features.map((f) => f.featureId),
  };
}

function validateState(row: VehicleRow) {
  parse(vehicleProductFields.strip(), row);
  parse(vehicleDetailFields.strip(), row);
  if (row.importYear !== null && row.manufactureYear !== null && row.importYear < row.manufactureYear) fail("Import year cannot precede manufacture year.");
  if (row.fuelType === "electric" && row.engineCapacityCc !== null) fail("Electric vehicles must have no engine capacity.");
  if (row.modelId && !row.brandId) fail("A model requires a brand.");
  if (row.variantId && !row.modelId) fail("A variant requires a model.");
  if (row.publicationStatus !== "published") return;
  const required = ["mainImageId", "priceDisplayMode", "brandId", "modelId", "manufactureYear", "bodyTypeId", "fuelType",
    "drivetrain", "steeringPosition", "exteriorColorId", "condition", "saleStatus", "arrivalStatus"] as const;
  const missing: string[] = required.filter((key) => row[key] === null);
  if (row.priceDisplayMode === "show_price" && row.price === null) missing.push("price");
  if (row.price !== null && row.currency === null) missing.push("currency");
  if (row.fuelType !== null && row.fuelType !== "electric") {
    if (row.engineCapacityCc === null) missing.push("engineCapacityCc");
    if (row.transmission === null) missing.push("transmission");
  }
  if (row.condition === "used" && row.mileageKm === null) missing.push("mileageKm");
  if (row.arrivalStatus === "in_stock" && row.locationId === null) missing.push("locationId");
  if (missing.length) fail(`Required for publication: ${missing.join(", ")}.`, "VEHICLE_PUBLICATION_INVALID", 409);
}

async function validateReferences(tx: Tx, next: VehicleRow, previous: VehicleRow, input: UpdateVehicleInput) {
  // Clear only retained children invalidated by an explicit parent change; supplied mismatches are errors.
  if (next.modelId) {
    const [model] = await tx.select().from(vehicleModels).where(eq(vehicleModels.id, next.modelId)).for("share");
    if (!model) fail("Vehicle model not found.", "VEHICLE_REFERENCE_NOT_FOUND");
    if (model.brandId !== next.brandId) {
      if (previous.brandId !== next.brandId && input.modelId === undefined) next.modelId = null;
      else fail("Model does not belong to the selected brand.", "VEHICLE_REFERENCE_MISMATCH");
    }
  }
  if (next.variantId) {
    const [variant] = await tx.select().from(vehicleVariants).where(eq(vehicleVariants.id, next.variantId)).for("share");
    if (!variant) fail("Vehicle variant not found.", "VEHICLE_REFERENCE_NOT_FOUND");
    if (variant.modelId !== next.modelId) {
      if (previous.modelId !== next.modelId && input.variantId === undefined) next.variantId = null;
      else fail("Variant does not belong to the selected model.", "VEHICLE_REFERENCE_MISMATCH");
    }
  }
  const changedModel = next.modelId !== null && next.modelId !== previous.modelId;
  const changedVariant = next.variantId !== null && next.variantId !== previous.variantId;
  for (const [key, table] of [
    ["brandId", vehicleBrands], ["modelId", vehicleModels], ["variantId", vehicleVariants],
    ["bodyTypeId", vehicleBodyTypes], ["exteriorColorId", colors], ["interiorColorId", colors],
    ["branchId", branches], ["locationId", locations],
  ] as const) {
    const id = next[key];
    if (!id) continue;
    const [reference] = await tx.select({ id: table.id, isActive: table.isActive }).from(table).where(eq(table.id, id)).for("share");
    if (!reference) fail(`Reference not found: ${key}.`, "VEHICLE_REFERENCE_NOT_FOUND");
    const newSelection = id !== previous[key] || (key === "brandId" && (changedModel || changedVariant)) || (key === "modelId" && changedVariant);
    if (newSelection && !reference.isActive) fail(`Reference is inactive: ${key}.`, "VEHICLE_REFERENCE_INACTIVE", 409);
  }
}

async function lockFiles(tx: Tx, ids: string[], required: Set<string>): Promise<File[]> {
  if (!ids.length) return [];
  const rows = await tx.select().from(files).where(inArray(files.id, [...new Set(ids)]))
    .orderBy(asc(files.id)).for("update");
  const found = new Set(rows.map((row) => row.id));
  if ([...required].some((id) => !found.has(id))) fail("Selected file not found.", "VEHICLE_FILE_NOT_FOUND");
  return rows.filter((row) => required.has(row.id));
}
async function writeVehicle(tx: Tx, previous: VehicleRow, input: UpdateVehicleInput, options: VehicleWriteOptions): Promise<VehicleEntity> {
  const productPatch = vehicleProductFields.partial().strip().parse(input);
  const detailPatch = vehicleDetailFields.partial().strip().parse(input);
  const next: VehicleRow = { ...previous };
  Object.assign(next, Object.fromEntries([...Object.entries(productPatch), ...Object.entries(detailPatch)].filter(([, value]) => value !== undefined)));
  await validateReferences(tx, next, previous, input);
  validateState(next);
  const oldImages = await tx.select().from(productImages).where(eq(productImages.productId, previous.id));
  const oldFeatures = await tx.select().from(vehicleFeatureLinks).where(eq(vehicleFeatureLinks.productId, previous.id));
  const images = input.images ?? oldImages;
  const featureIds = input.featureIds ?? oldFeatures.map((row) => row.featureId);
  const oldFeatureIds = new Set(oldFeatures.map((row) => row.featureId));
  if (featureIds.length) {
    const rows = await tx.select().from(vehicleFeatures).where(inArray(vehicleFeatures.id, featureIds)).orderBy(asc(vehicleFeatures.id)).for("share");
    if (rows.length !== featureIds.length) fail("Selected feature not found.", "VEHICLE_REFERENCE_NOT_FOUND");
    if (rows.some((row) => !row.isActive && !oldFeatureIds.has(row.id))) fail("Selected feature is inactive.", "VEHICLE_REFERENCE_INACTIVE", 409);
  }
  const oldFiles = new Set([previous.mainImageId, previous.itemImageId, ...oldImages.map((i) => i.fileId)].filter((v): v is string => v !== null));
  const newFiles = new Set([next.mainImageId, next.itemImageId, ...images.map((i) => i.fileId)].filter((v): v is string => v !== null));
  const fileIds = [...new Set([...oldFiles, ...newFiles])].sort();
  const activeFiles = await lockFiles(tx, fileIds, newFiles);
  await options.verifyFiles?.(activeFiles);

  await tx.update(products).set({ ...productPatch, updatedAt: new Date() }).where(eq(products.id, previous.id));
  await tx.update(vehicles).set({ ...detailPatch, modelId: next.modelId, variantId: next.variantId }).where(eq(vehicles.productId, previous.id));
  if (input.images !== undefined) {
    await tx.delete(productImages).where(and(eq(productImages.productId, previous.id),
      images.length ? notInArray(productImages.fileId, images.map((i) => i.fileId)) : undefined));
    if (images.length) await tx.insert(productImages).values(images.map((i) => ({ productId: previous.id, fileId: i.fileId, sortOrder: i.sortOrder })))
      .onConflictDoUpdate({ target: [productImages.productId, productImages.fileId], set: { sortOrder: sql`excluded.sort_order` } });
  }
  if (input.featureIds !== undefined) {
    await tx.delete(vehicleFeatureLinks).where(and(eq(vehicleFeatureLinks.productId, previous.id),
      featureIds.length ? notInArray(vehicleFeatureLinks.featureId, featureIds) : undefined));
    if (featureIds.length) await tx.insert(vehicleFeatureLinks).values(featureIds.map((featureId) => ({ productId: previous.id, featureId }))).onConflictDoNothing();
  }
  // Files are locked in UUID order. Atomic array operations never overwrite another consumer's usage.
  for (const id of fileIds) {
    const usage = newFiles.has(id)
      ? sql`array_append(array_remove(${files.usage}, ${previous.id}::uuid), ${previous.id}::uuid)`
      : sql`array_remove(${files.usage}, ${previous.id}::uuid)`;
    await tx.update(files).set({ usage }).where(and(eq(files.id, id), sql`${files.usage} is distinct from ${usage}`));
  }
  return readEntity(tx, previous.id);
}

export class VehicleService {
  static [TOKEN] = Token.create<VehicleService>("VehicleService");
  static [INJECT] = defineInject(VehicleService, [TKN_DB] as const);
  constructor(private readonly db: BigMotorsDb) {}

  async get(id: string): Promise<VehicleEntity> {
    const key = parse(vehicleId, id);
    try { return await this.db.transaction((tx) => readEntity(tx, key), { isolationLevel: "repeatable read", accessMode: "read only" }); }
    catch (error) { storageError(error); }
  }
  async create(param: CreateVehicleInput, options: VehicleWriteOptions = {}): Promise<VehicleEntity> {
    const input = parse(vehicleCreateInput, param);
    try {
      return await this.db.transaction(async (tx) => {
        const [product] = await tx.insert(products).values({ title: input.title, productType: "vehicle" }).returning();
        if (!product) throw new Error("Product insert returned no row.");
        await tx.insert(vehicles).values({ productId: product.id });
        return writeVehicle(tx, await readRow(tx, product.id, true), input, options);
      });
    } catch (error) { storageError(error); }
  }
  async update(id: string, param: UpdateVehicleInput, options: VehicleWriteOptions = {}): Promise<VehicleEntity> {
    const key = parse(vehicleId, id);
    const parsed = parse(vehicleUpdateInput, param);
    const input = Object.fromEntries(Object.entries(parsed).filter(([, value]) => value !== undefined)) as UpdateVehicleInput;
    try { return await this.db.transaction(async (tx) => writeVehicle(tx, await readRow(tx, key, true), input, options)); }
    catch (error) { storageError(error); }
  }
  async publish(id: string, options: VehicleWriteOptions = {}) { return this.transition(id, "publish", options); }
  async hide(id: string) { return this.transition(id, "hide"); }
  async archive(id: string) { return this.transition(id, "archive"); }
  async restore(id: string) { return this.transition(id, "restore"); }
  private async transition(id: string, action: "publish" | "hide" | "archive" | "restore", options: VehicleWriteOptions = {}): Promise<VehicleEntity> {
    const key = parse(vehicleId, id);
    const transitions = {
      publish: { from: ["draft", "hidden"], to: "published" }, hide: { from: ["published"], to: "hidden" },
      archive: { from: ["draft", "hidden", "published"], to: "archived" }, restore: { from: ["archived"], to: "hidden" },
    } as const;
    try {
      return await this.db.transaction(async (tx) => {
        const previous = await readRow(tx, key, true);
        const transition = transitions[action];
        if (!(transition.from as readonly string[]).includes(previous.publicationStatus)) fail("Invalid vehicle publication transition.", "VEHICLE_INVALID_TRANSITION", 409);
        if (action === "publish") {
          validateState({ ...previous, publicationStatus: "published" });
          const images = await tx.select().from(productImages).where(eq(productImages.productId, key));
          const ids = [previous.mainImageId, previous.itemImageId, ...images.map((i) => i.fileId)].filter((v): v is string => v !== null);
          const records = await lockFiles(tx, ids, new Set(ids));
          await options.verifyFiles?.(records);
        }
        await tx.update(products).set({ publicationStatus: transition.to }).where(eq(products.id, key));
        return readEntity(tx, key);
      });
    } catch (error) { storageError(error); }
  }

  async list(param: ListVehiclesParams = {}): Promise<VehicleListResult> {
    const input = parse(vehicleListInput, param);
    const conditions: (SQL | undefined)[] = [eq(products.productType, "vehicle")];
    for (const key of ["publicationStatus", "isFeatured", "priceDisplayMode"] as const) {
      if (input[key] !== undefined) conditions.push(eq(products[key], input[key]));
    }
    for (const key of ["brandId", "modelId", "variantId", "bodyTypeId", "branchId", "locationId", "condition", "saleStatus", "arrivalStatus", "fuelType", "transmission", "drivetrain", "steeringPosition"] as const) {
      if (input[key] !== undefined) conditions.push(eq(vehicles[key], input[key]));
    }
    for (const [column, min, max] of [
      [products.price, input.priceMin, input.priceMax], [vehicles.manufactureYear, input.manufactureYearMin, input.manufactureYearMax],
      [vehicles.mileageKm, input.mileageKmMin, input.mileageKmMax],
    ] as const) {
      if (min !== undefined) conditions.push(gte(column, min));
      if (max !== undefined) conditions.push(lte(column, max));
    }
    if (input.search) {
      const pattern = `%${input.search.replace(/[\\%_]/g, "\\$&")}%`;
      conditions.push(or(...[products.title, products.itemTitle, vehicleBrands.name, vehicleModels.name, vehicleVariants.name].map((column) => ilike(column, pattern))));
    }
    const order = {
      created_desc: desc(products.createdAt), updated_desc: desc(products.updatedAt), title_asc: asc(products.title),
      price_asc: sql`${products.price} asc nulls last`, price_desc: sql`${products.price} desc nulls last`,
      year_desc: sql`${vehicles.manufactureYear} desc nulls last`, mileage_asc: sql`${vehicles.mileageKm} asc nulls last`,
    }[input.sort];
    const { content, internalNote, ...productColumns } = getTableColumns(products);
    const { productId, productType, vin, ...detailColumns } = getTableColumns(vehicles);
    try {
      return await this.db.transaction(async (tx) => {
        const where = and(...conditions);
        const [totalRow] = await tx.select({ total: count() }).from(products)
          .innerJoin(vehicles, eq(vehicles.productId, products.id))
          .leftJoin(vehicleBrands, eq(vehicleBrands.id, vehicles.brandId))
          .leftJoin(vehicleModels, eq(vehicleModels.id, vehicles.modelId))
          .leftJoin(vehicleVariants, eq(vehicleVariants.id, vehicles.variantId)).where(where);
        const rows = await tx.select({ ...productColumns, ...detailColumns }).from(products)
          .innerJoin(vehicles, eq(vehicles.productId, products.id))
          .leftJoin(vehicleBrands, eq(vehicleBrands.id, vehicles.brandId))
          .leftJoin(vehicleModels, eq(vehicleModels.id, vehicles.modelId))
          .leftJoin(vehicleVariants, eq(vehicleVariants.id, vehicles.variantId)).where(where)
          .orderBy(order, asc(products.id)).limit(input.limit).offset(input.offset);
        const map = await fileMap(tx, rows.flatMap((row) => [row.mainImageId, row.itemImageId]).filter((v): v is string => v !== null));
        return {
          items: rows.map((row) => ({ ...row, productType: "vehicle" as const,
            mainImage: row.mainImageId ? requireFile(map, row.mainImageId) : null,
            itemImage: row.itemImageId ? requireFile(map, row.itemImageId) : null,
          })), total: totalRow?.total ?? 0, limit: input.limit, offset: input.offset,
        };
      }, { isolationLevel: "repeatable read", accessMode: "read only" });
    } catch (error) { storageError(error); }
  }
}
