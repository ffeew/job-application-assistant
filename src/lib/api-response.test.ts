import { rejects } from "node:assert/strict";
import { describe, expect, test } from "vitest";
import { z } from "zod";
import {
  ApiError,
  isRetryableError,
  parseJsonResponse,
  readApiError,
} from "./api-response";
import {
  applicationJsonResponseSchema,
  applicationResponseSchema,
} from "@/app/api/applications/validators";
import { resumeJsonResponseSchema } from "@/app/api/resumes/validators";
import { userProfileJsonResponseSchema } from "@/app/api/profile/validators";
import { resumeDataJsonResponseSchema } from "@/app/api/resume-generation/validators";
import { resumeContentSchema } from "./validators/resume-content";

const fallback = "Failed to load data";
const invalidResponse = "Received an invalid server response. Please try again.";

describe("JSON response validation", () => {
  test("returns schema output, including validated transforms", async () => {
    const schema = z.object({ count: z.string().transform(Number) });
    const result = await parseJsonResponse(Response.json({ count: "4" }), schema, fallback);
    const count: number = result.count;
    expect(count).toBe(4);
  });

  test("validates serialized domain dates without converting them", async () => {
    const timestamp = "2024-01-15T12:00:00.000Z";
    const domainRecord = applicationResponseSchema.parse({
      id: "application-fixture",
      userId: "user-fixture",
      company: "Example Company",
      position: "Engineer",
      status: "applied",
      createdAt: new Date(timestamp),
      updatedAt: new Date(timestamp),
    });
    const result = await parseJsonResponse(
      Response.json(domainRecord), applicationJsonResponseSchema, fallback,
    );
    expect(result.createdAt).toBe(timestamp);
    expect(result.updatedAt).toBe(timestamp);
    expect(result.appliedAt).toBeUndefined();
    expect(result.jobDescription).toBeUndefined();
  });

  test("preserves nullable links and serialized dates in resume responses", async () => {
    const result = await parseJsonResponse(Response.json({
      id: "resume-fixture", userId: "user-fixture", title: "Example resume",
      content: "{}", isDefault: false, isTailored: false, jobApplicationId: null,
      createdAt: "2024-01-15T12:00:00.000Z", updatedAt: "2024-01-15T12:00:00.000Z",
    }), resumeJsonResponseSchema, fallback);
    expect(result.jobApplicationId).toBeNull();
    expect(typeof result.createdAt).toBe("string");
  });

  test("accepts an absent profile and empty collections", async () => {
    expect(await parseJsonResponse(
      Response.json(null), userProfileJsonResponseSchema.nullable(), fallback,
    )).toBeNull();
    const empty = {
      profile: null, workExperiences: [], education: [], skills: [],
      projects: [], certifications: [], achievements: [],
    };
    expect(await parseJsonResponse(
      Response.json(empty), resumeDataJsonResponseSchema, fallback,
    )).toEqual(empty);
  });

  test("does not reapply form restrictions to stored response strings", async () => {
    const result = await parseJsonResponse(Response.json({
      id: "application-fixture", userId: "user-fixture", company: "", position: "",
      status: "applied", jobUrl: "legacy link", contactEmail: "legacy address",
      createdAt: "2024-01-15T12:00:00.000Z", updatedAt: "2024-01-15T12:00:00.000Z",
    }), applicationJsonResponseSchema, fallback);
    expect(result.jobUrl).toBe("legacy link");
    expect(result.contactEmail).toBe("legacy address");
  });

  const malformedBodies: [string, unknown][] = [
    ["null", null], ["wrong field type", { count: "wrong type" }],
    ["missing field", {}], ["array", []],
  ];
  test.each(malformedBodies)(
    "rejects malformed successful payloads: %s", async (_name, body) => {
      await rejects(parseJsonResponse(
        Response.json(body), z.object({ count: z.number() }), fallback,
      ), { message: invalidResponse });
    },
  );

  test("rejects invalid JSON with a friendly message", async () => {
    await rejects(parseJsonResponse(
      new Response("<html>Unexpected response</html>"), z.unknown(), fallback,
    ), { message: invalidResponse });
  });

  test("rejects an empty JSON success response", async () => {
    await rejects(parseJsonResponse(
      new Response(null, { status: 204 }), z.unknown(), fallback,
    ), { message: invalidResponse });
  });

  test("rejects malformed timestamps", async () => {
    await rejects(parseJsonResponse(Response.json({
      id: "application-fixture", userId: "user-fixture", company: "Example",
      position: "Engineer", status: "applied", createdAt: "yesterday",
      updatedAt: "2024-01-15T12:00:00.000Z",
    }), applicationJsonResponseSchema, fallback), { message: invalidResponse });
  });

  test("surfaces a validated HTTP error before parsing the success schema", async () => {
    await rejects(parseJsonResponse(
      Response.json({ error: "Unauthorized" }, { status: 401 }), z.object({ count: z.number() }), fallback,
    ), { message: "Unauthorized" });
  });

  const malformedErrors: [string, unknown][] = [
    ["null", null], ["object message", { error: {} }],
    ["blank message", { error: "   " }], ["missing error", { message: "unexpected" }],
  ];
  test.each(malformedErrors)(
    "uses the fallback for malformed error objects: %s", async (_name, body) => {
      const error = await readApiError(Response.json(body, { status: 500 }), fallback);
      expect(error.message).toBe(fallback);
    },
  );

  test("uses the fallback for non-JSON PDF and text errors", async () => {
    const error = await readApiError(new Response("Bad gateway", { status: 502 }), fallback);
    expect(error.message).toBe(fallback);
  });
});

describe("retrying failed requests", () => {
  test("errors carry the HTTP status of the response", async () => {
    const missing = await readApiError(
      Response.json({ error: "Cover letter not found" }, { status: 404 }), fallback,
    );
    expect(missing).toBeInstanceOf(ApiError);
    expect(missing.status).toBe(404);
    expect(missing.message).toBe("Cover letter not found");
  });

  test("a request the server rejected is not repeated", async () => {
    for (const status of [400, 401, 404, 409, 422]) {
      const error = await readApiError(new Response(null, { status }), fallback);
      expect(isRetryableError(error)).toBe(false);
    }
  });

  // The message must not decide this: "under 4 MB" and "IDs not found: 4" contain a 4.
  test("an outage is retried whatever its message says", async () => {
    const outage = await readApiError(
      Response.json({ error: "Upload a file under 4 MB" }, { status: 503 }), fallback,
    );
    expect(isRetryableError(outage)).toBe(true);
    expect(isRetryableError(new TypeError("fetch failed"))).toBe(true);
  });

  test("a payload the client cannot read is not fetched again", async () => {
    let failure: unknown;
    try {
      await parseJsonResponse(Response.json({}), z.object({ count: z.number() }), fallback);
    } catch (error) {
      failure = error;
    }
    expect(failure).toBeInstanceOf(ApiError);
    expect(isRetryableError(failure)).toBe(false);
  });
});

describe("stored resume content", () => {
  test("populates missing sections in legacy editor content", () => {
    const result = resumeContentSchema.parse({ personalInfo: { name: "Example Candidate" } });
    expect(result.personalInfo.email).toBe("");
    expect(result.summary).toBe("");
    expect(result.skills).toBe("");
  });

  const malformedContent: [string, unknown][] = [
    ["null", null], ["array", []], ["object summary", { summary: {} }],
    ["string personal info", { personalInfo: "invalid" }],
  ];
  test.each(malformedContent)(
    "rejects malformed content for the existing manual fallback: %s", (_name, value) => {
      expect(resumeContentSchema.safeParse(value).success).toBe(false);
    },
  );
});
