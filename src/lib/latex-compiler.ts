import { compilationResultSchema } from "./resume-document";
import { env } from "./env";
import { parseJsonResponse } from "./api-response";
import { ResumeGenerationError } from "./resume-errors";

export async function compileResumeLatex(tex: string, signal: AbortSignal) {
  if (!env.LATEX_COMPILER_URL || !env.LATEX_COMPILER_TOKEN) {
    throw new ResumeGenerationError(
      "Resume generation is unavailable until the LaTeX compiler URL and token are configured.",
    );
  }
  try {
    const response = await fetch(
      `${env.LATEX_COMPILER_URL.replace(/\/$/, "")}/compile`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.LATEX_COMPILER_TOKEN}`,
        },
        body: JSON.stringify({ tex }),
        signal: AbortSignal.any([signal, AbortSignal.timeout(25000)]),
        cache: "no-store",
      },
    );
    const result = await parseJsonResponse(
      response,
      compilationResultSchema,
      "The LaTeX compiler could not generate the resume.",
    );
    if (
      !Buffer.from(result.pdfBase64, "base64")
        .subarray(0, 5)
        .equals(Buffer.from("%PDF-"))
    )
      throw new ResumeGenerationError("The compiler returned an invalid PDF.");
    return result;
  } catch (error) {
    if (
      error instanceof TypeError ||
      (error instanceof Error &&
        ["TimeoutError", "AbortError"].includes(error.name))
    ) {
      throw new ResumeGenerationError(
        "The LaTeX compiler is unavailable or took too long. Please retry.",
        { cause: error },
      );
    }
    throw new ResumeGenerationError(
      error instanceof Error
        ? error.message
        : "The LaTeX compiler could not generate the resume.",
      { cause: error },
    );
  }
}
