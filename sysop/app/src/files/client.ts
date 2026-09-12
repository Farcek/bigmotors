import { Files } from "@bigmotors/sysop-dti";
import { API_BASE_URL } from "../api/client";

export function fileUrl(file: Pick<Files.UploadResult, "id" | "originalName">) {
  const origin = import.meta.env?.VITE_FILES_BASE_URL ?? (/^https?:\/\//i.test(API_BASE_URL) ? new URL(API_BASE_URL).origin : "");
  return `${origin.replace(/\/$/, "")}/files/${file.id}/${encodeURIComponent(file.originalName)}`;
}
export async function uploadFile(file: File, title: string, description: string, signal: AbortSignal) {
  const body = new FormData(); body.append("file", file); body.append("title", title); body.append("description", description);
  const response = await fetch(`${API_BASE_URL.replace(/\/$/, "")}/files/upload`, { method: "POST", body, signal });
  if (!response.ok) {
    if (response.status === 413) throw new Error("Файл серверийн зөвшөөрөх хэмжээнээс хэтэрсэн байна.");
    if (response.status === 503) throw new Error("Энэ орчинд upload эрхийн тохиргоо бэлэн биш байна.");
    throw new Error("Файл upload хийж чадсангүй. Дахин оролдоно уу.");
  }
  return Files.uploadResult.parse(await response.json());
}
