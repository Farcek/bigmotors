import { open } from "node:fs/promises";
import { Readable } from "node:stream";
import { resolveStoredFile, storedFileHeaders } from "@bigmotors/core/file-storage";

type FileReader = {
  findById: (id: string) => Promise<{ filePath: string; originalName: string }>;
  getRoot: () => string;
};

export async function readFileResponse(request: Request, id: string, reader: FileReader): Promise<Response> {
  try {
    const file = await reader.findById(id);
    const diskPath = await resolveStoredFile(reader.getRoot(), file.filePath);
    const handle = await open(diskPath, "r");
    try {
      const stats = await handle.stat();
      if (!stats.isFile()) throw Object.assign(new Error("File not found."), { code: "ENOENT" });
      const headers = { ...storedFileHeaders(file.originalName), "Content-Length": String(stats.size) };
      if (request.method === "HEAD") {
        await handle.close();
        return new Response(null, { headers });
      }
      // The stream owns the handle and closes it on completion, error or cancellation.
      const stream = handle.createReadStream({ autoClose: true, signal: request.signal });
      return new Response(Readable.toWeb(stream) as ReadableStream<Uint8Array>, { headers });
    } catch (error) {
      await handle.close();
      throw error;
    }
  } catch (error) {
    const code = error instanceof Error && "code" in error ? error.code : undefined;
    const status = code === "FILE_INVALID_ID" ? 400
      : ["FILE_NOT_FOUND", "ENOENT", "ENOTDIR"].includes(String(code)) ? 404 : 500;
    const result = status === 400 ? { code: "FILE_INVALID_ID", message: "Invalid file ID." }
      : status === 404 ? { code: "FILE_NOT_FOUND", message: "File not found." }
        : { code: "FILE_READ_ERROR", message: "File read failed." };
    const headers = { "Cache-Control": "no-store", "Content-Type": "application/json", "X-Content-Type-Options": "nosniff" };
    return new Response(request.method === "HEAD" ? null : JSON.stringify({ error: result }), { status, headers });
  }
}
