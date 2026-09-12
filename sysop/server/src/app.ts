import type { Container } from "@napp/di";
import { NappError } from "@napp/error";
import express, { type ErrorRequestHandler } from "express";
import { buildAPI } from "./api/index.js";
import { buildFileReadRouter } from "./files/read.js";

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof NappError && error.code === "AUTH_ACL_UNAVAILABLE") {
    res.status(503).json({
      error: { code: "AUTH_ACL_UNAVAILABLE", message: "Admin API is not initialized." },
    });
    return;
  }

  if (error instanceof NappError && error.status !== undefined
    && Number.isInteger(error.status) && error.status >= 400 && error.status < 500) {
    res.status(error.status).json({ error: { code: error.code, message: error.message } });
    return;
  }

  res.status(500).json({
    error: { code: "INTERNAL_SERVER_ERROR", message: "Internal server error." },
  });
};

export function createApp(di: Container) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", false);
  app.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    next();
  });

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "@bigmotors/sysop-server" });
  });

  app.use(buildFileReadRouter(di));

  // Userly/ACL integration must replace this deny gate before any admin routes.
  // app.use("/api", (_req, _res, next) => {
  //   next(new NappError("Admin API is not initialized.", { code: "AUTH_ACL_UNAVAILABLE", status: 503 }));
  // });
  app.use("/api", buildAPI(di));

  app.use((_req, _res, next) => {
    next(new NappError("Route not found.", { code: "NOT_FOUND", status: 404 }));
  });
  app.use(errorHandler);
  return app;
}
