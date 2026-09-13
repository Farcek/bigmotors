import { realpath, stat } from "node:fs/promises";
import path from "node:path";

function inside(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative !== "" && relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

export async function resolveStoredFile(root: string, filePath: string): Promise<string> {
  if (!root.trim() || !path.isAbsolute(root) || (process.platform === "win32" && path.parse(root).root.length < 3)) {
    throw new Error("Invalid file root.");
  }
  if (!filePath || filePath.includes("\\") || filePath.includes(":") || filePath.includes("\0")
    || filePath.split("/").some((part) => !part || part === "." || part === "..")) {
    throw new Error("Invalid stored file path.");
  }
  const canonicalRoot = await realpath(root);
  const candidate = path.resolve(canonicalRoot, filePath);
  if (!inside(canonicalRoot, candidate)) throw new Error("File path escapes storage.");
  const diskPath = await realpath(candidate);
  if (!inside(canonicalRoot, diskPath)) throw new Error("File link escapes storage.");
  if (!(await stat(diskPath)).isFile()) {
    throw Object.assign(new Error("File not found."), { code: "ENOENT" });
  }
  return diskPath;
}

const inlineTypes: Readonly<Record<string, string>> = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
  ".gif": "image/gif", ".webp": "image/webp", ".avif": "image/avif",
  ".bmp": "image/bmp", ".ico": "image/x-icon",
};

export function storedFileHeaders(originalName: string): Record<string, string> {
  const type = inlineTypes[path.extname(originalName).toLowerCase()];
  const headers: Record<string, string> = {
    "Content-Type": type ?? "application/octet-stream",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "sandbox; default-src 'none'",
  };
  if (!type) {
    const name = Buffer.from(path.basename(originalName), "utf8").toString("utf8");
    const fallback = name.replace(/[^\x20-\x7e]|["\\]/g, "_") || "download";
    const encoded = encodeURIComponent(name).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
    headers["Content-Disposition"] = `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
  }
  return headers;
}
