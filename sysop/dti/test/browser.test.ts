import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { build } from "tsdown";
import type { Health } from "../src/index.js";

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
      onlyBundle: ["@napp/dti-core", "zod"],
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

    const browserHealth = runInNewContext(
      `${entry.code}\nBigMotorsDti.Health;`,
      {},
      { timeout: 5_000 },
    ) as typeof Health;
    assert.equal(browserHealth.check.path, "/health");
    assert.equal(browserHealth.result.safeParse({
      status: "ok", service: "@bigmotors/sysop-server",
    }).success, true);
    assert.equal(browserHealth.result.safeParse({ status: "invalid" }).success, false);
  } finally {
    for (const bundle of handle.bundles) {
      await bundle[Symbol.asyncDispose]();
    }
  }
});
