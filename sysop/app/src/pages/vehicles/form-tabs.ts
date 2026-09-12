import type { VehicleValues } from "./model";

export const vehicleTabs = [
  { value: "basic", label: "Үндсэн", fields: ["title", "description", "mainImageId"] },
  { value: "vehicle", label: "Автомашин", fields: ["brandId", "modelId", "variantId", "bodyTypeId", "manufactureYear", "importYear", "vin", "condition", "mileageKm", "conditionDescription"] },
  { value: "specs", label: "Үзүүлэлт", fields: ["fuelType", "engineCapacityCc", "transmission", "drivetrain", "steeringPosition", "seatCount", "exteriorColorId", "interiorColorId", "featureIds"] },
  { value: "sales", label: "Борлуулалт", fields: ["priceDisplayMode", "price", "currency", "financingAvailable", "saleStatus", "arrivalStatus", "branchId", "locationId", "internalNote"] },
  { value: "images", label: "Зураг", fields: ["images"] },
  { value: "content", label: "Агуулга", fields: ["content"] },
  { value: "card", label: "Карт", fields: ["itemTitle", "itemDesc", "itemImageId", "isFeatured"] },
] as const satisfies readonly { value: string; label: string; fields: readonly (keyof VehicleValues)[] }[];

export function vehicleFieldTab(field: string) {
  return vehicleTabs.find((tab) => (tab.fields as readonly string[]).includes(field))?.value ?? "basic";
}

export function vehicleTabValue(value: unknown) {
  return vehicleTabs.find((tab) => tab.value === value)?.value ?? "basic";
}
