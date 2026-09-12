import assert from "node:assert/strict";
import { test } from "node:test";
import { ConfigFiles } from "@bigmotors/core";
import { createContainer } from "../src/di.js";

test("file upload size defaults to 20 MB without changing path defaults", () => {
  const config = new ConfigFiles({});
  assert.equal(config.FILE_UPLOAD_MAX_BYTES, 20_971_520);
  assert.equal(config.FILES_ROOT, "/files");
  assert.equal(config.FILES_UPLOADS, "/files/uploads");
});
test("ConfigFiles resolves the upload size from the injected environment", () => {
  const di = createContainer({ env: { FILE_UPLOAD_MAX_BYTES: " 1024 " } });
  try { assert.equal(di.resolve(ConfigFiles).FILE_UPLOAD_MAX_BYTES, 1024); }
  finally { di.destroy(); }
  assert.equal(new ConfigFiles({ FILE_UPLOAD_MAX_BYTES: "1" }).FILE_UPLOAD_MAX_BYTES, 1);
});
test("file upload size rejects empty, nonpositive, fractional and unsafe values", () => {
  for (const value of ["", " ", "0", "-1", "1.5", "1e3", "Infinity", "NaN", "9007199254740992", "secret-invalid-config"]) {
    assert.throws(() => new ConfigFiles({ FILE_UPLOAD_MAX_BYTES: value }), (error: unknown) => {
      assert.ok(error instanceof TypeError);
      assert.equal(error.message, "FILE_UPLOAD_MAX_BYTES must be a positive safe integer.");
      return true;
    });
  }
});
