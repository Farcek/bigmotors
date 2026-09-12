import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { build } from "tsdown";

test("contracts bundle and validate without Node.js globals", async () => {
  const handle = await build({
    config: false,
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    entry: ["src/index.ts"],
    platform: "browser",
    target: "es2022",
    format: "iife",
    globalName: "BigMotorsDti",
    deps: {
      alwaysBundle: [/.*/],
      onlyBundle: ["@napp/dti-core", "@napp/di", "zod", "@bigmotors/core"],
      onlyImport: [],
    },
    dts: false,
    sourcemap: false,
    write: false,
    clean: false,
    logLevel: "silent",
  });

  try {
    const chunks = handle.bundles.flatMap((bundle) => bundle.chunks);
    const entry = chunks.find((chunk) => chunk.type === "chunk" && chunk.isEntry);
    assert.ok(entry && entry.type === "chunk");
    assert.deepEqual(entry.imports, []);
    assert.deepEqual(entry.dynamicImports, []);

    const contracts = runInNewContext(
      `${entry.code}\nBigMotorsDti;`,
      {},
      { timeout: 5_000 },
    ) as typeof import("../src/index.js");
    const browserHealth = contracts.Health;
    assert.equal(browserHealth.check.path, "/health");
    assert.equal(browserHealth.result.safeParse({
      status: "ok", service: "@bigmotors/sysop-server",
    }).success, true);
    assert.equal(browserHealth.result.safeParse({ status: "invalid" }).success, false);
    assert.equal(contracts.Colors.createBody.safeParse({ name: "White", hexCode: "#FFFFFF" }).success, true);
    assert.equal(contracts.Colors.createBody.safeParse({ name: "White", hexCode: "#FFF" }).success, false);
    assert.equal(contracts.Branches.createBody.safeParse({ name: "Branch" }).success, true);
    assert.equal(contracts.Branches.listQuery.parse({ isActive: "false" }).isActive, false);
    assert.equal(contracts.Branches.remove.path, "/branches/:id");
    for (const name of ["VehicleBrands", "VehicleBodyTypes", "VehicleFeatures", "PartBrands", "TireBrands", "Locations"] as const) {
      const contract = contracts[name];
      assert.equal(contract.createBody.safeParse({ name: "Reference" }).success, true);
      assert.equal(contract.createBody.safeParse({ name: "Reference", parentId: "unsupported" }).success, false);
      assert.equal(contract.listQuery.parse({ isActive: "false" }).isActive, false);
      assert.equal(contract.updateBody.safeParse({}).success, false);
    }
    const id = "d4ea26c2-52a0-4223-8cc1-d649b84281d1";
    for (const [name, key] of [["VehicleModels", "brandId"], ["VehicleVariants", "modelId"], ["TireModels", "brandId"], ["PartCategories", "parentId"]] as const) {
      assert.equal(contracts[name].createBody.safeParse({ name: "Reference", [key]: id }).success, true);
      assert.equal(contracts[name].updateBody.safeParse({ name: "Rename", [key]: id }).success, false);
    }
    assert.equal(contracts.PartCategories.listQuery.parse({ rootOnly: "false" }).rootOnly, false);
    assert.equal(contracts.PartCategories.listQuery.safeParse({ rootOnly: "true", parentId: id }).success, false);
    assert.equal(contracts.Vehicles.createBody.safeParse({ title: "Vehicle" }).success, true);
    assert.equal(contracts.Vehicles.updateBody.safeParse({ publicationStatus: "published" }).success, false);
    assert.equal(contracts.Vehicles.listQuery.parse({ isFeatured: "false", priceMin: "1" }).priceMin, 1);
    assert.equal(contracts.Vehicles.publish.path, "/vehicles/:id/publish");
  } finally {
    for (const bundle of handle.bundles) {
      await bundle[Symbol.asyncDispose]();
    }
  }
});
