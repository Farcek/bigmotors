import { fileURLToPath } from "node:url";
import type { MigrationConfig } from "drizzle-orm/migrator";

// Both src/ and dist/ are one level below the package root.
export const migrationConfig: MigrationConfig = {
  migrationsFolder: fileURLToPath(new URL("../migrations/", import.meta.url)),
  migrationsSchema: "drizzle",
  migrationsTable: "__drizzle_migrations",
};

export function migrationConnectionString(env: NodeJS.ProcessEnv): string {
  const value = env.DB_CONNECTION_STRING;
  if (!value?.trim()) throw new Error("DB_CONNECTION_STRING is required");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("DB_CONNECTION_STRING must be a PostgreSQL URL");
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname || url.pathname.length <= 1) {
    throw new Error("DB_CONNECTION_STRING must specify a PostgreSQL host and database");
  }
  return value;
}
