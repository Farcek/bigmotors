import { defineConfig } from "tsdown";

export default defineConfig({
  entry: { main: "src/main.ts", "demo-import": "src/dev/seed-vehicles.ts" },
  platform: "node",
  target: "node24",
  format: "esm",
  outDir: "dist",
  outExtensions: () => ({ js: ".mjs" }),
  sourcemap: true,
  clean: true,
  dts: false,
});
