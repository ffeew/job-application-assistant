import { beforeEach, describe, expect, test, vi } from "vitest";

const env = vi.hoisted(() => ({
  GROQ_API_KEY: "test-only",
  GROQ_MODEL: "qwen/qwen3.8-27b",
  OPENROUTER_API_KEY: undefined as string | undefined,
  OPENROUTER_TIER_3_MODEL: undefined as string | undefined,
}));
vi.mock("@/lib/env", () => ({ env }));
vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("ai")>()),
  generateText: vi.fn(),
}));
// The data services reach the database; only the model call is under test.
vi.mock("../resume-generation/service", () => ({
  ResumeGenerationService: class {
    generateResumeData = () =>
      Promise.resolve({
        profile: null,
        workExperiences: [],
        education: [],
        skills: [],
        projects: [],
        certifications: [],
        achievements: [],
        references: [],
      });
  },
}));
vi.mock("../resumes/service", () => ({
  ResumesService: class {
    getDefaultResume = () => Promise.resolve(null);
  },
}));
vi.mock("../applications/service", () => ({
  ApplicationsService: class {
    getApplicationById = () => Promise.resolve(null);
  },
}));
vi.mock("../cover-letters/service", () => ({
  CoverLettersService: class {
    getCoverLetters = () => Promise.resolve([]);
  },
}));

import { APICallError, generateText, NoObjectGeneratedError } from "ai";
import { RequestError } from "@/lib/request-error";
import { AutofillService } from "./service";

const request = {
  url: "https://jobs.example.test/apply",
  pageText: "",
  fields: [
    { id: "0:0", kind: "text" as const, label: "First name", required: true },
  ],
};
const plan = () => new AutofillService().plan("user-1", request);
const callOptions = () => vi.mocked(generateText).mock.calls[0]?.[0];

describe("AutofillService model choice", () => {
  beforeEach(() => {
    env.OPENROUTER_API_KEY = undefined;
    env.OPENROUTER_TIER_3_MODEL = undefined;
    vi.mocked(generateText).mockResolvedValue({
      output: { fills: [], unanswered: [] },
    } as never);
  });

  test("uses the configured tier-3 model through OpenRouter", async () => {
    env.OPENROUTER_API_KEY = "test-only";
    env.OPENROUTER_TIER_3_MODEL = "example/tier-3-model";
    await plan();
    const options = callOptions();
    expect(options?.model).toMatchObject({
      provider: "openrouter",
      modelId: "example/tier-3-model",
    });
    expect(options?.temperature).toBeUndefined();
    expect(options?.providerOptions).toEqual({
      openrouter: { reasoning: { effort: "low" } },
    });
  });

  test("keeps using Groq without an OpenRouter tier-3 model", async () => {
    await plan();
    const options = callOptions();
    expect(options?.model).toMatchObject({ modelId: "qwen/qwen3.8-27b" });
    expect(options?.temperature).toBe(0.2);
  });

  test("an exhausted OpenRouter balance is reported to the user", async () => {
    env.OPENROUTER_API_KEY = "test-only";
    env.OPENROUTER_TIER_3_MODEL = "example/tier-3-model";
    vi.mocked(generateText).mockRejectedValue(
      new APICallError({
        message: "Insufficient credits",
        url: "https://openrouter.ai/api/v1/chat/completions",
        requestBodyValues: {},
        statusCode: 402,
      }),
    );
    const failure = await plan().catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(RequestError);
    expect(failure).toMatchObject({ status: 402 });
  });

  test("an answer cut off at the output cap is reported as too large", async () => {
    vi.mocked(generateText).mockRejectedValueOnce(
      new NoObjectGeneratedError({
        message: "No object generated: could not parse the response.",
        text: '{"fills":[{"fieldId":"0:0","va',
        response: { id: "r", timestamp: new Date(0), modelId: "m" },
        usage: {} as never,
        finishReason: "length",
      }),
    );
    await expect(plan()).rejects.toMatchObject({ status: 413 });

    // With nothing written before the cap there is no output to parse.
    vi.mocked(generateText).mockResolvedValueOnce({
      finishReason: "length",
      get output(): never {
        throw new Error("No output generated");
      },
    } as never);
    await expect(plan()).rejects.toMatchObject({ status: 413 });
  });
});
