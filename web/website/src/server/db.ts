import "server-only";
import { ConfigFiles, TKN_ENV } from "@bigmotors/core";
import { createPgPool, diDBCoreProviders, diDBServiceProviders, TKN_PG_POOL } from "@bigmotors/db";
import { Container } from "@napp/di";

const state = globalThis as typeof globalThis & { bigmotorsWebsitePool?: ReturnType<typeof createPgPool> };
let container: Container | undefined;

export function getWebsiteContainer(): Container {
  if (!container) {
    const root = new Container("website");
    root.asValue(TKN_ENV, process.env);
    root.asClass(ConfigFiles);
    root.registryModule(diDBCoreProviders(), diDBServiceProviders());
    if (!state.bigmotorsWebsitePool) {
      const pool = root.resolve(TKN_PG_POOL);
      pool.on("error", () => console.error("Website database connection error."));
      state.bigmotorsWebsitePool = pool;
    }
    // Next RSC and route bundles can have distinct DI tokens; only the pool is global.
    container = root.child("website-runtime").asValue(TKN_PG_POOL, state.bigmotorsWebsitePool);
  }
  return container;
}
