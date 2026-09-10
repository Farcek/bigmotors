import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"], platform: "neutral", target: "es2022", format: "esm",
  outExtensions: () => ({ js: ".mjs", dts: ".d.mts" }), dts: true, sourcemap: true, clean: true,
});
