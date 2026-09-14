import type { NextConfig } from "next";
import path from "node:path";

const config: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.resolve(import.meta.dirname, "../.."),
  // Resolve shared server dependencies through Node rather than bundling copies.
  serverExternalPackages: ["@bigmotors/db", "@bigmotors/core", "@napp/di"],
};

export default config;
