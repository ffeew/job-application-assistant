import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { readDatabaseUrl } from "../src/lib/db/config";
import { logger } from "../src/lib/logger";

const pool = new Pool({ connectionString: readDatabaseUrl() });
try {
  await migrate(drizzle(pool), { migrationsFolder: "./migrations" });
  logger.info("Database migrations applied");
} finally {
  await pool.end();
}
