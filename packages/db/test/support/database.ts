import { PGlite } from "@electric-sql/pglite";
import { is, SQL, sql } from "drizzle-orm";
import { getTableConfig, PgColumn, PgDialect, PgTable } from "drizzle-orm/pg-core";
import * as schema from "../../src/schema/index.js";
import { schemaHooks } from "../../src/schema-hooks.js";

const dialect = new PgDialect();
const identifier = (name: string | undefined) => {
  if (!name) throw new Error("DDL identifier missing");
  return dialect.escapeName(name);
};
const names = (columns: { name: string }[]) => columns.map((column) => identifier(column.name)).join(", ");

function expression(value: SQL): string {
  // DDL expressions refer to columns without the query-time table qualifier.
  const unqualify = (fragment: SQL): SQL => new SQL(fragment.queryChunks.map((chunk) => {
    if (is(chunk, PgColumn)) return sql.identifier(chunk.name);
    if (is(chunk, SQL)) return unqualify(chunk);
    return chunk;
  }));
  return dialect.sqlToQuery(unqualify(value).inlineParams()).sql;
}

// Test-only, in-memory provisioning from the actual Drizzle metadata. No files,
// snapshots, migration history, environment variables, or external DB connection.
export async function testDatabase(): Promise<PGlite> {
  const db = new PGlite();
  try {
    const tables = Object.values(schema).filter((value) => is(value, PgTable)).map(getTableConfig);
    for (const table of tables) {
      const definitions = table.columns.map((column) => {
        let definition = `${identifier(column.name)} ${column.getSQLType()}`;
        if (column.notNull) definition += " NOT NULL";
        if (column.primary) definition += " PRIMARY KEY";
        if (column.isUnique) definition += ` CONSTRAINT ${identifier(column.uniqueName)} UNIQUE`;
        if (column.default !== undefined) {
          definition += ` DEFAULT ${expression(is(column.default, SQL) ? column.default : sql`${column.default}`)}`;
        }
        return definition;
      });
      for (const key of table.primaryKeys) definitions.push(`CONSTRAINT ${identifier(key.getName())} PRIMARY KEY (${names(key.columns)})`);
      for (const key of table.uniqueConstraints) definitions.push(`CONSTRAINT ${identifier(key.getName())} UNIQUE (${names(key.columns)})`);
      for (const check of table.checks) definitions.push(`CONSTRAINT ${identifier(check.name)} CHECK (${expression(check.value)})`);
      await db.exec(`CREATE TABLE ${identifier(table.name)} (${definitions.join(", ")})`);
    }
    for (const table of tables) {
      for (const key of table.foreignKeys) {
        const reference = key.reference();
        await db.exec(`ALTER TABLE ${identifier(table.name)} ADD CONSTRAINT ${identifier(key.getName())}
          FOREIGN KEY (${names(reference.columns)}) REFERENCES ${identifier(getTableConfig(reference.foreignTable).name)}
          (${names(reference.foreignColumns)}) ON DELETE ${key.onDelete ?? "no action"} ON UPDATE ${key.onUpdate ?? "no action"}`);
      }
      for (const { config } of table.indexes) {
        if (!config.name) throw new Error("Schema indexes must be explicitly named");
        const columns = config.columns.map((column) => {
          if (is(column, SQL)) return `(${expression(column)})`;
          if (!("name" in column) || !column.name) throw new Error("Index column name missing");
          const order = column.indexConfig?.order ?? "asc";
          const nulls = column.indexConfig?.nulls;
          return `${identifier(column.name)} ${order}${nulls ? ` NULLS ${nulls}` : ""}`;
        });
        await db.exec(`CREATE ${config.unique ? "UNIQUE " : ""}INDEX ${identifier(config.name)} ON ${identifier(table.name)}
          USING ${config.method ?? "btree"} (${columns.join(", ")})${config.where ? ` WHERE ${expression(config.where)}` : ""}`);
      }
    }
    for (const hook of schemaHooks) await db.exec(dialect.sqlToQuery(hook).sql);
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
