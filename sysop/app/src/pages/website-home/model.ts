import { HomeProductGroups } from "@bigmotors/sysop-dti";
import { DTIError } from "@napp/dti-core";
import { CATALOG_LIMITS } from "@bigmotors/core";

export const filterLabels: Record<string, string> = {
  brand: "Марк", model: "Загвар", variant: "Хувилбар", category: "Кузовын төрөл", color: "Гадна өнгө",
  condition: "Шинэ / хуучин", fuel: "Түлш", transmission: "Хурдны хайрцаг", drivetrain: "Хөтлөгч", steering: "Жолооны байрлал",
  mileage_min: "Гүйлт: доод (км)", mileage_max: "Гүйлт: дээд (км)", engine_min: "Хөдөлгүүр: доод (cc)", engine_max: "Хөдөлгүүр: дээд (cc)",
  year_min: "Үйлдвэрлэсэн он: доод", year_max: "Үйлдвэрлэсэн он: дээд", price_min: "Үнэ: доод (₮)", price_max: "Үнэ: дээд (₮)",
};
export const rangeFields = [
  { key: "engine", min: 0, max: CATALOG_LIMITS.engineCapacityMax },
  { key: "mileage", min: 0, max: CATALOG_LIMITS.mileageMax },
  { key: "year", min: CATALOG_LIMITS.yearMin, max: new Date().getFullYear() },
  { key: "price", min: 0, max: CATALOG_LIMITS.priceMax },
] as const;
export function groupInitialValues(row?: HomeProductGroups.Entity) {
  return { title: row?.title ?? "", description: row?.description ?? "", imageId: row?.imageId ?? null,
    sortOrder: (row?.sortOrder ?? 0) as number | string, isActive: row?.isActive ?? true,
    filters: { ...Object.fromEntries(Object.keys(filterLabels).map((key) => [key, ""])), ...row?.filters } as Record<string, string | number | null>,
  };
}
export type GroupValues = ReturnType<typeof groupInitialValues>;
export function groupRawBody(values: GroupValues) {
  return { ...values, filters: Object.fromEntries(Object.entries(values.filters).filter(([, value]) => value !== "" && value !== null && value !== undefined)) };
}
export function groupErrors(values: GroupValues) {
  const result = HomeProductGroups.createBody.safeParse(groupRawBody(values));
  return result.success ? {} : Object.fromEntries(result.error.issues.map((issue) => [issue.path.join("."), "Утга болон доод/дээд хязгаарыг шалгана уу."]));
}
export function groupError(cause: unknown) {
  if (cause instanceof DTIError) {
    if (cause.code === "HOME_GROUP_NOT_FOUND") return "Бүлэг олдсонгүй. Жагсаалтыг шинэчилнэ үү.";
    if (cause.code === "HOME_GROUP_INVALID_REFERENCE") return "Сонгосон лавлах болон марк, загвар, хувилбарын хамаарлыг шалгана уу.";
    if (cause.code === "HOME_GROUP_REFERENCE_NOT_FOUND") return "Зураг олдсонгүй. Дахин сонгоно уу.";
    if (cause.code === "HOME_GROUP_INVALID_INPUT") return "Оруулсан утгуудыг шалгана уу.";
  }
  return "Үйлдэл амжилтгүй боллоо. Дахин оролдоно уу.";
}
export function groupPage(params: URLSearchParams) {
  const value = Number(params.get("page") ?? 1);
  return Number.isInteger(value) && value > 0 ? Math.min(value, Math.floor(2147483647 / 20)) : 1;
}
