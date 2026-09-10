import { createAction } from "@napp/dti-core";
import { z } from "zod";

export namespace Health {
  export const query = z.object({}).strict();

  export const result = z.object({
    status: z.literal("ok"),
    service: z.literal("@bigmotors/sysop-server"),
  }).strict();

  export type Result = z.infer<typeof result>;

  export const check = createAction(
    "healthCheck",
    { query, result },
    { path: "/health", method: "GET" },
  );
}
