import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/schema/index.ts", "src/schema-hooks.ts", "src/migrate.ts"],
  platform: "node", target: "node24", format: "esm",
  outExtensions: () => ({ js: ".mjs", dts: ".d.mts" }), dts: true, sourcemap: true, clean: true,
});
