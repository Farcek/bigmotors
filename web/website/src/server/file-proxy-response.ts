import { FileImageError, parseFileImageWidth } from "@bigmotors/core";

function fileError(request: Request, status: number, code: string, message: string): Response {
  return new Response(request.method === "HEAD" ? null : JSON.stringify({ error: { code, message } }), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}

export async function proxyFileResponse(
  request: Request,
  id: string,
  apiBaseUrl: string,
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  let origin: string;
  try {
    const url = new URL(apiBaseUrl.trim());
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password
      || url.pathname !== "/" || url.search || url.hash) throw new Error();
    origin = url.origin;
  } catch {
    return fileError(request, 500, "FILE_PROXY_CONFIG_ERROR", "File service is not configured correctly.");
  }
  // Restrict the path segment; the upstream service applies its full UUID validation.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return fileError(request, 400, "FILE_INVALID_ID", "Invalid file ID.");
  }
  const timeout = AbortSignal.timeout(120_000);
  try {
    const width = parseFileImageWidth(new URL(request.url).searchParams);
    // The public contract ignores the URL filename. A fixed name prevents path traversal.
    const upstream = await fetcher(`${origin}/files/${id}/file${width ? `?w=${width}` : ""}`, {
      method: request.method === "HEAD" ? "HEAD" : "GET",
      headers: { "Accept-Encoding": "identity" },
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.any([request.signal, timeout]),
    });
    if (upstream.status !== 200) {
      await upstream.body?.cancel();
      if (upstream.status === 400) return fileError(request, 400, "FILE_INVALID_ID", "Invalid file ID.");
      if (upstream.status === 404) return fileError(request, 404, "FILE_NOT_FOUND", "File not found.");
      if (upstream.status === 413) return fileError(request, 413, "FILE_IMAGE_TOO_LARGE", "Image is too large to resize.");
      if (upstream.status === 415) return fileError(request, 415, "FILE_IMAGE_UNSUPPORTED", "Image cannot be resized. Use the original file.");
      if (upstream.status === 503 && width) return fileError(request, 503, "FILE_IMAGE_BUSY", "Image service is busy. Try again shortly.");
      return fileError(request, 502, "FILE_PROXY_ERROR", "File service is unavailable.");
    }
    const headers = new Headers({
      "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
      "Cache-Control": width && upstream.headers.get("content-type") === "image/webp" ? "public, max-age=3600" : "no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox; default-src 'none'",
    });
    const disposition = upstream.headers.get("content-disposition");
    if (disposition) headers.set("Content-Disposition", disposition);
    // Fetch decodes compressed responses, so their wire length must not be forwarded.
    const encoding = upstream.headers.get("content-encoding");
    const length = upstream.headers.get("content-length");
    if (length && (!encoding || encoding === "identity")) headers.set("Content-Length", length);
    if (request.method === "HEAD") {
      await upstream.body?.cancel();
      return new Response(null, { headers });
    }
    // Stream directly; cancellation propagates to the upstream body without buffering files.
    return new Response(upstream.body, { headers });
  } catch (error) {
    if (error instanceof FileImageError) return fileError(request, error.status, error.code, error.message);
    return timeout.aborted
      ? fileError(request, 504, "FILE_PROXY_TIMEOUT", "File service timed out.")
      : fileError(request, 502, "FILE_PROXY_ERROR", "File service is unavailable.");
  }
}
