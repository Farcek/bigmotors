import { defineConfig } from "drizzle-kit";

// Generation is offline. Only the standalone runner reads DB credentials.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./migrations",
  breakpoints: true,
});
