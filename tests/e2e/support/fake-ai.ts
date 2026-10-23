import { createServer, type IncomingMessage } from "node:http";
import { z } from "zod";
import { AI_STUB_URL } from "./runtime";

const chatRequestSchema = z.object({
  model: z.string(),
  messages: z.array(z.object({ role: z.string(), content: z.string() })),
  response_format: z.object({ type: z.string() }).optional(),
});
export type ChatRequest = z.infer<typeof chatRequestSchema>;

export interface FakeReply {
  status: number;
  json: unknown;
}
type Responder = FakeReply | ((request: ChatRequest) => FakeReply);
interface Scripted {
  respond: Responder;
  match?: (request: ChatRequest) => boolean;
}

export function completion(content: string, finishReason = "stop"): FakeReply {
  // The shape Groq's response schema requires; src/lib/ai-sdk.test.ts uses it too.
  return {
    status: 200,
    json: {
      id: "chatcmpl-e2e",
      object: "chat.completion",
      created: 0,
      model: "e2e",
      choices: [
        {
          index: 0,
          message: { role: "assistant", content },
          finish_reason: finishReason,
        },
      ],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    },
  };
}

export function providerError(status: number, message = "Scripted failure") {
  return { status, json: { error: { message, type: "e2e_error" } } };
}

export function userPrompt(request: ChatRequest) {
  return request.messages.findLast((message) => message.role === "user")
    ?.content;
}

export class FakeAI {
  private queue: Scripted[] = [];
  private received: ChatRequest[] = [];
  private failures: string[] = [];

  /** Queue a reply for the next call, or for the next call `match` accepts. */
  reply(respond: Responder, match?: (request: ChatRequest) => boolean) {
    this.queue.push({ respond, match });
  }

  requests(): readonly ChatRequest[] {
    return this.received;
  }

  reset() {
    this.queue = [];
    this.received = [];
    this.failures = [];
  }

  /** Problems the test did not see: unused replies and reply functions that threw. */
  problems() {
    return [
      ...this.failures,
      ...(this.queue.length
        ? [`${this.queue.length} scripted AI replies were never requested.`]
        : []),
    ];
  }

  answer(request: ChatRequest): FakeReply {
    this.received.push(request);
    const index = this.queue.findIndex(
      (scripted) => !scripted.match || scripted.match(request),
    );
    const scripted = index === -1 ? undefined : this.queue[index];
    if (!scripted) {
      // A 400 is not retried, so unscripted calls fail at once, as the
      // blocked provider did before the fake existed.
      return providerError(400, "No scripted E2E response");
    }
    this.queue.splice(index, 1);
    try {
      return typeof scripted.respond === "function"
        ? scripted.respond(request)
        : scripted.respond;
    } catch (error) {
      this.failures.push(
        `A scripted AI reply threw: ${error instanceof Error ? error.message : String(error)}`,
      );
      return providerError(500, "Scripted reply threw");
    }
  }
}

async function readBody(message: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of message) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
  }
  return Buffer.concat(chunks).toString("utf8");
}

function parseRequest(body: string) {
  try {
    const raw: unknown = JSON.parse(body);
    return chatRequestSchema.safeParse(raw).data;
  } catch {
    return undefined;
  }
}

export async function startFakeAI() {
  const fake = new FakeAI();
  const server = createServer((message, response) => {
    void readBody(message).then((body) => {
      const request =
        message.method === "POST" &&
        message.url === "/openai/v1/chat/completions"
          ? parseRequest(body)
          : undefined;
      const reply = request
        ? fake.answer(request)
        : providerError(404, "The fake AI provider only serves Groq chat.");
      // Lets the SDK retry scripted 429 and 5xx replies without waiting.
      response.writeHead(reply.status, {
        "Content-Type": "application/json",
        "retry-after-ms": "0",
      });
      response.end(JSON.stringify(reply.json));
    });
  });
  const { hostname, port } = new URL(AI_STUB_URL);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(Number(port), hostname, () => resolve());
  });
  return {
    fake,
    async close() {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    },
  };
}
