import { Colors } from "@bigmotors/sysop-dti";
import { DTIError } from "@napp/dti-core";

export type ColorFormValues = {
  name: string;
  hexCode: string;
  description: string;
  sortOrder: number | string;
  isActive: boolean;
};

export function colorInitialValues(color?: Colors.Entity): ColorFormValues {
  return {
    name: color?.name ?? "", hexCode: color?.hexCode ?? "",
    description: color?.description ?? "", sortOrder: color?.sortOrder ?? 0,
    isActive: color?.isActive ?? true,
  };
}

export function validateColorForm(values: ColorFormValues) {
  const result = Colors.createBody.safeParse(values);
  const errors: Record<string, string> = {};
  if (!result.success) {
    for (const issue of result.error.issues) {
      const field = String(issue.path[0]);
      errors[field] = ({
        name: "Өнгөний нэрийг 1–255 тэмдэгтээр оруулна уу.",
        hexCode: "#RRGGBB хэлбэрийн 6 оронтой HEX код оруулна уу.",
        description: "Тайлбар 512 тэмдэгтээс хэтрэхгүй байна.",
        sortOrder: "-2147483648–2147483647 хооронд бүхэл тоо оруулна уу.",
      } as Record<string, string>)[field] ?? "Утгыг шалгана уу.";
    }
  }
  return errors;
}

export function colorErrorMessage(error: unknown): string {
  if (error instanceof DTIError) {
    const messages: Record<string, string> = {
      COLOR_NAME_CONFLICT: "Ижил нэртэй өнгө бүртгэлтэй байна.",
      COLOR_IN_USE: "Энэ өнгө ашиглагдаж байна. Устгахын оронд идэвхгүй болгоно уу.",
      COLOR_NOT_FOUND: "Өнгө олдсонгүй. Жагсаалтыг шинэчилнэ үү.",
      COLOR_INVALID_INPUT: "Оруулсан утгуудыг шалгана уу.",
      DATABASE_URL_NOT_DEFINED: "Серверийн DB холболт тохируулагдаагүй байна.",
      NETWORK_ERROR: "Сервертэй холбогдож чадсангүй. Холболтоо шалгаад дахин оролдоно уу.",
    };
    if (error.code && messages[error.code]) return messages[error.code];
    if (error.status === 401) return "Нэвтрэх шаардлагатай байна.";
    if (error.status === 403) return "Энэ үйлдлийг хийх эрхгүй байна.";
  }
  return "Үйлдэл амжилтгүй боллоо. Дахин оролдоно уу.";
}

export const COLOR_PAGE_SIZE = 20;

export function colorListState(params: URLSearchParams) {
  const requested = Number(params.get("page") ?? 1);
  const page = Number.isSafeInteger(requested) && requested > 0
    ? Math.min(requested, Math.floor(2147483647 / COLOR_PAGE_SIZE) + 1) : 1;
  const status = ["true", "false"].includes(params.get("isActive") ?? "") ? params.get("isActive")! : "";
  return { page, status };
}
