import assert from "node:assert/strict";
import { test } from "node:test";
import { SettingsService } from "../src/service/settings.js";
import { testDatabase } from "./support/database.js";
import { testServiceContainer } from "./support/di.js";

test("settings support arbitrary keys, literal values, CRUD and stable filtering", async () => {
  const db = await testDatabase(); const di = testServiceContainer(db); const service = di.resolve(SettingsService);
  try {
    const row = await service.create({ key: "custom/key? &Монгол", value: "  literal value  " });
    assert.deepEqual(await service.findByKey(row.key), row);
    assert.equal(row.value, "  literal value  ");
    await assert.rejects(service.create({ key: row.key, value: "duplicate" }), { code: "SETTINGS_KEY_CONFLICT" });
    assert.equal((await service.update(row.key, { value: "" })).value, "");
    await service.create({ key: "other", value: "1" });
    assert.equal((await service.list({ key: row.key })).length, 1);
    assert.equal((await service.list({ search: "Монгол" }))[0]?.key, row.key);
    assert.equal((await service.list({ search: "%" })).length, 0);
    assert.equal((await service.list({ limit: 1, offset: 1 }))[0]?.key, "other");
    await service.delete(row.key);
    await assert.rejects(service.findByKey(row.key), { code: "SETTINGS_NOT_FOUND" });
    await assert.rejects(service.update("missing", { value: "X" }), { code: "SETTINGS_NOT_FOUND" });
    await assert.rejects(service.delete("missing"), { code: "SETTINGS_NOT_FOUND" });
  } finally { di.destroy(); await db.close(); }
});

test("settings bulk save is atomic, preserves unrelated keys and enforces boundaries", async () => {
  const db = await testDatabase(); const di = testServiceContainer(db); const service = di.resolve(SettingsService);
  try {
    await service.create({ key: "unrelated", value: "keep" });
    await service.save([{ key: "homepage", value: "arbitrary-not-a-uuid" }, { key: "siteTitle", value: "Title" }, { key: "adminEmail", value: "arbitrary-not-an-email" }]);
    await service.save([{ key: "siteTitle", value: "New" }, { key: "custom", value: "" }]);
    assert.equal((await service.findByKey("unrelated")).value, "keep");
    assert.equal((await service.findByKey("siteTitle")).value, "New");
    const before = await service.list();
    await assert.rejects(service.save([{ key: "siteTitle", value: "bad" }, { key: "long", value: "a".repeat(256) }]), { code: "SETTINGS_INVALID_INPUT" });
    await assert.rejects(service.save([{ key: "x", value: "1" }, { key: "x", value: "2" }]), { code: "SETTINGS_INVALID_INPUT" });
    assert.deepEqual(await service.list(), before);
    await db.exec("CREATE FUNCTION reject_setting() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.key='reject' THEN RAISE EXCEPTION 'test'; END IF; RETURN NEW; END $$; CREATE TRIGGER reject_setting BEFORE INSERT ON settings FOR EACH ROW EXECUTE FUNCTION reject_setting();");
    await assert.rejects(service.save([{ key: "siteTitle", value: "rollback" }, { key: "reject", value: "test" }]), { code: "SETTINGS_STORAGE_ERROR" });
    assert.deepEqual(await service.list(), before);
    for (const input of [{ key: "", value: "" }, { key: " ", value: "x" }, { key: "k".repeat(256), value: "" }, { key: "key", value: "v".repeat(256) }, { key: "key", value: "\0" }]) await assert.rejects(service.create(input), { code: "SETTINGS_INVALID_INPUT" });
    await service.create({ key: "k".repeat(255), value: "v".repeat(255) });
    await assert.rejects(db.query('INSERT INTO settings (key,value) VALUES ($1,$2)', [" ", "X"]));
    assert.deepEqual((await db.query<{column_name:string}>("SELECT column_name FROM information_schema.columns WHERE table_name='settings' ORDER BY ordinal_position")).rows.map(r => r.column_name), ["key", "value"]);
  } finally { di.destroy(); await db.close(); }
});
