import { PAGE_STATUSES, type PageStatus } from "@bigmotors/core";
import { Pages } from "@bigmotors/sysop-dti";
import { DTIError } from "@napp/dti-core";

export const PAGE_SIZE = 20;
export const statusLabels: Record<PageStatus, string> = { draft: "Ноорог", published: "Нийтэлсэн", archived: "Архивласан" };
export const statusOptions = PAGE_STATUSES.map(value => ({ value, label: statusLabels[value] }));
export function pageNumber(params: URLSearchParams) {
  const value = Number(params.get("page") ?? 1);
  return Number.isSafeInteger(value) && value > 0 ? Math.min(value, Math.floor(2147483647 / PAGE_SIZE)) : 1;
}
export function pageError(error: unknown) {
  if (error instanceof DTIError) {
    if (error.code === "PAGE_SLUG_CONFLICT") return "Энэ slug-тай хуудас бүртгэлтэй байна.";
    if (error.code === "PAGE_IMAGE_NOT_FOUND") return "Сонгосон зураг олдсонгүй.";
    if (error.code === "PAGE_NOT_FOUND") return "Хуудас олдсонгүй.";
    if (error.status === 400) return "Талбарууд болон нийтлэх агуулгыг шалгана уу.";
    if (error.status === 401) return "Нэвтрэх шаардлагатай байна.";
    if (error.status === 403) return "Энэ үйлдлийг хийх эрхгүй байна.";
  }
  return "Үйлдэл амжилтгүй боллоо. Дахин оролдоно уу.";
}
export function pageFormValues(row?: Pages.Entity) {
  return {
    title: row?.title ?? "", slug: row?.slug ?? "", description: row?.description ?? "",
    mainImageId: row?.mainImageId ?? null, status: row?.status ?? "draft" as PageStatus,
    meta: JSON.stringify(row?.meta ?? {}, null, 2), content: JSON.stringify(row?.content ?? {}, null, 2),
  };
}
export type PageFormValues = ReturnType<typeof pageFormValues>;
export function validatePageForm(values: PageFormValues) {
  const errors: Record<string, string> = {};
  for (const key of ["title", "slug", "description"] as const) {
    if (!Pages.createBody.shape[key].safeParse(values[key]).success) errors[key] = key === "slug" ? "Жижиг латин үсэг, тоо, дунд зураастай, 255 хүртэл тэмдэгт байна." : "Утгын уртыг шалгана уу.";
  }
  for (const key of ["meta", "content"] as const) {
    try {
      const value = Pages.jsonObject.parse(JSON.parse(values[key]));
      if (key === "content" && values.status === "published" && Object.keys(value).length === 0) errors[key] = "Нийтлэх агуулга хоосон байна.";
    } catch { errors[key] = "Зөв JSON object оруулна уу."; }
  }
  return errors;
}
export function pagePayload(values: PageFormValues): Pages.CreateBody {
  return Pages.createBody.parse({ ...values, meta: JSON.parse(values.meta), content: JSON.parse(values.content) });
}
