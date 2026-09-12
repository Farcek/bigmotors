export const PAGE_STATUSES = ["draft", "published", "archived"] as const;
export type PageStatus = typeof PAGE_STATUSES[number];
export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };
export const PAGE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
