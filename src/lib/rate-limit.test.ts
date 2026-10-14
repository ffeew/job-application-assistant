import { expect, test } from "vitest";
import { createRateLimiter } from "./rate-limit";

test("allows the limit, then refuses until the window moves on", () => {
  const check = createRateLimiter({ limit: 2, windowMs: 60_000 });
  expect(check("user", 0).allowed).toBe(true);
  expect(check("user", 10_000).allowed).toBe(true);

  const refused = check("user", 20_000);
  expect(refused.allowed).toBe(false);
  expect(refused.retryAfterSeconds).toBe(40);

  expect(check("user", 60_000).allowed).toBe(true);
  expect(check("user", 60_001).allowed).toBe(false);
});

test("a refused request does not extend the wait", () => {
  const check = createRateLimiter({ limit: 1, windowMs: 1_000 });
  expect(check("user", 0).allowed).toBe(true);
  expect(check("user", 500).allowed).toBe(false);
  expect(check("user", 900).allowed).toBe(false);
  expect(check("user", 1_000).allowed).toBe(true);
});

test("each key has its own allowance", () => {
  const check = createRateLimiter({ limit: 1, windowMs: 60_000 });
  expect(check("first", 0).allowed).toBe(true);
  expect(check("second", 0).allowed).toBe(true);
  expect(check("first", 1).allowed).toBe(false);
});
