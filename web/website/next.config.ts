import type { NextConfig } from "next";

const config: NextConfig = {
  serverExternalPackages: ["@bigmotors/db", "@bigmotors/core", "@napp/di"],
};

export default config;
