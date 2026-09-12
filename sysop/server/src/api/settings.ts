import { SettingsService } from "@bigmotors/db";
import { Settings } from "@bigmotors/sysop-dti";
import type { APIDti } from "./dti.js";

export function buildSettingsApi(dti: APIDti): void {
  dti.action(Settings.list, ({ query, meta: { di } }) => di.resolve(SettingsService).list(query));
  dti.action(Settings.get, ({ params, meta: { di } }) => di.resolve(SettingsService).findByKey(params.key));
  dti.action(Settings.create, ({ body, meta: { di } }) => di.resolve(SettingsService).create(body));
  dti.action(Settings.update, ({ params, body, meta: { di } }) => di.resolve(SettingsService).update(params.key, body));
  dti.action(Settings.remove, ({ params, meta: { di } }) => di.resolve(SettingsService).delete(params.key));
  dti.action(Settings.save, ({ body, meta: { di } }) => di.resolve(SettingsService).save(body.entries));
}
