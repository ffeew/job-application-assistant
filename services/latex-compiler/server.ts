import { createServer } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { compileLatex, MAX_TEX_BYTES } from "./compiler";

export function createCompilerServer(token: string, compile = compileLatex) {
  if (token.length < 32)
    throw new Error(
      "LATEX_COMPILER_TOKEN must contain at least 32 characters.",
    );
  let active = 0;
  return createServer((request, response) => {
    const json = (status: number, value: unknown) => {
      response.writeHead(status, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      });
      response.end(JSON.stringify(value));
    };
    if (request.method === "GET" && request.url === "/health") {
      json(200, { status: "ok" });
      return;
    }
    const expected = Buffer.from(`Bearer ${token}`);
    const actual = Buffer.from(request.headers.authorization ?? "");
    if (
      actual.length !== expected.length ||
      !timingSafeEqual(actual, expected)
    ) {
      json(401, { error: "Unauthorized" });
      return;
    }
    if (request.method !== "POST" || request.url !== "/compile") {
      json(404, { error: "Not found" });
      return;
    }
    if (active >= 2) {
      json(503, {
        error: "The resume compiler is busy. Please retry shortly.",
      });
      return;
    }
    if (!request.headers["content-type"]?.startsWith("application/json")) {
      json(415, { error: "Expected JSON." });
      return;
    }
    const chunks: Buffer[] = [];
    let size = 0;
    let rejected = false;
    request.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_TEX_BYTES * 2) {
        if (!rejected) json(413, { error: "Resume source is too large." });
        rejected = true;
      } else if (!rejected) chunks.push(chunk);
    });
    request.on("error", () => {
      rejected = true;
    });
    request.on("end", () => {
      if (rejected) return;
      let tex: string;
      try {
        const body: unknown = JSON.parse(Buffer.concat(chunks).toString());
        if (
          !body ||
          typeof body !== "object" ||
          !("tex" in body) ||
          typeof body.tex !== "string" ||
          Buffer.byteLength(body.tex) > MAX_TEX_BYTES
        ) {
          json(400, { error: "Expected a bounded LaTeX source string." });
          return;
        }
        tex = body.tex;
      } catch {
        json(400, { error: "Invalid JSON." });
        return;
      }
      // Recheck after reading the body: multiple uploads may finish together.
      if (active >= 2) {
        json(503, {
          error: "The resume compiler is busy. Please retry shortly.",
        });
        return;
      }
      active++;
      void compile(tex)
        .then((result) => {
          json(200, result);
        })
        .catch((error: unknown) => {
          json(422, {
            error:
              error instanceof Error
                ? error.message
                : "Could not compile the resume.",
          });
        })
        .finally(() => {
          active--;
        });
    });
  });
}
