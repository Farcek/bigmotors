import { TireBrands } from "@bigmotors/sysop-dti";
import { referenceDefinitions } from "../definitions";
import type { ReferenceRow } from "../model";

export type Level = "brand" | "model";
export const levels = {
  brand: { title: "Брэнд", definition: referenceDefinitions["tire-brands"] },
  model: { title: "Загвар", definition: referenceDefinitions["tire-models"] },
} as const;

export function selectedBrandId(params: URLSearchParams) {
  const result = TireBrands.params.safeParse({ id: params.get("brandId") });
  return result.success ? result.data.id : null;
}

export function selectBrand(params: URLSearchParams, id: string | null) {
  const next = new URLSearchParams(params);
  if (id) next.set("brandId", id); else next.delete("brandId");
  return next;
}

export function canCreate(level: Level, brand?: ReferenceRow) {
  return level === "brand" || Boolean(brand?.isActive);
}
