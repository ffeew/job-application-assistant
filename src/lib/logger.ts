import pino, { type Logger } from "pino";

const processState = globalThis as typeof globalThis & { logger?: Logger };

// Configured from process.env rather than env.ts: the migrator logs without the
// app's validated environment.
export const logger =
  processState.logger ??
  pino({
    level: process.env.LOG_LEVEL || "info",
    // pino-pretty is a development dependency; every other environment writes
    // JSON lines to stdout.
    ...(process.env.NODE_ENV === "development" && {
      transport: { target: "pino-pretty" },
    }),
  });
// A development reload would otherwise start another pretty-printer thread.
if (process.env.NODE_ENV !== "production") processState.logger = logger;
