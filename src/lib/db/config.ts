import { z } from "zod";

export const databaseUrlSchema = z
  .url()
  .refine(
    (value) => /^postgres(?:ql)?:\/\//i.test(value),
    "DATABASE_URL must be a PostgreSQL connection URL",
  );

export function readDatabaseUrl(): string {
  const result = databaseUrlSchema.safeParse(process.env.DATABASE_URL);
  if (!result.success) {
    throw new Error("Set DATABASE_URL to a valid PostgreSQL connection URL.");
  }
  return result.data;
}
