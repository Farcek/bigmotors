import "server-only";
import { TKN_ENV } from "@bigmotors/core";
import { diDBCoreProviders, diDBServiceProviders, TKN_PG_POOL } from "@bigmotors/db";
import { Container } from "@napp/di";

const state = globalThis as typeof globalThis & { bigmotorsWebsiteDb?: Container };

export function getWebsiteContainer(): Container {
  if (!state.bigmotorsWebsiteDb) {
    const container = new Container("website");
    container.asValue(TKN_ENV, process.env);
    container.registryModule(diDBCoreProviders(), diDBServiceProviders());
    const pool = container.resolve(TKN_PG_POOL);
    pool.on("error", () => console.error("Website database connection error."));
    // Dev hot reload бүрд шинэ connection pool үүсгэхгүй.
    state.bigmotorsWebsiteDb = container;
  }
  return state.bigmotorsWebsiteDb;
}
