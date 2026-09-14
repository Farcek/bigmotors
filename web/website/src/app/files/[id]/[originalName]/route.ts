import { ConfigFiles } from "@bigmotors/core";
import { FileService } from "@bigmotors/db";
import { getWebsiteContainer } from "../../../../server/db";
import { readFileResponse } from "../../../../server/file-response";
import { proxyFileResponse } from "../../../../server/file-proxy-response";

export const runtime = "nodejs";

export async function GET(request: Request, context: RouteContext<"/files/[id]/[originalName]">) {
  const { id } = await context.params;
  if (process.env.FILES_API_BASE_URL !== undefined) {
    return proxyFileResponse(request, id, process.env.FILES_API_BASE_URL);
  }
  return readFileResponse(request, id, {
    findById: (fileId) => getWebsiteContainer().resolve(FileService).findById(fileId),
    getRoot: () => getWebsiteContainer().resolve(ConfigFiles).FILES_ROOT,
  });
}

export const HEAD = GET;
