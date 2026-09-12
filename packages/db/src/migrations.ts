import { fileURLToPath } from "node:url";
import type { MigrationConfig } from "drizzle-orm/migrator";

// Both src/ and dist/ are one level below the package root.
export const migrationConfig: MigrationConfig = {
  migrationsFolder: fileURLToPath(new URL("../migrations/", import.meta.url)),
  migrationsSchema: "drizzle",
  migrationsTable: "__drizzle_migrations",
};
