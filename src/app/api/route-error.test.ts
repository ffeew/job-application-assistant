import { expect, test, vi } from "vitest";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { RequestError } from "@/lib/request-error";
import { routeErrorResponse } from "./route-error";

test("a body that fails validation is the client's error", async () => {
  const log = vi.spyOn(logger, "error").mockImplementation(() => undefined);
  const invalid = z.object({ name: z.string() }).safeParse({});
  const response = routeErrorResponse(invalid.error, "Failed to create skill");

  expect(response.status).toBe(400);
  const body: unknown = await response.json();
  expect(body).toMatchObject({ error: "Invalid request data" });
  expect(log).not.toHaveBeenCalled();
});

test("a malformed JSON body is the client's error", () => {
  const log = vi.spyOn(logger, "error").mockImplementation(() => undefined);
  let failure: unknown;
  try {
    JSON.parse("{not json");
  } catch (error) {
    failure = error;
  }
  expect(routeErrorResponse(failure, "Failed to create skill").status).toBe(400);
  expect(log).not.toHaveBeenCalled();
});

test("anything else is logged with its cause and reported generically", async () => {
  const log = vi.spyOn(logger, "error").mockImplementation(() => undefined);
  const failure = new Error("connection refused");
  const response = routeErrorResponse(failure, "Failed to create skill");

  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({ error: "Failed to create skill" });
  expect(log).toHaveBeenCalledWith({ err: failure }, "Failed to create skill");
});

test("a refused request keeps its own status and message", async () => {
  const log = vi.spyOn(logger, "error").mockImplementation(() => undefined);
  const response = routeErrorResponse(
    new RequestError("The linked resume was not found."),
    "Internal server error",
  );

  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({
    error: "The linked resume was not found.",
  });
  expect(log).not.toHaveBeenCalled();
});
