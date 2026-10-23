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
        profile: { firstName: "Ada", userId: "user-1" },
        workExperiences: [],
        education: [],
        skills: [],
        projects: [],
        certifications: [],
        achievements: [],
        references: [{ name: "Grace Referee" }],
      });
  },
}));
vi.mock("../applications/service", () => ({
  ApplicationsService: class {
    getApplicationById = (_userId: string, id: string) =>
      Promise.resolve(
        id === "app-1"
          ? {
              id,
              company: "Acme",
              position: "Engineer",
              jobDescription: "Build rockets.",
              notes: "Private note",
              salaryRange: "100k",
              contactEmail: "recruiter@acme.test",
            }
          : null,
      );
  },
}));

import { APICallError, generateText, NoObjectGeneratedError } from "ai";
import { RequestError } from "@/lib/request-error";
import { ApplicationAnswersService } from "./service";

const draft = (applicationId?: string) =>
  new ApplicationAnswersService().draft("user-1", {
    applicationId,
    questions: "Why do you want to work here?\nGender",
  });
const callOptions = () => vi.mocked(generateText).mock.calls[0]?.[0];
const modelAnswers = (
  answers: { question: string; answer: string; reason: string }[],
) =>
  vi.mocked(generateText).mockResolvedValue({ output: { answers } } as never);
const providerError = (statusCode: number) =>
  new APICallError({
    message: "Provider error",
    url: "https://api.example.test/v1/chat/completions",
    requestBodyValues: {},
    statusCode,
  });

beforeEach(() => {
  env.OPENROUTER_API_KEY = undefined;
  env.OPENROUTER_TIER_3_MODEL = undefined;
  modelAnswers([]);
});

describe("ApplicationAnswersService prompt", () => {
  test("puts the profile in the instructions and the job and questions in the prompt", async () => {
    await draft("app-1");
    const options = callOptions();
    expect(options?.instructions).toContain('"firstName":"Ada"');
    expect(options?.instructions).not.toContain("user-1");
    expect(options?.instructions).not.toContain("Grace Referee");
    expect(options?.prompt).toContain("Company: Acme");
    expect(options?.prompt).toContain("Build rockets.");
    expect(options?.prompt).toContain("Why do you want to work here?");
    for (const secret of ["Private note", "100k", "recruiter@acme.test"]) {
      expect(JSON.stringify(options)).not.toContain(secret);
    }
  });

  test("an application the caller doesn't own is not found and never reaches the model", async () => {
    const failure = await draft("someone-elses").catch(
      (error: unknown) => error,
    );
    expect(failure).toBeInstanceOf(RequestError);
    expect(failure).toMatchObject({ status: 404 });
    expect(generateText).not.toHaveBeenCalled();
  });
});

describe("ApplicationAnswersService answers", () => {
  test("flags sensitive questions but keeps their drafts", async () => {
    modelAnswers([
      { question: "Gender", answer: "Prefer not to say", reason: "" },
      {
        question: "How would you debug a race condition?",
        answer: "I would add logging around the shared state.",
        reason: "",
      },
      { question: "Why this role?", answer: "I like rockets.", reason: "" },
    ]);
    const { answers } = await draft();
    expect(answers).toEqual([
      {
        question: "Gender",
        answer: "Prefer not to say",
        reason: "Answer this yourself",
      },
      {
        question: "How would you debug a race condition?",
        answer: "I would add logging around the shared state.",
        reason: "Answer this yourself",
      },
      { question: "Why this role?", answer: "I like rockets.", reason: "" },
    ]);
  });

  test("an empty answer keeps the model's reason or asks for the applicant's", async () => {
    modelAnswers([
      { question: "Portfolio URL", answer: "", reason: "Not in your profile" },
      { question: "Favourite colour", answer: " ", reason: "" },
    ]);
    const { answers } = await draft();
    expect(answers.map((item) => item.reason)).toEqual([
      "Not in your profile",
      "Needs your answer",
    ]);
  });
});

describe("ApplicationAnswersService model", () => {
  test("uses the configured tier-3 model through OpenRouter", async () => {
    env.OPENROUTER_API_KEY = "test-only";
    env.OPENROUTER_TIER_3_MODEL = "example/tier-3-model";
    await draft();
    const options = callOptions();
    expect(options?.model).toMatchObject({
      provider: "openrouter",
      modelId: "example/tier-3-model",
    });
    expect(options?.temperature).toBeUndefined();
    expect(options?.maxRetries).toBe(0);
  });

  test("uses Groq without an OpenRouter tier-3 model", async () => {
    await draft();
    const options = callOptions();
    expect(options?.model).toMatchObject({ modelId: "qwen/qwen3.8-27b" });
    expect(options?.temperature).toBe(0.3);
    expect(options?.maxRetries).toBe(0);
  });

  test.each([
    [402, "out of credits"],
    [413, "Paste fewer questions"],
    [429, "Wait a minute"],
  ])("a provider %i is reported to the user", async (status, message) => {
    vi.mocked(generateText).mockRejectedValue(providerError(status));
    const failure = await draft().catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(RequestError);
    expect(failure).toMatchObject({
      status,
      message: expect.stringContaining(message) as unknown,
    });
  });

  test("an answer cut off at the output cap is reported as too large", async () => {
    vi.mocked(generateText).mockRejectedValueOnce(
      new NoObjectGeneratedError({
        message: "No object generated: could not parse the response.",
        text: '{"answers":[{"question":"Why',
        response: { id: "r", timestamp: new Date(0), modelId: "m" },
        usage: {} as never,
        finishReason: "length",
      }),
    );
    await expect(draft()).rejects.toMatchObject({ status: 413 });

    // With nothing written before the cap there is no output to parse.
    vi.mocked(generateText).mockResolvedValueOnce({
      finishReason: "length",
      get output(): never {
        throw new Error("No output generated");
      },
    } as never);
    await expect(draft()).rejects.toMatchObject({ status: 413 });
  });
});
