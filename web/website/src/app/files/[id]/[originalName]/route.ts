import { ConfigFiles } from "@bigmotors/core";
import { FileService } from "@bigmotors/db";
import { getWebsiteContainer } from "../../../../server/db";
import { readFileResponse } from "../../../../server/file-response";

export const runtime = "nodejs";

export async function GET(request: Request, context: RouteContext<"/files/[id]/[originalName]">) {
  const { id } = await context.params;
  return readFileResponse(request, id, {
    findById: (fileId) => getWebsiteContainer().resolve(FileService).findById(fileId),
    getRoot: () => getWebsiteContainer().resolve(ConfigFiles).FILES_ROOT,
  });
}

export const HEAD = GET;
