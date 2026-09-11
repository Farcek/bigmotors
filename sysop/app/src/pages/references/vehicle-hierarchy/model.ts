import { VehicleBrands } from "@bigmotors/sysop-dti";
import { referenceDefinitions } from "../definitions";
import type { ReferenceRow } from "../model";

export type Level = "brand" | "model" | "variant";
export const levels = {
  brand: { title: "Марк", definition: referenceDefinitions["vehicle-brands"] },
  model: { title: "Загвар", definition: referenceDefinitions["vehicle-models"] },
  variant: { title: "Хувилбар", definition: referenceDefinitions["vehicle-variants"] },
} as const;

export function selection(params: URLSearchParams) {
  const readId = (key: string) => {
    const result = VehicleBrands.params.safeParse({ id: params.get(key) });
    return result.success ? result.data.id : null;
  };
  const brandId = readId("brandId");
  return { brandId, modelId: brandId ? readId("modelId") : null };
}

export function selectBrand(params: URLSearchParams, id: string | null) {
  const next = new URLSearchParams(params);
  if (id) next.set("brandId", id); else next.delete("brandId");
  next.delete("modelId");
  return next;
}

export function selectModel(params: URLSearchParams, id: string | null) {
  const next = new URLSearchParams(params);
  if (id) next.set("modelId", id); else next.delete("modelId");
  return next;
}

export function canCreate(level: Level, brand?: ReferenceRow, model?: ReferenceRow) {
  return level === "brand" || Boolean(brand?.isActive && (level === "model" || (model?.isActive && model.brandId === brand.id)));
}
