import type { NextConfig } from "next";

const config: NextConfig = {
  // Resolve shared server dependencies through Node rather than bundling copies.
  serverExternalPackages: ["@bigmotors/db", "@bigmotors/core", "@napp/di"],
};

export default config;
