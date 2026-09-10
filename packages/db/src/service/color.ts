import { CATALOG_LIMITS } from "@bigmotors/core";
import { NappError } from "@napp/error";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { colors } from "../schema/references.js";
import { defineInject, INJECT, Token, TOKEN } from "@napp/di";
import { TKN_DB, type BigMotorsDb } from "../db.js";

const fields = z.object({
    name: z.string().trim().min(1).max(CATALOG_LIMITS.title),
    description: z.string().trim().max(CATALOG_LIMITS.description)
        .transform((value) => value === "" ? null : value).nullable().optional(),
    hexCode: z.string().trim().transform((value) => value === "" ? null : value)
        .pipe(z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable()).nullable().optional(),
    sortOrder: z.number().int().min(-2_147_483_648).max(2_147_483_647).optional(),
    isActive: z.boolean().optional(),
}).strict();

const updateFields = fields.partial().refine(
    (value) => Object.values(value).some((field) => field !== undefined),
    "At least one field is required.",
);
const listParams = z.object({
    limit: z.number().int().min(1).max(100).default(50),
    offset: z.number().int().min(0).max(2_147_483_647).default(0),
    isActive: z.boolean().optional(),
}).strict();
const colorId = z.string().uuid();

export type Color = typeof colors.$inferSelect;
export type CreateColorInput = z.input<typeof fields>;
export type UpdateColorInput = z.input<typeof updateFields>;
export type ListColorsParams = z.input<typeof listParams>;

function parse<T extends z.ZodType>(schema: T, value: unknown): z.output<T> {
    const result = schema.safeParse(value);
    if (!result.success) {
        throw new NappError("Invalid color input.", { code: "COLOR_INVALID_INPUT", status: 400 });
    }
    return result.data;
}

function storageError(error: unknown): never {
    if (error instanceof NappError) throw error;
    // Drizzle wraps driver errors; constraints remain the authority for races.
    const cause = error instanceof Error && error.cause ? error.cause : error;
    if (typeof cause === "object" && cause !== null && "code" in cause && "constraint" in cause) {
        if (cause.code === "23505" && cause.constraint === "colors_name_unique") {
            throw new NappError("A color with this name already exists.", { code: "COLOR_NAME_CONFLICT", status: 409 });
        }
        if ((cause.code === "23503" || cause.code === "23001")
            && (cause.constraint === "vehicles_exterior_color_id_colors_id_fk"
                || cause.constraint === "vehicles_interior_color_id_colors_id_fk")) {
            throw new NappError("This color is in use. Deactivate it instead.", { code: "COLOR_IN_USE", status: 409 });
        }
    }
    throw new NappError("Color storage operation failed.", { code: "COLOR_STORAGE_ERROR", status: 500, cause: error });
}

function requireColor(row: Color | undefined): Color {
    if (!row) throw new NappError("Color not found.", { code: "COLOR_NOT_FOUND", status: 404 });
    return row;
}

export class ColorService {
    static [TOKEN] = Token.create<ColorService>("ColorService");
    static [INJECT] = defineInject(ColorService,
        [TKN_DB] as const
    );

    constructor(private readonly db: BigMotorsDb) { }
    

    async list(param: ListColorsParams = {}): Promise<Color[]> {
        const input = parse(listParams, param);
        try {
            return await this.db.select().from(colors)
                .where(input.isActive === undefined ? undefined : eq(colors.isActive, input.isActive))
                .orderBy(asc(colors.sortOrder), asc(colors.name), asc(colors.id))
                .limit(input.limit).offset(input.offset);
        } catch (error) {
            storageError(error);
        }
    }

    async create(param: CreateColorInput): Promise<Color> {
        const input = parse(fields, param);
        try {
            const [row] = await this.db.insert(colors).values(input).returning();
            return requireColor(row);
        } catch (error) {
            storageError(error);
        }
    }

    async update(id: string, param: UpdateColorInput): Promise<Color> {
        const key = parse(colorId, id);
        const input = parse(updateFields, param);
        try {
            const [row] = await this.db.update(colors).set(input).where(eq(colors.id, key)).returning();
            return requireColor(row);
        } catch (error) {
            storageError(error);
        }
    }

    async delete(id: string): Promise<Color> {
        const key = parse(colorId, id);
        try {
            const [row] = await this.db.delete(colors).where(eq(colors.id, key)).returning();
            return requireColor(row);
        } catch (error) {
            storageError(error);
        }
    }
}
