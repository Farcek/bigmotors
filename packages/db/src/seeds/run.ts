import { sql, type SQL } from "drizzle-orm";
import { NappError } from "@napp/error";
import { z } from "zod";
import type { BigMotorsDb } from "../db.js";
import * as schema from "../schema/index.js";
import { allReferenceSeeds, seedId, seedTables, type ReferenceSeed, type SeedTable } from "./data.js";

const tables = {
  colors: schema.colors, vehicle_body_types: schema.vehicleBodyTypes,
  vehicle_features: schema.vehicleFeatures, vehicle_brands: schema.vehicleBrands,
  vehicle_models: schema.vehicleModels, vehicle_variants: schema.vehicleVariants,
  part_categories: schema.partCategories, part_brands: schema.partBrands,
  tire_brands: schema.tireBrands, tire_models: schema.tireModels,
  branches: schema.branches, locations: schema.locations,
} satisfies Record<SeedTable, unknown>;

const parents: Partial<Record<SeedTable, { table: SeedTable; column: string; optional?: boolean }>> = {
  vehicle_models: { table: "vehicle_brands", column: "brand_id" },
  vehicle_variants: { table: "vehicle_models", column: "model_id" },
  tire_models: { table: "tire_brands", column: "brand_id" },
  part_categories: { table: "part_categories", column: "parent_id", optional: true },
};

const rowSchema = z.object({
  key: z.number().int().min(1).max(999_999_999_999),
  table: z.enum(seedTables), name: z.string().trim().min(1).max(255),
  parentKey: z.number().int().positive().optional(),
  hexCode: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  description: z.string().max(512).optional(),
}).strict();

function invalidSeed(): never {
  throw new NappError("Invalid reference seed data or parent order.", { code: "SEED_INVALID_DATA" });
}

function validateSeeds(input: readonly ReferenceSeed[]) {
  const parsed = z.array(rowSchema).safeParse(input);
  if (!parsed.success) invalidSeed();
  const seen = new Map<number, SeedTable>();
  for (const row of parsed.data) {
    const parent = parents[row.table];
    if (seen.has(row.key) || (row.hexCode !== undefined && row.table !== "colors")) invalidSeed();
    if (row.parentKey !== undefined) {
      if (!parent || seen.get(row.parentKey) !== parent.table) invalidSeed();
    } else if (parent && !parent.optional) invalidSeed();
    seen.set(row.key, row.table);
  }
  return parsed.data;
}

export interface SeedCount { inserted: number; existing: number; skipped: number }
export type SeedSummary = Record<SeedTable, SeedCount>;

export async function seedReferences(db: Pick<BigMotorsDb, "transaction">, input: readonly ReferenceSeed[] = allReferenceSeeds): Promise<SeedSummary> {
  const rows = validateSeeds(input);
  return db.transaction(async (tx) => {
    // Давхар seed ажиллахад нэг transaction дууссаны дараа дараагийнх эхэлнэ.
    await tx.execute(sql`select pg_advisory_xact_lock(724001, 3)`);
    const summary = Object.fromEntries(seedTables.map((table) => [table, { inserted: 0, existing: 0, skipped: 0 }])) as SeedSummary;
    const resolved = new Map<number, { id: string; active: boolean }>();
    for (const row of rows) {
      const parent = row.parentKey === undefined ? undefined : resolved.get(row.parentKey);
      if (row.parentKey !== undefined && !parent?.active) {
        summary[row.table].skipped++;
        continue;
      }
      const table = tables[row.table];
      const relation = parents[row.table];
      const parentScope = relation
        ? sql`${sql.identifier(relation.column)} is not distinct from ${parent?.id ?? null}::uuid`
        : sql`true`;
      const id = seedId(row.key);
      const findExisting = () => tx.execute<{ id: string; is_active: boolean; parent_matches: boolean }>(sql`
        select id, is_active, (${parentScope}) as parent_matches from ${table}
        where id = ${id}::uuid or (lower(btrim(name)) = lower(btrim(${row.name})) and ${parentScope})
        order by (id = ${id}::uuid) desc limit 1 for update
      `);
      let existing = (await findExisting()).rows[0];
      if (!existing) {
        const columns = ["id", "name", "description"];
        const values: SQL[] = [sql`${id}::uuid`, sql`${row.name}`, sql`${row.description ?? null}`];
        if (row.table === "colors") {
          columns.push("hex_code");
          values.push(sql`${row.hexCode ?? null}`);
        }
        if (relation) {
          columns.push(relation.column);
          values.push(sql`${parent?.id ?? null}::uuid`);
        }
        const inserted = await tx.execute<{ id: string }>(sql`
          insert into ${table} (${sql.join(columns.map((column) => sql.identifier(column)), sql`, `)})
          values (${sql.join(values, sql`, `)}) on conflict do nothing returning id
        `);
        if (inserted.rows.length) {
          summary[row.table].inserted++;
          resolved.set(row.key, { id, active: true });
          continue;
        }
        existing = (await findExisting()).rows[0];
      }
      if (!existing || !existing.parent_matches) invalidSeed();
      summary[row.table].existing++;
      resolved.set(row.key, { id: existing.id, active: existing.is_active });
    }
    return summary;
  });
}
