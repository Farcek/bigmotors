export function isGalleryLinkUrl(value: string | null | undefined): boolean {
  if (!value) return true;
  if (/[\u0000-\u0020\u007f\\]/.test(value)) return false;
  if (value.startsWith("/")) return !value.startsWith("//");
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && !url.username && !url.password;
  } catch { return false; }
}
