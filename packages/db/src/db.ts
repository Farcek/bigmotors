import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema/index.js";
import type { DBConfig } from "./config.js";
import { Token } from "@napp/di";

export function createPgPool(config: DBConfig) {
  return new Pool({
    connectionString: config.DATABASE_URL,
    min: config.DATABASE_POOL_MIN,
    max: config.DATABASE_POOL_MAX
  });
}

export function createDb(pool: Pool) {
  return drizzle(pool, { schema });
}

export type BigMotorsDb = ReturnType<typeof createDb>;

export const TKN_DB = Token.create<BigMotorsDb>("DB");
export const TKN_PG_POOL = Token.create<Pool>("PG_POOL");
