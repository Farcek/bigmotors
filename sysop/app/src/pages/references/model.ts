import type { Branches } from "@bigmotors/sysop-dti";
import { DTIError } from "@napp/dti-core";

export type ReferenceRow = Branches.Entity & { brandId?: string; modelId?: string; parentId?: string | null };
type Schema = {
  parse: (input: unknown) => unknown;
  safeParse: (input: unknown) => { success: true; data: unknown } | { success: false; error: { issues: { path: PropertyKey[] }[] } };
};
export type ReferenceDefinition = {
  slug: string;
  title: string;
  parent?: { key: "brandId" | "modelId" | "parentId"; label: string; source: string; optional?: boolean };
  createSchema: Schema;
  updateSchema: Schema;
  querySchema: Schema;
  list: (query: unknown, signal?: AbortSignal) => Promise<ReferenceRow[]>;
  create: (input: unknown) => Promise<ReferenceRow>;
  update: (id: string, input: unknown) => Promise<ReferenceRow>;
  remove: (id: string) => Promise<ReferenceRow>;
};
export type ReferenceValues = { name: string; description: string; sortOrder: number | string; isActive: boolean; parent: string | null };
export type ReferenceOption = { value: string; label: string; disabled: boolean };
export const PAGE_SIZE = 20;
export const MAX_PAGE = Math.floor(2147483647 / PAGE_SIZE) + 1;

export function initialValues(def: ReferenceDefinition, row?: ReferenceRow): ReferenceValues {
  return { name: row?.name ?? "", description: row?.description ?? "", sortOrder: row?.sortOrder ?? 0,
    isActive: row?.isActive ?? true, parent: def.parent ? row?.[def.parent.key] ?? null : null };
}

export function formPayload(def: ReferenceDefinition, values: ReferenceValues, editing: boolean) {
  const { parent, ...fields } = values;
  return !editing && def.parent ? { ...fields, [def.parent.key]: parent } : fields;
}

export function validateForm(def: ReferenceDefinition, values: ReferenceValues, editing: boolean) {
  const result = (editing ? def.updateSchema : def.createSchema).safeParse(formPayload(def, values, editing));
  const errors: Record<string, string> = {};
  if (!result.success) for (const issue of result.error.issues) {
    const field = String(issue.path[0]);
    if (field === def.parent?.key) errors.parent = "Харьяалах лавлахыг сонгоно уу.";
    else errors[field] = ({ name: "Нэрийг 1–255 тэмдэгтээр оруулна уу.", description: "Тайлбар 512 тэмдэгтээс хэтрэхгүй байна.", sortOrder: "-2147483648–2147483647 хооронд бүхэл тоо оруулна уу." } as Record<string, string>)[field] ?? "Утгыг шалгана уу.";
  }
  return errors;
}

export function referenceError(error: unknown) {
  if (error instanceof DTIError) {
    if (error.code?.endsWith("_NAME_CONFLICT")) return "Ижил нэртэй бүртгэл байна.";
    if (error.code?.endsWith("_PARENT_INACTIVE")) return "Харьяалах лавлах эсвэл түүний дээд лавлах идэвхгүй байна. Сонголтыг шинэчилнэ үү.";
    if (error.code?.endsWith("_PARENT_NOT_FOUND")) return "Харьяалах лавлах олдсонгүй. Сонголтыг шинэчилнэ үү.";
    if (error.code?.endsWith("_IN_USE")) return "Энэ бүртгэл ашиглагдаж байна. Устгахын оронд идэвхгүй болгоно уу.";
    if (error.code?.endsWith("_NOT_FOUND")) return "Бүртгэл олдсонгүй. Жагсаалтыг шинэчилнэ үү.";
    if (error.status === 401) return "Нэвтрэх шаардлагатай байна.";
    if (error.status === 403) return "Энэ үйлдлийг хийх эрхгүй байна.";
    if (error.code === "NETWORK_ERROR") return "Сервертэй холбогдож чадсангүй. Дахин оролдоно уу.";
    if (error.code?.endsWith("_INVALID_INPUT")) return "Оруулсан утгуудыг шалгана уу.";
  }
  return "Үйлдэл амжилтгүй боллоо. Дахин оролдоно уу.";
}

export function listState(def: ReferenceDefinition, params: URLSearchParams) {
  const requested = Number(params.get("page") ?? 1);
  const page = Number.isSafeInteger(requested) && requested > 0 ? Math.min(requested, MAX_PAGE) : 1;
  const status = ["true", "false"].includes(params.get("isActive") ?? "") ? params.get("isActive")! : "";
  const value = def.parent ? params.get(def.parent.key) : null;
  const parent = value && def.querySchema.safeParse({ [def.parent!.key]: value }).success ? value : null;
  const rootOnly = Boolean(def.parent?.optional && !parent && params.get("rootOnly") === "true");
  const query = { limit: PAGE_SIZE + 1, offset: (page - 1) * PAGE_SIZE,
    ...(status ? { isActive: status === "true" } : {}),
    ...(parent ? { [def.parent!.key]: parent } : {}), ...(rootOnly ? { rootOnly: true } : {}) };
  return { page, status, parent, rootOnly, query };
}

export async function listAll(def: ReferenceDefinition, signal: AbortSignal) {
  const rows: ReferenceRow[] = [];
  for (let offset = 0; ; offset += 100) {
    signal.throwIfAborted();
    const batch = await def.list({ limit: 100, offset }, signal);
    rows.push(...batch);
    if (batch.length < 100) return rows;
  }
}

// Labels include ancestry; inactive or broken ancestry cannot be selected for creation.
export function parentOptions(rows: ReferenceRow[], ancestors: ReferenceRow[] = []): ReferenceOption[] {
  const index = new Map([...ancestors, ...rows].map((row) => [row.id, row]));
  return [...new Map(rows.map((row) => [row.id, row])).values()].map((row) => {
    const names: string[] = [];
    const visited = new Set<string>();
    let current: ReferenceRow | undefined = row;
    let disabled = false;
    while (current) {
      if (visited.has(current.id)) { disabled = true; break; }
      visited.add(current.id);
      names.unshift(current.name);
      disabled ||= !current.isActive;
      const parentId: string | null | undefined = current.parentId ?? current.brandId ?? current.modelId;
      current = parentId ? index.get(parentId) : undefined;
      if (parentId && !current) { names.unshift("Лавлах олдсонгүй"); disabled = true; }
    }
    return { value: row.id, label: names.join(" / ") + (disabled ? " (идэвхгүй/боломжгүй)" : ""), disabled };
  });
}
