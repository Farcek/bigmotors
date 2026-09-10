import { Container } from "@napp/di";
import type { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { TKN_DB, type BigMotorsDb } from "../../src/db.js";
import { diDBServiceProviders } from "../../src/di.js";
import * as schema from "../../src/schema/index.js";

export function testServiceContainer(db: PGlite): Container {
  const container = new Container("db-service-test");
  // Services exercise shared Drizzle CRUD only; PGlite replaces the node-postgres
  // driver in tests. Driver-specific APIs such as $client must not be used here.
  const orm = drizzle(db, { schema }) as unknown as BigMotorsDb;
  return container.asValue(TKN_DB, orm).registryModule(diDBServiceProviders());
}
