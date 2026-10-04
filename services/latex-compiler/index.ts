import { createCompilerServer } from "./server";

const token = process.env.LATEX_COMPILER_TOKEN ?? "";
const port = Number(process.env.PORT ?? 8080);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error("PORT is invalid.");
const server = createCompilerServer(token);
server.requestTimeout = 30000;
server.headersTimeout = 10000;
server.listen(port, "0.0.0.0", () => {
  console.log(`Resume compiler listening on port ${port}`);
});

let closing = false;
function shutdown() {
  if (closing) return;
  closing = true;
  server.close(() => {
    process.exit(0);
  });
  setTimeout(() => {
    process.exit(1);
  }, 20000).unref();
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
