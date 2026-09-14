import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/file-storage.ts", "src/image-cache.ts"], platform: "neutral", target: "es2022", format: "esm",
  deps: { neverBundle: [/^node:/] },
  outExtensions: () => ({ js: ".mjs", dts: ".d.mts" }), dts: true, sourcemap: true, clean: true,
});
