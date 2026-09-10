import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { migrationConfig } from "../../src/migrations.js";

// Execute the committed SQL, including triggers, in an isolated in-memory DB.
export async function testDatabase(): Promise<PGlite> {
  const db = new PGlite();
  try {
    await migrate(drizzle(db), migrationConfig);
    return db;
  } catch (error) {
    await db.close();
    throw error;
  }
}

export async function transaction<T>(db: PGlite, action: () => Promise<T>): Promise<T> {
  await db.exec("BEGIN");
  try {
    const result = await action();
    await db.exec("COMMIT");
    return result;
  } catch (error) {
    await db.exec("ROLLBACK");
    throw error;
  }
}
