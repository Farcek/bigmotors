/** Resolve a single YouTube video link; never fetch or embed arbitrary URLs. */
export function getYouTubeVideoUrl(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    const host = url.hostname.toLowerCase();
    const segments = url.pathname.split("/").filter(Boolean);
    let id: string | null = null;
    if (host === "youtu.be" && segments.length === 1) id = segments[0]!;
    if (["youtube.com", "www.youtube.com", "m.youtube.com"].includes(host)) {
      if (url.pathname === "/watch") id = url.searchParams.get("v");
      else if (segments.length === 2 && ["shorts", "embed", "live"].includes(segments[0]!)) id = segments[1]!;
    }
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? `https://www.youtube.com/watch?v=${id}` : null;
  } catch {
    return null;
  }
}
