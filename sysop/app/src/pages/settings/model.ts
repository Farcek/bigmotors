import { SETTINGS_KEY_ADMINEMAIL, SETTINGS_KEY_SITE_TITLE } from "@bigmotors/core";
import { Settings } from "@bigmotors/sysop-dti";
import { DTIError } from "@napp/dti-core";
import { isEmail } from "@mantine/form";

export const ADMIN_SETTING_KEYS = [SETTINGS_KEY_SITE_TITLE, SETTINGS_KEY_ADMINEMAIL] as const;
export type SettingsValues = Record<typeof ADMIN_SETTING_KEYS[number], string>;
export function settingsValues(entries: Settings.Entity[]): SettingsValues {
  const values = new Map(entries.map(entry => [entry.key, entry.value]));
  return {
    [SETTINGS_KEY_SITE_TITLE]: values.get(SETTINGS_KEY_SITE_TITLE) ?? "",
    [SETTINGS_KEY_ADMINEMAIL]: values.get(SETTINGS_KEY_ADMINEMAIL) ?? "",
  };
}
export function settingsEntries(values: SettingsValues): Settings.Entity[] {
  return ADMIN_SETTING_KEYS.map(key => ({ key, value: values[key] }));
}
export function settingsValidation(values: SettingsValues) {
  const errors: Record<string, string> = {};
  for (const key of ADMIN_SETTING_KEYS) if (!Settings.value.safeParse(values[key]).success) errors[key] = "255 тэмдэгтээс хэтрэхгүй байна.";
  const email = values[SETTINGS_KEY_ADMINEMAIL];
  if (email && isEmail("invalid")(email)) errors[SETTINGS_KEY_ADMINEMAIL] = "Зөв имэйл хаяг оруулна уу.";
  return errors;
}
export function settingsError(error: unknown) {
  if (error instanceof DTIError) {
    if (error.status === 400) return "Тохиргооны утгуудыг шалгана уу.";
    if (error.status === 401) return "Нэвтрэх шаардлагатай байна.";
    if (error.status === 403) return "Энэ үйлдлийг хийх эрхгүй байна.";
  }
  return "Тохиргоог унших эсвэл хадгалах үед алдаа гарлаа. Дахин оролдоно уу.";
}
