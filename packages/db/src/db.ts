import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export function createPgPool(connectionString: string) {
  return new Pool({ connectionString });
}

export function createDb(connectionString: string) {
  return drizzle(createPgPool(connectionString), { schema });
}

export type ChipCrmDb = ReturnType<typeof createDb>;
