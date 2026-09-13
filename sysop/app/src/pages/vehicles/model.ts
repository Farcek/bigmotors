import { Vehicles } from "@bigmotors/sysop-dti";
import { DTIError } from "@napp/dti-core";

export const labels: Record<string, string> = {
  title: "Гарчиг", description: "Товч тайлбар", content: "Дэлгэрэнгүй агуулга", itemTitle: "Картын гарчиг", itemDesc: "Картын тайлбар",
  mainImageId: "Үндсэн зураг", itemImageId: "Картын зураг", internalNote: "Дотоод тэмдэглэл", isFeatured: "Онцлох",
  brandId: "Марк", modelId: "Загвар", variantId: "Хувилбар", manufactureYear: "Үйлдвэрлэсэн он", importYear: "Орж ирсэн он", vin: "Арлын дугаар",
  bodyTypeId: "Кузовын төрөл", fuelType: "Түлш", engineCapacityCc: "Хөдөлгүүр (cc)", transmission: "Хурдны хайрцаг", drivetrain: "Хөтлөгч",
  steeringPosition: "Жолооны байрлал", exteriorColorId: "Гадна өнгө", interiorColorId: "Салоны өнгө", seatCount: "Суудлын тоо",
  condition: "Шинэ / хуучин", mileageKm: "Гүйлт (км)", conditionDescription: "Нөхцөл байдлын тайлбар", branchId: "Компанийн салбар", locationId: "Бүтээгдэхүүний байршил",
  saleStatus: "Борлуулалтын төлөв", arrivalStatus: "Ирэлтийн төлөв", financingAvailable: "Зээлээр авах боломж", price: "Үнэ (₮)", currency: "Валют", priceDisplayMode: "Үнэ харуулах хэлбэр",
  images: "Зургууд", youtubeUrl: "YouTube видео холбоос", featureIds: "Тоноглол", publicationStatus: "Нийтлэлийн төлөв",
};
export const valueLabels: Record<string, string> = {
  draft: "Ноорог", published: "Нийтэлсэн", hidden: "Нуусан", archived: "Архивласан", available: "Борлуулах", sold: "Зарагдсан",
  expected: "Ирэх", in_transit: "Замд яваа", in_stock: "Бэлэн", new: "Шинэ", used: "Хуучин", show_price: "Үнэ харуулах", inquire: "Үнэ асуух", MNT: "Төгрөг (MNT)",
  gasoline: "Бензин", diesel: "Дизель", hybrid: "Хайбрид", plug_in_hybrid: "Plug-in хайбрид", electric: "Цахилгаан", lpg: "LPG", cng: "CNG",
  manual: "Механик", automatic: "Автомат", cvt: "CVT", e_cvt: "E-CVT", dct: "DCT", amt: "AMT",
  fwd: "Урд (FWD)", rwd: "Хойд (RWD)", awd: "AWD", four_wheel_drive: "4WD", left: "Зүүн", right: "Баруун",
  created_desc: "Сүүлд бүртгэсэн", updated_desc: "Сүүлд зассан", title_asc: "Гарчиг А–Я", price_asc: "Үнэ өсөх", price_desc: "Үнэ буурах", year_desc: "Он шинэ эхэнд", mileage_asc: "Гүйлт бага эхэнд",
};
export const options = (values: readonly string[]) => values.map((value) => ({ value, label: valueLabels[value] ?? value }));
export const statusColor: Record<string, string> = { draft: "gray", published: "teal", hidden: "yellow", archived: "gray" };
export const commandLabels = { publish: "Нийтлэх", hide: "Нуух", archive: "Архивлах", restore: "Сэргээх" };
export type VehicleCommand = keyof typeof commandLabels;
export function availableCommands(status: Vehicles.Entity["publicationStatus"]): VehicleCommand[] {
  return status === "draft" ? ["publish", "archive"] : status === "published" ? ["hide", "archive"] : status === "hidden" ? ["publish", "archive"] : ["restore"];
}
export const emptyValues = {
  title: "", description: "", content: "", itemTitle: "", itemDesc: "", internalNote: "", vin: "", conditionDescription: "", youtubeUrl: "",
  brandId: null as string | null, modelId: null as string | null, variantId: null as string | null, bodyTypeId: null as string | null,
  exteriorColorId: null as string | null, interiorColorId: null as string | null, branchId: null as string | null, locationId: null as string | null,
  mainImageId: null as string | null, itemImageId: null as string | null,
  fuelType: null as string | null, transmission: null as string | null, drivetrain: null as string | null, steeringPosition: null as string | null,
  condition: null as string | null, saleStatus: null as string | null, arrivalStatus: null as string | null, currency: null as string | null, priceDisplayMode: null as string | null,
  manufactureYear: "" as number | string, importYear: "" as number | string, engineCapacityCc: "" as number | string,
  mileageKm: "" as number | string, seatCount: "" as number | string, price: "" as number | string,
  financingAvailable: "", isFeatured: false, images: [] as Vehicles.ImageInput[], featureIds: [] as string[],
};
export type VehicleValues = typeof emptyValues;
export function initialValues(row?: Vehicles.Entity): VehicleValues {
  const values = { ...emptyValues, images: [], featureIds: [] } as VehicleValues;
  if (!row) return values;
  for (const key of Object.keys(emptyValues) as (keyof VehicleValues)[]) {
    if (key !== "images" && key !== "featureIds" && key !== "financingAvailable") Reflect.set(values, key, row[key] ?? emptyValues[key]);
  }
  values.images = row.images.map(({ fileId, sortOrder }) => ({ fileId, sortOrder }));
  values.featureIds = [...row.featureIds];
  values.financingAvailable = row.financingAvailable === null ? "" : String(row.financingAvailable);
  return values;
}
function yearValue(value: number | string) {
  return value === "" ? null : typeof value === "string" && /^\d{4}$/.test(value) ? Number(value) : value;
}
export function rawPayload(values: VehicleValues) {
  return { ...values, content: values.content || null, internalNote: values.internalNote || null, vin: values.vin || null,
    financingAvailable: values.financingAvailable === "" ? null : values.financingAvailable === "true",
    manufactureYear: yearValue(values.manufactureYear),
    importYear: yearValue(values.importYear),
    engineCapacityCc: values.engineCapacityCc === "" ? null : values.engineCapacityCc,
    mileageKm: values.mileageKm === "" ? null : values.mileageKm,
    seatCount: values.seatCount === "" ? null : values.seatCount,
    price: values.price === "" ? null : values.price,
  };
}
export function vehiclePayload(values: VehicleValues) { return Vehicles.createBody.parse(rawPayload(values)); }
export function changedPayload(values: VehicleValues, initial: VehicleValues) {
  const current = vehiclePayload(values);
  const previous = vehiclePayload(initial);
  return Object.fromEntries(Object.entries(current).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(previous[key as keyof typeof previous]))) as Vehicles.UpdateBody;
}
export function validateVehicle(values: VehicleValues, published = false) {
  const result = Vehicles.createBody.safeParse(rawPayload(values));
  const errors: Record<string, string> = {};
  if (!result.success) for (const issue of result.error.issues) {
    const key = String(issue.path[0]); errors[key] = `${labels[key] ?? "Талбар"}: утгыг шалгана уу.`;
  }
  if (published) {
    const required = ["mainImageId", "priceDisplayMode", "brandId", "modelId", "manufactureYear", "bodyTypeId", "fuelType", "drivetrain", "steeringPosition", "exteriorColorId", "condition", "saleStatus", "arrivalStatus"];
    if (values.priceDisplayMode === "show_price") required.push("price");
    if (values.price !== "") required.push("currency");
    if (values.fuelType && values.fuelType !== "electric") required.push("engineCapacityCc", "transmission");
    if (values.condition === "used") required.push("mileageKm");
    if (values.arrivalStatus === "in_stock") required.push("locationId");
    for (const key of required) if (values[key as keyof VehicleValues] === null || values[key as keyof VehicleValues] === "") errors[key] = "Нийтлэхэд заавал бөглөнө.";
  }
  return errors;
}
export function vehicleError(error: unknown) {
  if (error instanceof DTIError) {
    const messages: Record<string, string> = {
      VEHICLE_NOT_FOUND: "Автомашин олдсонгүй.", VEHICLE_INVALID_INPUT: "Оруулсан утгууд болон хоорондын хамаарлыг шалгана уу.",
      VEHICLE_REFERENCE_INACTIVE: "Шинэ сонголтод идэвхгүй лавлах байна.", VEHICLE_REFERENCE_NOT_FOUND: "Сонгосон лавлах олдсонгүй.",
      VEHICLE_REFERENCE_MISMATCH: "Марк, загвар, хувилбарын хамаарал зөрсөн байна.", VEHICLE_INVALID_TRANSITION: "Энэ төлөвт уг үйлдлийг хийх боломжгүй. Мэдээллийг шинэчилнэ үү.",
      VEHICLE_FILE_NOT_FOUND: "Сонгосон файл олдсонгүй.", VEHICLE_FILE_UNAVAILABLE: "Сонгосон файл дискэнд байхгүй байна.",
      VEHICLE_PUBLICATION_INVALID: "Нийтлэхэд шаардлагатай мэдээлэл дутуу байна.", VEHICLE_WRITE_CONFLICT: "Өөрчлөлт давхацлаа. Мэдээллийг шинэчилж дахин оролдоно уу.",
      VEHICLE_REFERENCE_CONFLICT: "Холбоотой бүртгэл өөрчлөгдсөн байна. Дахин оролдоно уу.", NETWORK_ERROR: "Сервертэй холбогдож чадсангүй.",
    };
    if (error.code === "VEHICLE_PUBLICATION_INVALID") {
      const missing = error.message.replace(/^Required for publication: /, "").replace(/\.$/, "").split(", ").map((key) => labels[key]).filter(Boolean);
      return messages.VEHICLE_PUBLICATION_INVALID + (missing.length ? ` ${missing.join(", ")}.` : "");
    }
    if (error.status === 401) return "Нэвтрэх шаардлагатай байна.";
    if (error.status === 403) return "Үйлдэл хийх эрхгүй байна.";
    if (error.code && messages[error.code]) return messages[error.code];
  }
  return "Үйлдэл амжилтгүй боллоо. Дахин оролдоно уу.";
}
export function listQuery(params: URLSearchParams) {
  return Vehicles.listQuery.safeParse({ limit: "20", offset: "0", ...Object.fromEntries(params) });
}
export function returnToList(value: string | null) { return value?.startsWith("/vehicles?") ? value : "/vehicles"; }
