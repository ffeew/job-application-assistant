import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { readDatabaseUrl } from "./config";
import { logger } from "../logger";

const processState = globalThis as typeof globalThis & { postgresPool?: Pool };
export const pool =
  processState.postgresPool ??
  new Pool({
    connectionString: readDatabaseUrl(),
    connectionTimeoutMillis: 5000,
  });
pool.on("error", () => logger.error("An idle PostgreSQL connection failed"));
if (process.env.NODE_ENV !== "production") processState.postgresPool = pool;

export const db = drizzle({ client: pool, schema });
