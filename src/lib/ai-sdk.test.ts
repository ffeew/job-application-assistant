import { expect, test } from "bun:test";
import { createGroq } from "@ai-sdk/groq";
import { generateText, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";
import { applyResumeRevision, resumeRevisionSchema } from "./resume-fitting";
import { syntheticResume } from "./resume-fixture.test-helper";

const requestSchema = z.object({
  model: z.string(),
  messages: z.array(z.object({ role: z.string(), content: z.string() })),
  temperature: z.number().optional(),
  max_tokens: z.number().optional(),
  response_format: z
    .object({
      type: z.string(),
      json_schema: z
        .object({ schema: z.record(z.string(), z.unknown()) })
        .optional(),
    })
    .optional(),
});

function groqFixture(content: string) {
  const requests: z.infer<typeof requestSchema>[] = [];
  const groq = createGroq({
    apiKey: "test-only",
    fetch: Object.assign(
      (...args: Parameters<typeof fetch>) => {
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
              model: "openai/gpt-oss-120b",
              choices: [
                {
                  index: 0,
                  message: { role: "assistant", content },
                  finish_reason: "stop",
                },
              ],
              usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
            }),
            { headers: { "Content-Type": "application/json" } },
          ),
        );
      },
      { preconnect: fetch.preconnect },
    ),
  });
  return { model: groq("openai/gpt-oss-120b"), requests };
}

test("Groq text generation preserves instructions and model settings", async () => {
  const fixture = groqFixture("A concise conversation starter.");
  const result = await generateText({
    model: fixture.model,
    instructions: "Use only facts in the supplied resume.",
    prompt: "Introduce the candidate.",
    temperature: 0.65,
    maxOutputTokens: 600,
    maxRetries: 0,
  });

  expect(result.text).toBe("A concise conversation starter.");
  expect(fixture.requests).toEqual([
    {
      model: "openai/gpt-oss-120b",
      messages: [
        { role: "system", content: "Use only facts in the supplied resume." },
        { role: "user", content: "Introduce the candidate." },
      ],
      temperature: 0.65,
      max_tokens: 600,
    },
  ]);
});

test("Groq structured generation validates a factual resume revision", async () => {
  const source = syntheticResume();
  const entry = source.sections[0]?.entries[0];
  const bullet = entry?.bullets[0];
  if (!entry || !bullet) throw new Error("Synthetic resume is missing a bullet.");
  const revision = {
    summary: source.summary,
    entries: [{ sourceId: entry.sourceId, bullets: [bullet] }],
    changes: ["Removed a lower-priority bullet."],
  };
  const fixture = groqFixture(JSON.stringify(revision));
  const result = await generateText({
    model: fixture.model,
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
  expect(fixture.requests[0]?.response_format?.json_schema?.schema).toMatchObject({
    type: "object",
    required: ["summary", "entries", "changes"],
  });
});

test.each([
  ["malformed JSON", "{invalid"],
  ["invalid schema", JSON.stringify({ summary: 123, entries: [], changes: [] })],
])("Groq structured generation rejects %s", async (_description, content) => {
  const fixture = groqFixture(content);
  let failure: unknown;
  try {
    await generateText({
      model: fixture.model,
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
