import { asClass, asFactory, type Container, type Module } from "@napp/di";
import { DBConfig } from "./config.js";
import { TKN_DB, TKN_PG_POOL } from "./db.js";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema/index.js";
import { ColorService } from "./service/color.js";
import { BranchService } from "./service/branch.js";



export function diDBCoreProviders() {
    const dbCore: Module = {
        name: "db-core",
        providers: [
            asClass(DBConfig),
            asFactory(TKN_PG_POOL, (di) => {
                const config = di.resolve(DBConfig);
                return new Pool({
                    connectionString: config.DATABASE_URL,
                    min: config.DATABASE_POOL_MIN,
                    max: config.DATABASE_POOL_MAX
                })
            }),
            asFactory(TKN_DB, (di) => {
                const pool = di.resolve(TKN_PG_POOL);
                return drizzle(pool, { schema })
            })
        ]
    };
    return dbCore;
}
export function diDBServiceProviders() {
    const dbService: Module = {
        name: "db-service",
        providers: [
            asClass(ColorService),
            asClass(BranchService),

        ]
    };
    return dbService;
}