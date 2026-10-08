import { expect, test } from "vitest";
import { databaseUrlSchema } from "./config";

test("accepts PostgreSQL URLs, including encoded credentials", () => {
  expect(
    databaseUrlSchema.safeParse("postgresql://user:p%40ss@localhost:5432/app")
      .success,
  ).toBe(true);
  expect(
    databaseUrlSchema.safeParse("postgres://user:pass@localhost/app").success,
  ).toBe(true);
});

test("rejects missing, malformed, and SQLite connection URLs without throwing", () => {
  for (const value of [
    undefined,
    "not a URL",
    "libsql://example.turso.io",
    "file:./db.sqlite",
    "https://example.test",
  ]) {
    expect(databaseUrlSchema.safeParse(value).success).toBe(false);
  }
});
