import {
  CATALOG_LIMITS, CURRENCIES, DRIVETRAINS, FUEL_TYPES, PRICE_DISPLAY_MODES,
  PUBLICATION_STATUSES, STEERING_POSITIONS, TRANSMISSIONS,
  VEHICLE_ARRIVAL_STATUSES, VEHICLE_CONDITIONS, VEHICLE_SALE_STATUSES, getYouTubeVideoUrl,
} from "@bigmotors/core";
import { createAction } from "@napp/dti-core";
import { z } from "zod";
import { idParams, queryBoolean, referenceListQuery } from "./common.js";
import { Files } from "./file.js";

const uuid = z.string().uuid();
const title = z.string().min(1).max(CATALOG_LIMITS.title);
const shortText = z.string().max(CATALOG_LIMITS.description);
const year = z.number().int().min(CATALOG_LIMITS.yearMin).max(32_767);
const inputYear = year.refine((value) => value <= new Date().getUTCFullYear(), "Year cannot be in the future.");
const price = z.number().int().min(CATALOG_LIMITS.priceMin).max(CATALOG_LIMITS.priceMax);
const mileage = z.number().int().min(CATALOG_LIMITS.mileageMin).max(CATALOG_LIMITS.mileageMax);
const sortOrder = z.number().int().min(0).max(2_147_483_647);
const optionalText = (max: number) => z.string().trim().max(max)
  .transform((value) => value || null).nullable().optional();
const uniqueIds = z.array(uuid).refine((values) => new Set(values).size === values.length, "Duplicate IDs are not allowed.");

const vehicleFields = {
  brandId: uuid.nullable(), modelId: uuid.nullable(), variantId: uuid.nullable(),
  manufactureYear: year.nullable(), importYear: year.nullable(), vin: z.string().nullable(),
  bodyTypeId: uuid.nullable(), fuelType: z.enum(FUEL_TYPES).nullable(),
  engineCapacityCc: z.number().int().min(CATALOG_LIMITS.engineCapacityMin).max(CATALOG_LIMITS.engineCapacityMax).nullable(),
  transmission: z.enum(TRANSMISSIONS).nullable(), drivetrain: z.enum(DRIVETRAINS).nullable(),
  steeringPosition: z.enum(STEERING_POSITIONS).nullable(),
  exteriorColorId: uuid.nullable(), interiorColorId: uuid.nullable(),
  seatCount: z.number().int().min(CATALOG_LIMITS.seatsMin).max(CATALOG_LIMITS.seatsMax).nullable(),
  condition: z.enum(VEHICLE_CONDITIONS).nullable(), mileageKm: mileage.nullable(),
  branchId: uuid.nullable(), locationId: uuid.nullable(), conditionDescription: shortText.nullable(),
  saleStatus: z.enum(VEHICLE_SALE_STATUSES).nullable(), arrivalStatus: z.enum(VEHICLE_ARRIVAL_STATUSES).nullable(),
  financingAvailable: z.boolean().nullable(),
  youtubeUrl: z.string().max(2048).nullable(),
};

export namespace Vehicles {
  export const imageInput = z.object({ fileId: uuid, sortOrder }).strict();
  export const imagesInput = z.array(imageInput).refine(
    (values) => new Set(values.map((value) => value.fileId)).size === values.length,
    "A file can occur only once in the gallery.",
  );
  export const image = imageInput.extend({ id: uuid, file: Files.uploadResult }).strict();

  export const entity = z.object({
    id: uuid, productType: z.literal("vehicle"), title,
    description: shortText.nullable(), content: z.string().nullable(),
    mainImageId: uuid.nullable(), itemTitle: z.string().max(CATALOG_LIMITS.title).nullable(),
    itemDesc: shortText.nullable(), itemImageId: uuid.nullable(),
    price: price.nullable(), currency: z.enum(CURRENCIES).nullable(),
    priceDisplayMode: z.enum(PRICE_DISPLAY_MODES).nullable(),
    publicationStatus: z.enum(PUBLICATION_STATUSES), isFeatured: z.boolean(), internalNote: z.string().nullable(),
    firstPublishedAt: z.string().datetime({ offset: true }).nullable(),
    createdAt: z.string().datetime({ offset: true }), updatedAt: z.string().datetime({ offset: true }),
    ...vehicleFields,
    mainImage: Files.uploadResult.nullable(), itemImage: Files.uploadResult.nullable(),
    images: z.array(image), featureIds: uniqueIds,
  }).strict();

  const writable = z.object({
    ...vehicleFields,
    title: z.string().trim().min(1).max(CATALOG_LIMITS.title), description: optionalText(CATALOG_LIMITS.description),
    content: z.string().nullable(), mainImageId: uuid.nullable(),
    itemTitle: optionalText(CATALOG_LIMITS.title), itemDesc: optionalText(CATALOG_LIMITS.description), itemImageId: uuid.nullable(),
    price: price.nullable(), currency: z.enum(CURRENCIES).nullable(), priceDisplayMode: z.enum(PRICE_DISPLAY_MODES).nullable(),
    isFeatured: z.boolean(), internalNote: z.string().nullable(),
    manufactureYear: inputYear.nullable(), importYear: inputYear.nullable(),
    conditionDescription: optionalText(CATALOG_LIMITS.description),
    youtubeUrl: optionalText(2048).refine((value) => value == null || getYouTubeVideoUrl(value) !== null, "YouTube video URL is required."),
    images: imagesInput, featureIds: uniqueIds,
  }).strict().partial();

  // Partial PATCH values cannot establish validity of the persisted, merged vehicle.
  function checkProvidedFields(value: z.infer<typeof writable>, ctx: z.RefinementCtx) {
    if (value.manufactureYear != null && value.importYear != null && value.importYear < value.manufactureYear) {
      ctx.addIssue({ code: "custom", path: ["importYear"], message: "Import year cannot precede manufacture year." });
    }
    if (value.fuelType === "electric" && value.engineCapacityCc != null) {
      ctx.addIssue({ code: "custom", path: ["engineCapacityCc"], message: "Electric vehicles must have no engine capacity." });
    }
  }
  export const createBody = writable.required({ title: true }).superRefine((value, ctx) => {
    checkProvidedFields(value, ctx);
    if (value.modelId != null && value.brandId == null) {
      ctx.addIssue({ code: "custom", path: ["brandId"], message: "A model requires a brand." });
    }
    if (value.variantId != null && value.modelId == null) {
      ctx.addIssue({ code: "custom", path: ["modelId"], message: "A variant requires a model." });
    }
  });
  export const updateBody = writable.superRefine(checkProvidedFields).refine(
    (value) => Object.values(value).some((field) => field !== undefined), "At least one field is required.",
  );
  export const params = idParams;
  export const sort = z.enum(["created_desc", "updated_desc", "title_asc", "price_asc", "price_desc", "year_desc", "mileage_asc"]);
  const queryNumber = (schema: z.ZodNumber) =>
    z.union([z.number(), z.string().regex(/^\d+$/).transform(Number)]).pipe(schema).optional();
  export const listQuery = referenceListQuery.omit({ isActive: true }).extend({
    search: z.string().trim().min(1).max(CATALOG_LIMITS.title).optional(),
    publicationStatus: z.enum(PUBLICATION_STATUSES).optional(), isFeatured: queryBoolean.optional(),
    brandId: uuid.optional(), modelId: uuid.optional(), variantId: uuid.optional(), bodyTypeId: uuid.optional(),
    branchId: uuid.optional(), locationId: uuid.optional(),
    condition: z.enum(VEHICLE_CONDITIONS).optional(), saleStatus: z.enum(VEHICLE_SALE_STATUSES).optional(),
    arrivalStatus: z.enum(VEHICLE_ARRIVAL_STATUSES).optional(), fuelType: z.enum(FUEL_TYPES).optional(),
    transmission: z.enum(TRANSMISSIONS).optional(), drivetrain: z.enum(DRIVETRAINS).optional(),
    steeringPosition: z.enum(STEERING_POSITIONS).optional(), priceDisplayMode: z.enum(PRICE_DISPLAY_MODES).optional(),
    priceMin: queryNumber(price), priceMax: queryNumber(price),
    manufactureYearMin: queryNumber(inputYear), manufactureYearMax: queryNumber(inputYear),
    mileageKmMin: queryNumber(mileage), mileageKmMax: queryNumber(mileage),
    sort: sort.default("created_desc"),
  }).superRefine((value, ctx) => {
    for (const [min, max] of [["priceMin", "priceMax"], ["manufactureYearMin", "manufactureYearMax"], ["mileageKmMin", "mileageKmMax"]] as const) {
      if (value[min] !== undefined && value[max] !== undefined && value[min] > value[max]) {
        ctx.addIssue({ code: "custom", path: [max], message: "Maximum cannot be less than minimum." });
      }
    }
  });
  export const listItem = entity.omit({ content: true, internalNote: true, vin: true, images: true, featureIds: true });
  export const listResult = z.object({
    items: z.array(listItem), total: z.number().int().nonnegative(),
    limit: z.number().int().min(1).max(100), offset: z.number().int().min(0).max(2_147_483_647),
  }).strict();

  export type Entity = z.infer<typeof entity>;
  export type CreateBody = z.input<typeof createBody>;
  export type UpdateBody = z.input<typeof updateBody>;
  export type Params = z.infer<typeof params>;
  export type ListQuery = z.input<typeof listQuery>;
  export type ListItem = z.infer<typeof listItem>;
  export type ListResult = z.infer<typeof listResult>;
  export type ImageInput = z.input<typeof imageInput>;
  export type Image = z.infer<typeof image>;

  export const list = createAction("vehicleList", { query: listQuery, result: listResult }, { path: "/vehicles", method: "GET" });
  export const get = createAction("vehicleGet", { params, result: entity }, { path: "/vehicles/:id", method: "GET" });
  export const create = createAction("vehicleCreate", { body: createBody, result: entity }, { path: "/vehicles", method: "POST" });
  export const update = createAction("vehicleUpdate", { params, body: updateBody, result: entity }, { path: "/vehicles/:id", method: "PATCH" });
  export const publish = createAction("vehiclePublish", { params, result: entity }, { path: "/vehicles/:id/publish", method: "POST" });
  export const hide = createAction("vehicleHide", { params, result: entity }, { path: "/vehicles/:id/hide", method: "POST" });
  export const archive = createAction("vehicleArchive", { params, result: entity }, { path: "/vehicles/:id/archive", method: "POST" });
  export const restore = createAction("vehicleRestore", { params, result: entity }, { path: "/vehicles/:id/restore", method: "POST" });
}
