export function galleryPlainText(value: string | null | undefined): string {
  if (!value) return "";
  if (typeof DOMParser === "undefined") return value;
  const document = new DOMParser().parseFromString(value, "text/html");
  document.querySelectorAll("script, style").forEach((element) => element.remove());
  return document.body.textContent?.trim() ?? "";
}
