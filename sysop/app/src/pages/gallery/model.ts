import { DTIError } from "@napp/dti-core";

export const GALLERY_PAGE_SIZE = 20;
export function galleryPage(params: URLSearchParams) {
  const requested = Number(params.get("page") ?? 1);
  return Number.isSafeInteger(requested) && requested > 0 ? Math.min(requested, Math.floor(2147483647 / GALLERY_PAGE_SIZE)) : 1;
}
export function galleryError(error: unknown) {
  if (error instanceof DTIError) {
    if (error.code === "GALLERY_KEY_CONFLICT") return "Энэ key-тэй Gallery бүртгэл байна. Өөр key оруулна уу.";
    if (error.code === "GALLERY_NOT_FOUND") return "Gallery эсвэл item олдсонгүй. Жагсаалтыг шинэчилнэ үү.";
    if (error.code === "GALLERY_REFERENCE_NOT_FOUND") return "Gallery эсвэл сонгосон зураг олдсонгүй.";
    if (error.status === 400) return "Оруулсан утгуудыг шалгана уу.";
    if (error.status === 401) return "Нэвтрэх шаардлагатай байна.";
    if (error.status === 403) return "Энэ үйлдлийг хийх эрхгүй байна.";
  }
  return "Үйлдэл амжилтгүй боллоо. Дахин оролдоно уу.";
}
