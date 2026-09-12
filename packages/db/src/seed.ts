import { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { NappError } from "@napp/error";
import { DBConfig } from "./config.js";
import * as schema from "./schema/index.js";
import { seedReferences } from "./seeds/run.js";

async function main(): Promise<void> {
  const config = new DBConfig(process.env);
  const client = new Client({
    connectionString: config.DATABASE_URL,
    connectionTimeoutMillis: 10_000,
    application_name: "bigmotors-seed",
  });
  try {
    await client.connect();
    const summary = await seedReferences(drizzle(client, { schema }));
    console.table(summary);
    console.log("Reference seed completed. Existing rows were not updated. Company seed lists may be empty.");
  } finally {
    await client.end();
  }
}

try {
  await main();
} catch (error) {
  console.error(error instanceof NappError ? error.message
    : "Reference seed failed. Check DATABASE_URL, applied migrations and database permissions.");
  process.exitCode = 1;
}
