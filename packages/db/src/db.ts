import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema/index.js";

export function createPgPool(connectionString: string) {
  return new Pool({ connectionString });
}

export function createDb(pool: Pool) {
  return drizzle(pool, { schema });
}

export type BigMotorsDb = ReturnType<typeof createDb>;
