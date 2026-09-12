import { realpath, stat } from "node:fs/promises";
import path from "node:path";
import { NappError } from "@napp/error";

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
    throw new NappError("File not found.", { code: "FILE_NOT_FOUND", status: 404 });
  }
  return diskPath;
}
