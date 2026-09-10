import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/main.ts"],
  platform: "node",
  target: "node24",
  format: "esm",
  outDir: "dist",
  outExtensions: () => ({ js: ".mjs" }),
  sourcemap: true,
  clean: true,
  dts: false,
});
