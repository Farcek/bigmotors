import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { after, before, test } from "node:test";
import express from "express";
import { NappError } from "@napp/error";
import { createApp, errorHandler } from "../src/app.js";

const server = createServer(createApp());
let baseUrl: string;

before(async () => {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
    server.closeAllConnections();
  });
});

test("health reports process liveness without exposing infrastructure", async () => {
  const response = await fetch(`${baseUrl}/health`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-powered-by"), null);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.deepEqual(await response.json(), { status: "ok", service: "@bigmotors/sysop-server" });
});

test("unknown routes return a safe JSON 404", async () => {
  const response = await fetch(`${baseUrl}/missing?token=do-not-echo`);
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), {
    error: { code: "NOT_FOUND", message: "Route not found." },
  });
});

test("all admin API methods fail closed even with a fake Bearer token", async () => {
  for (const path of ["/api", "/api/vehicles", "/api/users"]) {
    for (const method of ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]) {
      const response = await fetch(`${baseUrl}${path}`, {
        method, headers: { Authorization: "Bearer fake-token" },
      });
      assert.equal(response.status, 503);
      assert.deepEqual(await response.json(), {
        error: { code: "AUTH_ACL_UNAVAILABLE", message: "Admin API is not initialized." },
      });
    }
  }
});

test("unexpected errors never serialize stack, cause or internal details", async (t) => {
  const app = express();
  app.get("/plain", () => { throw new Error("secret-connection-string"); });
  app.get("/napp", () => {
    throw new NappError("secret-message", {
      code: "PRIVATE_ERROR", status: 500, details: { token: "secret-token" },
      cause: new Error("secret-cause"),
    });
  });
  app.use(errorHandler);
  const errorServer = createServer(app);
  t.after(async () => {
    await new Promise<void>((resolve, reject) => {
      errorServer.close((error) => error ? reject(error) : resolve());
      errorServer.closeAllConnections();
    });
  });
  errorServer.listen(0, "127.0.0.1");
  await once(errorServer, "listening");
  const address = errorServer.address();
  assert.ok(address && typeof address !== "string");

  for (const path of ["/plain", "/napp"]) {
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`);
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), {
      error: { code: "INTERNAL_SERVER_ERROR", message: "Internal server error." },
    });
  }
});
