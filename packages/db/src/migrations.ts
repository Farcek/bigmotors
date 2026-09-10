import { fileURLToPath } from "node:url";
import type { MigrationConfig } from "drizzle-orm/migrator";

// Both src/ and dist/ are one level below the package root.
export const migrationConfig: MigrationConfig = {
  migrationsFolder: fileURLToPath(new URL("../migrations/", import.meta.url)),
  migrationsSchema: "drizzle",
  migrationsTable: "__drizzle_migrations",
};

export function migrationConnectionString(env: NodeJS.ProcessEnv): string {
  const value = env.MIGRATION_DATABASE_URL;
  if (!value?.trim()) throw new Error("MIGRATION_DATABASE_URL is required");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("MIGRATION_DATABASE_URL must be a PostgreSQL URL");
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname || url.pathname.length <= 1) {
    throw new Error("MIGRATION_DATABASE_URL must specify a PostgreSQL host and database");
  }
  return value;
}
