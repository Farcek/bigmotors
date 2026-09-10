import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  platform: "neutral",
  target: "es2022",
  format: "esm",
  outDir: "dist",
  outExtensions: () => ({ js: ".mjs", dts: ".d.mts" }),
  sourcemap: true,
  clean: true,
  dts: true,
});
