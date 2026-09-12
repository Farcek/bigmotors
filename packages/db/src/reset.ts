import { Client } from "pg";
import { NappError } from "@napp/error";
import { DBConfig } from "./config.js";
import { resetDatabaseSql } from "./reset-sql.js";

async function main(): Promise<void> {
  const config = new DBConfig(process.env);
  const client = new Client({
    connectionString: config.DATABASE_URL,
    connectionTimeoutMillis: 10_000,
    application_name: "bigmotors-reset",
  });
  try {
    await client.connect();
    await client.query(resetDatabaseSql);
    console.log("Database reset completed. Application tables and migration history removed.");
  } finally {
    await client.end();
  }
}

try {
  await main();
} catch (error) {
  console.error(error instanceof NappError ? error.message
    : "Database reset failed. Check DATABASE_URL, connectivity and schema ownership.");
  process.exitCode = 1;
}
