import type { FUEL_TYPES, TRANSMISSIONS } from "@bigmotors/core";

export type CarCardData = {
  id: string;
  title: string;
  itemTitle?: string | null;
  description?: string | null;
  itemDesc?: string | null;
  imageUrl?: string | null;
  itemImageUrl?: string | null;
  imageCount?: number | null;
  youtubeUrl?: string | null;
  manufactureYear?: number | null;
  mileageKm?: number | null;
  transmission?: (typeof TRANSMISSIONS)[number] | null;
  fuelType?: (typeof FUEL_TYPES)[number] | null;
  engineCapacityCc?: number | null;
  price?: number | null;
  currency?: "MNT" | null;
  priceDisplayMode?: "show_price" | "inquire" | null;
  financingAvailable?: boolean | null;
};

export const fuelLabels = {
  gasoline: "Бензин", diesel: "Дизель", hybrid: "Хайбрид", plug_in_hybrid: "Plug-in хайбрид",
  electric: "Цахилгаан", lpg: "LPG", cng: "CNG",
} satisfies Record<(typeof FUEL_TYPES)[number], string>;

export const transmissionLabels = {
  manual: "Механик", automatic: "Автомат", cvt: "CVT", e_cvt: "E-CVT", dct: "DCT", amt: "AMT",
} satisfies Record<(typeof TRANSMISSIONS)[number], string>;

const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
export function formatCarPrice(value: number, compact = false): string {
  if (!compact || value < 1_000_000) return number.format(value);
  if (value >= 999_950_000) return `${number.format(value / 1_000_000_000)} тэрбум`;
  return `${number.format(value / 1_000_000)} сая`;
}

export function resolveCarCard(item: CarCardData) {
  return {
    title: item.itemTitle?.trim() || item.title.trim(),
    description: item.itemDesc?.trim() || item.description?.trim() || null,
    imageUrl: item.itemImageUrl?.trim() || item.imageUrl?.trim() || null,
    href: `/vehicles/${encodeURIComponent(item.id)}`,
  };
}
