import { defineInject, INJECT, TOKEN, Token } from "@napp/di";
import { NappError } from "@napp/error";
import { and, asc, eq, ilike, sql } from "drizzle-orm";
import { z } from "zod";
import { TKN_DB, type BigMotorsDb } from "../db.js";
import { settings } from "../schema/settings.js";

const keyField = z.string().min(1).max(255).refine(v => v.trim().length > 0 && !v.includes("\0"));
const valueField = z.string().max(255).refine(v => !v.includes("\0"));
const fields = z.object({ key: keyField, value: valueField }).strict();
const updateFields = fields.pick({ value: true });
const saveFields = z.array(fields).min(1).max(100).refine(rows => new Set(rows.map(row => row.key)).size === rows.length);
const listFields = z.object({
  limit: z.number().int().min(1).max(100).default(50), offset: z.number().int().min(0).max(2147483647).default(0),
  key: keyField.optional(), search: z.string().max(255).optional(),
}).strict();
export type CreateSettingInput = z.input<typeof fields>;
export type UpdateSettingInput = z.input<typeof updateFields>;
export type ListSettingsInput = z.input<typeof listFields>;

function parse<S extends z.ZodType>(schema: S, value: unknown): z.output<S> {
  const result = schema.safeParse(value);
  if (!result.success) throw new NappError("Invalid settings input.", { code: "SETTINGS_INVALID_INPUT", status: 400 });
  return result.data;
}
function required<T>(row: T | undefined): T {
  if (!row) throw new NappError("Setting not found.", { code: "SETTINGS_NOT_FOUND", status: 404 });
  return row;
}
async function storage<T>(action: () => Promise<T>): Promise<T> {
  try { return await action(); } catch (error) {
    if (error instanceof NappError) throw error;
    const cause = error instanceof Error && error.cause ? error.cause : error;
    if (typeof cause === "object" && cause !== null && "code" in cause && cause.code === "23505") {
      throw new NappError("Setting key already exists.", { code: "SETTINGS_KEY_CONFLICT", status: 409 });
    }
    throw new NappError("Settings storage operation failed.", { code: "SETTINGS_STORAGE_ERROR", status: 500, cause: error });
  }
}

export class SettingsService {
  static [TOKEN] = Token.create<SettingsService>("SettingsService");
  static [INJECT] = defineInject(SettingsService, [TKN_DB] as const);
  constructor(private readonly db: BigMotorsDb) {}

  async list(params: ListSettingsInput = {}) {
    const input = parse(listFields, params); const pattern = input.search?.replace(/[\\%_]/g, "\\$&");
    return storage(() => this.db.select().from(settings).where(and(
      input.key !== undefined ? eq(settings.key, input.key) : undefined,
      pattern ? ilike(settings.key, `%${pattern}%`) : undefined,
    )).orderBy(asc(settings.key)).limit(input.limit).offset(input.offset));
  }
  async findByKey(key: string) {
    const input = parse(keyField, key);
    return storage(async () => required((await this.db.select().from(settings).where(eq(settings.key, input)))[0]));
  }
  async create(body: CreateSettingInput) {
    const input = parse(fields, body);
    return storage(async () => required((await this.db.insert(settings).values(input).returning())[0]));
  }
  async update(key: string, body: UpdateSettingInput) {
    const input = parse(keyField, key); const values = parse(updateFields, body);
    return storage(async () => required((await this.db.update(settings).set(values).where(eq(settings.key, input)).returning())[0]));
  }
  async delete(key: string) {
    const input = parse(keyField, key);
    return storage(async () => required((await this.db.delete(settings).where(eq(settings.key, input)).returning())[0]));
  }
  async save(entries: CreateSettingInput[]) {
    const input = parse(saveFields, entries);
    return storage(() => this.db.insert(settings).values(input).onConflictDoUpdate({
      target: settings.key, set: { value: sql`excluded.value` },
    }).returning());
  }
}
