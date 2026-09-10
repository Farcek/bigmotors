import { createServer } from "node:http";
import { createApp } from "./app.js";
import { ConfigSysop } from "./config.js";
import { createContainer } from "./di.js";


const di = createContainer({ env: process.env });

const config = di.resolve(ConfigSysop);
const server = createServer(createApp(di));
server.requestTimeout = 30_000;
server.headersTimeout = 15_000;

server.on("error", (error: NodeJS.ErrnoException) => {
  console.error("Server failed:", error.code ?? "SERVER_ERROR");
  process.exitCode = 1;
});

let shuttingDown = false;
function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.info(`Shutting down (${signal}).`);

  const timeout = setTimeout(() => {
    server.closeAllConnections();
    process.exit(1);
  }, 10_000);
  timeout.unref();

  server.close((error) => {
    clearTimeout(timeout);
    if (error) process.exitCode = 1;
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

server.listen(config.PORT, config.HOST, () => {
  const host = config.HOST.includes(":") ? `[${config.HOST}]` : config.HOST;
  console.info(`@bigmotors/sysop-server listening at http://${host}:${config.PORT}`);
});
