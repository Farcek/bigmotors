import { ConfigFiles } from "@bigmotors/core";
import { ConfigSysop } from "../config.js";

export function readDemoImportConfig(env: NodeJS.ProcessEnv) {
  let origin: string;
  if (env.DEMO_API_BASE_URL === undefined) {
    origin = `http://127.0.0.1:${new ConfigSysop(env).PORT}`;
  } else {
    try {
      const url = new URL(env.DEMO_API_BASE_URL.trim());
      if (!["http:", "https:"].includes(url.protocol) || url.username || url.password
        || url.pathname !== "/" || url.search || url.hash) throw new Error();
      origin = url.origin;
    } catch {
      throw new Error("DEMO_API_BASE_URL must be an HTTP(S) origin without credentials, path, query or fragment.");
    }
  }
  return { origin, maxBytes: new ConfigFiles(env).FILE_UPLOAD_MAX_BYTES };
}
