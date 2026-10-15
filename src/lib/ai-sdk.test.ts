import { expect, test } from "vitest";
import { createGroq } from "@ai-sdk/groq";
import { generateText, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";
import { getGroqGenerationOptions } from "./groq-model";
import { applyResumeRevision, resumeRevisionSchema } from "./resume-fitting";
import { syntheticResume } from "./resume-fixture.test-helper";

const requestSchema = z.object({
  model: z.string(),
  messages: z.array(z.object({ role: z.string(), content: z.string() })),
  temperature: z.number().optional(),
  max_tokens: z.number().optional(),
  reasoning_effort: z.string().optional(),
  reasoning_format: z.string().optional(),
  response_format: z
    .object({
      type: z.string(),
      json_schema: z
        .object({
          schema: z.record(z.string(), z.unknown()),
          strict: z.boolean(),
        })
        .optional(),
    })
    .optional(),
});

const modelIds = ["qwen/qwen3.8-27b", "openai/gpt-oss-120b"];

function groqFixture(content: string, modelId = "qwen/qwen3.8-27b") {
  const requests: z.infer<typeof requestSchema>[] = [];
  const groq = createGroq({
    apiKey: "test-only",
    fetch: (...args: Parameters<typeof fetch>) => {
      const init = args[1];
      init?.signal?.throwIfAborted();
      if (typeof init?.body !== "string") {
        throw new Error("Expected a JSON request body.");
      }
      const body: unknown = JSON.parse(init.body);
      requests.push(requestSchema.parse(body));
      return Promise.resolve(
        new Response(
          JSON.stringify({
            id: "chatcmpl-test",
            object: "chat.completion",
            created: 0,
            model: modelId,
            choices: [
              {
                index: 0,
                message: { role: "assistant", content },
                finish_reason: "stop",
              },
            ],
            usage: {
              prompt_tokens: 10,
              completion_tokens: 5,
              total_tokens: 15,
            },
          }),
          { headers: { "Content-Type": "application/json" } },
        ),
      );
    },
  });
  return { model: groq(modelId), requests };
}

test.each(modelIds)(
  "%s text generation preserves instructions and model settings",
  async (modelId) => {
    const fixture = groqFixture("A concise conversation starter.", modelId);
    const result = await generateText({
      model: fixture.model,
      ...getGroqGenerationOptions(modelId, 600),
      instructions: "Use only facts in the supplied resume.",
      prompt: "Introduce the candidate.",
      temperature: 0.65,
      maxRetries: 0,
    });

    expect(result.text).toBe("A concise conversation starter.");
    expect(fixture.requests).toEqual([
      {
        model: modelId,
        messages: [
          { role: "system", content: "Use only facts in the supplied resume." },
          { role: "user", content: "Introduce the candidate." },
        ],
        temperature: 0.65,
        max_tokens: 600,
        ...(modelId === "qwen/qwen3.8-27b"
          ? { reasoning_effort: "none", reasoning_format: "hidden" }
          : {}),
      },
    ]);
  },
);

test.each(modelIds)(
  "%s structured generation validates a factual resume revision",
  async (modelId) => {
    const source = syntheticResume();
    const entry = source.sections[0]?.entries[0];
    const bullet = entry?.bullets[0];
    if (!entry || !bullet)
      throw new Error("Synthetic resume is missing a bullet.");
    const revision = {
      summary: source.summary,
      entries: [{ sourceId: entry.sourceId, bullets: [bullet] }],
      changes: ["Removed a lower-priority bullet."],
    };
    const fixture = groqFixture(JSON.stringify(revision), modelId);
    const result = await generateText({
      model: fixture.model,
      ...getGroqGenerationOptions(modelId),
      output: Output.object({ schema: resumeRevisionSchema }),
      instructions: "Shorten the resume without changing its claims.",
      prompt: JSON.stringify(source),
      temperature: 0.2,
      maxRetries: 0,
    });

    expect(result.output).toEqual(revision);
    const revised = applyResumeRevision(source, result.output);
    expect(revised.sections[0]?.entries[0]?.bullets).toEqual([bullet]);
    expect(revised.sections[0]?.entries[0]?.heading).toBe(entry.heading);
    expect(source.sections[0]?.entries[0]?.bullets).toHaveLength(2);
    expect(fixture.requests[0]?.response_format?.type).toBe("json_schema");
    expect(fixture.requests[0]?.response_format?.json_schema?.strict).toBe(
      true,
    );
    expect(
      fixture.requests[0]?.response_format?.json_schema?.schema,
    ).toMatchObject({
      type: "object",
      required: ["summary", "entries", "changes"],
    });
    expect(fixture.requests[0]?.max_tokens).toBeUndefined();
  },
);

test.each([
  ["qwen/qwen3.8-27b", 600, 600],
  ["qwen/qwen3.8-27b", 1000, 1000],
  ["qwen/qwen3.8-27b", 16384, 16384],
  ["qwen/qwen3.8-27b", 20000, 16384],
  ["openai/gpt-oss-120b", 20000, 20000],
  ["custom-model-override", 20000, 20000],
] as const)(
  "%s accepts an output budget of %i as %i",
  async (modelId, requested, expected) => {
    const fixture = groqFixture(JSON.stringify({ firstName: "Alex" }), modelId);
    const result = await generateText({
      model: fixture.model,
      ...getGroqGenerationOptions(modelId, requested),
      output: Output.object({ schema: z.object({ firstName: z.string() }) }),
      prompt:
        "Extract the first name from this synthetic resume: Alex Example.",
      maxRetries: 0,
    });

    expect(result.output.firstName).toBe("Alex");
    expect(fixture.requests[0]?.max_tokens).toBe(expected);
    expect(fixture.requests[0]?.response_format?.type).toBe("json_schema");
    if (modelId === "qwen/qwen3.8-27b") {
      expect(fixture.requests[0]?.reasoning_effort).toBe("none");
      expect(fixture.requests[0]?.reasoning_format).toBe("hidden");
    } else {
      expect(fixture.requests[0]?.reasoning_effort).toBeUndefined();
      expect(fixture.requests[0]?.reasoning_format).toBeUndefined();
    }
  },
);

test.each([
  ["malformed JSON", "{invalid"],
  [
    "invalid schema",
    JSON.stringify({ summary: 123, entries: [], changes: [] }),
  ],
])("Groq structured generation rejects %s", async (_description, content) => {
  const fixture = groqFixture(content);
  let failure: unknown;
  try {
    await generateText({
      model: fixture.model,
      ...getGroqGenerationOptions(fixture.model.modelId),
      output: Output.object({ schema: resumeRevisionSchema }),
      prompt: "Revise the resume.",
      maxRetries: 0,
    });
  } catch (error) {
    failure = error;
  }

  expect(NoObjectGeneratedError.isInstance(failure)).toBe(true);
  expect(fixture.requests).toHaveLength(1);
});

test("Groq generation honors cancellation before sending a request", async () => {
  const fixture = groqFixture("This response should never be requested.");
  const reason = new Error("Generation canceled.");
  let failure: unknown;
  try {
    await generateText({
      model: fixture.model,
      ...getGroqGenerationOptions(fixture.model.modelId),
      prompt: "Introduce the candidate.",
      abortSignal: AbortSignal.abort(reason),
      maxRetries: 0,
    });
  } catch (error) {
    failure = error;
  }
  expect(failure).toBe(reason);
  expect(fixture.requests).toHaveLength(0);
});
