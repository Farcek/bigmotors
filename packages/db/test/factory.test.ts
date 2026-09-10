import assert from "node:assert/strict";
import { test } from "node:test";
import { createDb, createPgPool } from "../src/db.js";

test("DB factory wraps the caller-owned pool without connecting or reading app configuration", async () => {
  const pool = createPgPool("postgresql://example:example@localhost:1/example");
  try {
    const db = createDb(pool);
    assert.equal(db.$client, pool);
    assert.equal(pool.totalCount, 0);
    assert.ok(db.query.products);
    assert.ok(db.query.adminProfiles);
  } finally {
    await pool.end();
  }
});
