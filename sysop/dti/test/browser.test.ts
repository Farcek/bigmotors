import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { build } from "tsdown";
import type { Health, Colors, Branches } from "../src/index.js";

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
    ) as { Health: typeof Health; Colors: typeof Colors; Branches: typeof Branches };
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
  } finally {
    for (const bundle of handle.bundles) {
      await bundle[Symbol.asyncDispose]();
    }
  }
});
