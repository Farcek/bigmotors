import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, realpath, rm } from "node:fs/promises";
import path from "node:path";
import { ConfigFiles } from "@bigmotors/core";
import { defineInject, INJECT, TOKEN, Token } from "@napp/di";
import { NappError } from "@napp/error";

export interface UploadTarget {
  id: string;
  directory: string;
  diskPath: string;
  filePath: string;
}

function inside(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative !== "" && relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

export class UploadStorage {
  static [TOKEN] = Token.create<UploadStorage>("UploadStorage");
  static [INJECT] = defineInject(UploadStorage, [ConfigFiles] as const);
  constructor(private readonly config: ConfigFiles) {}

  async prepare(): Promise<UploadTarget> {
    const { FILES_ROOT: root, FILES_UPLOADS: uploads } = this.config;
    for (const value of [root, uploads]) {
      if (!value.trim() || !path.isAbsolute(value) || (process.platform === "win32" && path.parse(value).root.length < 3)) {
        throw new NappError("Invalid file storage configuration.", { code: "FILE_UPLOAD_STORAGE_ERROR", status: 500 });
      }
    }
    if (!inside(root, uploads)) throw new Error("Upload directory must be inside the file root.");
    await mkdir(root, { recursive: true });
    const canonicalRoot = await realpath(root);
    // Check each existing component before creating its child, including junctions on Windows.
    let current = canonicalRoot;
    for (const segment of path.relative(root, uploads).split(path.sep)) {
      const child = path.join(current, segment);
      try { await mkdir(child); } catch (error) {
        if (!(error instanceof Error && "code" in error && error.code === "EEXIST")) throw error;
      }
      current = await realpath(child);
      if (!inside(canonicalRoot, current)) throw new Error("Upload directory escapes the file root.");
    }
    const id = randomUUID();
    // A new private directory gives DiskStorage exclusive ownership of this destination.
    const directory = await mkdtemp(path.join(current, `${id}-`));
    const diskPath = path.join(directory, id);
    return { id, directory, diskPath, filePath: path.relative(canonicalRoot, diskPath).split(path.sep).join("/") };
  }

  async discard(target: UploadTarget): Promise<void> {
    const root = await realpath(this.config.FILES_ROOT);
    const parent = await realpath(path.dirname(target.directory));
    if (!inside(root, target.directory) || path.dirname(target.diskPath) !== target.directory
      || !inside(root, parent)
      || path.basename(target.diskPath) !== target.id || !path.basename(target.directory).startsWith(`${target.id}-`)) {
      throw new Error("Refusing to clean an invalid upload target.");
    }
    await rm(target.directory, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 });
  }
}
