import "dotenv/config";
import { defineConfig } from "drizzle-kit";
import { readDatabaseUrl } from "./src/lib/db/config";

export default defineConfig({
  out: "./migrations",
  dialect: "postgresql",
  schema: "./src/lib/db/schema",
  dbCredentials: { url: readDatabaseUrl() },
});
