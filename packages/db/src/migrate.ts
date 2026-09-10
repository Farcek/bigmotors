import { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { migrationConfig, migrationConnectionString } from "./migrations.js";

async function main(): Promise<void> {
  const connectionString = migrationConnectionString(process.env);
  if (readMigrationFiles(migrationConfig).length === 0) throw new Error("No migration files found");
  const client = new Client({ connectionString, connectionTimeoutMillis: 10_000, application_name: "bigmotors-migrate" });
  try {
    await client.connect();
    // One dedicated session owns the lock, migration transaction, and connection.
    const result = await client.query<{ locked: boolean }>("SELECT pg_try_advisory_lock(724001, 2) AS locked");
    if (!result.rows[0]?.locked) throw new Error("Another migration process is running");
    await client.query("SET search_path TO public");
    await migrate(drizzle(client), migrationConfig);
    console.log("Database migrations completed.");
  } finally {
    // Closing the dedicated session also releases its advisory lock on failure.
    await client.end();
  }
}

try {
  await main();
} catch (error) {
  // Driver errors can include connection details; never print the raw error.
  const safeMessages = [
    "DB_CONNECTION_STRING is required",
    "DB_CONNECTION_STRING must be a PostgreSQL URL",
    "DB_CONNECTION_STRING must specify a PostgreSQL host and database",
    "No migration files found",
    "Another migration process is running",
  ];
  console.error(error instanceof Error && safeMessages.includes(error.message)
    ? error.message
    : "Database migration failed. Check connectivity, permissions and the reviewed migration files.");
  process.exitCode = 1;
}
