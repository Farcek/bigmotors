import assert from "node:assert/strict";
import { test } from "node:test";
import { Branches, Colors } from "../src/index.js";

const id = "d4ea26c2-52a0-4223-8cc1-d649b84281d1";
const branch: Branches.Entity = {
  id, name: "Company branch", description: null, sortOrder: 0, isActive: true,
  createdAt: "2026-09-10T00:00:00.000Z", updatedAt: "2026-09-10T08:00:00+08:00",
};
const color: Colors.Entity = { ...branch, name: "White", hexCode: "#FFFFFF" };

for (const [name, contract, sample] of [["color", Colors, color], ["branch", Branches, branch]] as const) {
  test(`${name} actions describe CRUD routes and service-shaped results`, () => {
    const base = name === "color" ? "/colors" : "/branches";
    for (const [action, suffix, method, path] of [
      [contract.list, "List", "GET", base],
      [contract.create, "Create", "POST", base],
      [contract.update, "Update", "PATCH", `${base}/:id`],
      [contract.remove, "Delete", "DELETE", `${base}/:id`],
    ] as const) {
      assert.equal(action.name, `${name}${suffix}`);
      assert.equal(action.method, method);
      assert.equal(action.path, path);
    }
    assert.equal(contract.list.body, undefined);
    assert.equal(contract.remove.body, undefined);
    assert.equal(contract.list.query, contract.listQuery);
    assert.equal(contract.list.result, contract.listResult);
    assert.equal(contract.create.body, contract.createBody);
    assert.equal(contract.update.body, contract.updateBody);
    assert.equal(contract.update.params, contract.params);
    assert.equal(contract.remove.params, contract.params);
    assert.equal(contract.remove.result, contract.entity);
    assert.deepEqual(contract.listResult.parse([sample]), [sample]);
    assert.deepEqual(contract.listResult.parse([]), []);
    assert.equal(contract.listResult.safeParse({ items: [sample], total: 1 }).success, false);
  });

  test(`${name} query accepts typed or wire scalars without truthiness coercion`, () => {
    assert.deepEqual(contract.listQuery.parse({}), { limit: 50, offset: 0 });
    assert.deepEqual(contract.listQuery.parse({ limit: "10", offset: "20", isActive: "false" }), { limit: 10, offset: 20, isActive: false });
    assert.deepEqual(contract.listQuery.parse({ limit: 100, offset: 0, isActive: true }), { limit: 100, offset: 0, isActive: true });
    assert.equal(contract.listQuery.parse({ isActive: "true" }).isActive, true);
    assert.equal(contract.listQuery.parse({ isActive: false }).isActive, false);
    for (const input of [
      undefined, null, { limit: 0 }, { limit: "101" }, { limit: "" }, { offset: " " },
      { offset: "1.5" }, { offset: -1 }, { offset: 2_147_483_648 }, { limit: Infinity },
      { limit: true }, { limit: null }, { limit: [10] }, { limit: { value: 10 } },
      { isActive: "0" }, { isActive: 0 }, { isActive: "FALSE" }, { isActive: null },
      { isActive: [] }, { search: "unsupported" },
    ]) assert.equal(contract.listQuery.safeParse(input).success, false, JSON.stringify(input));
  });

  test(`${name} bodies normalize optional text and preserve patch omission`, () => {
    assert.deepEqual(contract.createBody.parse({ name: "  Label  " }), { name: "Label" });
    assert.deepEqual(contract.createBody.parse({ name: "Label", description: " " }), { name: "Label", description: null });
    assert.deepEqual(contract.updateBody.parse({ description: null }), { description: null });
    assert.deepEqual(contract.updateBody.parse({ description: "  Updated  " }), { description: "Updated" });
    assert.deepEqual(contract.updateBody.parse({ isActive: false }), { isActive: false });
    const patch = contract.updateBody.parse({ name: "Renamed" });
    assert.equal(Object.hasOwn(patch, "description"), false);
    assert.equal(contract.createBody.safeParse({ name: "x".repeat(255), description: "x".repeat(512), sortOrder: -2_147_483_648 }).success, true);
    for (const input of [
      {}, { name: " " }, { name: null }, { name: "x".repeat(256) },
      { name: "Label", description: "x".repeat(513) }, { name: "Label", sortOrder: 1.5 },
      { name: "Label", sortOrder: 2_147_483_648 }, { name: "Label", isActive: "false" },
      { name: "Label", id }, { name: "Label", createdAt: branch.createdAt },
      { name: "Label", locationId: id },
    ]) assert.equal(contract.createBody.safeParse(input).success, false);
    for (const input of [{}, { name: undefined }, { name: " " }, { id }, { updatedAt: branch.updatedAt }]) {
      assert.equal(contract.updateBody.safeParse(input).success, false);
    }
  });

  test(`${name} params require exactly one UUID`, () => {
    assert.deepEqual(contract.params.parse({ id }), { id });
    for (const input of [{}, { id: "invalid" }, { id: null }, { id: [id] }, { id, extra: true }]) {
      assert.equal(contract.params.safeParse(input).success, false);
    }
  });

  test(`${name} entity validates JSON-safe dates and rejects extra or missing fields`, () => {
    assert.deepEqual(contract.entity.parse(JSON.parse(JSON.stringify(sample))), sample);
    for (const input of [
      {}, { ...sample, id: "invalid" }, { ...sample, description: undefined },
      { ...sample, createdAt: "not-a-date" }, { ...sample, createdAt: new Date() },
      { ...sample, updatedAt: "2026-09-10" }, { ...sample, isActive: "true" },
      { ...sample, sortOrder: 1.5 }, { ...sample, password: "unexpected" },
    ]) assert.equal(contract.entity.safeParse(input).success, false);
  });
}

test("color HEX is optional on input, nullable on output and not a branch field", () => {
  assert.deepEqual(Colors.createBody.parse({ name: "White", hexCode: " #aBc123 " }), { name: "White", hexCode: "#aBc123" });
  assert.deepEqual(Colors.updateBody.parse({ hexCode: " " }), { hexCode: null });
  assert.deepEqual(Colors.updateBody.parse({ hexCode: null }), { hexCode: null });
  assert.equal(Colors.entity.safeParse({ ...color, hexCode: null }).success, true);
  assert.equal(Colors.entity.safeParse({ ...color, hexCode: undefined }).success, false);
  for (const hexCode of ["#FFF", "FFFFFF", "#12345678", "#GG0000", 123456]) {
    assert.equal(Colors.createBody.safeParse({ name: "White", hexCode }).success, false);
    assert.equal(Colors.updateBody.safeParse({ hexCode }).success, false);
    assert.equal(Colors.entity.safeParse({ ...color, hexCode }).success, false);
  }
  assert.equal(Branches.createBody.safeParse({ name: "Branch", hexCode: "#FFFFFF" }).success, false);
  assert.equal(Branches.entity.safeParse({ ...branch, hexCode: null }).success, false);
});

test("all public action names and method/path pairs are unique", () => {
  const actions = [Colors.list, Colors.create, Colors.update, Colors.remove, Branches.list, Branches.create, Branches.update, Branches.remove];
  assert.equal(new Set(actions.map((action) => action.name)).size, actions.length);
  assert.equal(new Set(actions.map((action) => `${action.method} ${action.path}`)).size, actions.length);
});
