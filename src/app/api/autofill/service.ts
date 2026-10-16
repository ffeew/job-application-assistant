import { createGroq } from "@ai-sdk/groq";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  APICallError,
  generateText,
  NoObjectGeneratedError,
  Output,
  RetryError,
} from "ai";
import { env } from "@/lib/env";
import { getGroqGenerationOptions } from "@/lib/groq-model";
import { RequestError } from "@/lib/request-error";
import { ApplicationsService } from "../applications/service";
import { CoverLettersService } from "../cover-letters/service";
import { ResumeGenerationService } from "../resume-generation/service";
import { ResumesService } from "../resumes/service";
import {
  buildAutofillPrompt,
  finalizeFills,
  type AutofillContext,
} from "./fills";
import {
  modelOutputSchema,
  type AutofillRequest,
  type AutofillResponse,
} from "./validators";

// The request is held open for the reply, so it must not wait indefinitely.
const GENERATION_TIMEOUT_MS = 45_000;
const TOO_LARGE_MESSAGE =
  "This page is too large for the model to fill. Fill it in yourself or use a model with a larger limit.";

// One fill can carry a whole profile and form, more than lower Groq tiers
// accept per minute, so this route moves to the OpenRouter tier-3 model when
// one is configured.
function autofillModel() {
  if (env.OPENROUTER_API_KEY && env.OPENROUTER_TIER_3_MODEL) {
    const openrouter = createOpenRouter({ apiKey: env.OPENROUTER_API_KEY });
    return {
      model: openrouter(env.OPENROUTER_TIER_3_MODEL),
      // Thinking counts toward the output cap and the panel waits on this
      // request; matching fields to a profile needs little of it. Reasoning
      // models such as GPT-6 and Claude reject sampling settings, so none is
      // sent.
      maxOutputTokens: 16_000,
      providerOptions: { openrouter: { reasoning: { effort: "low" } } },
    };
  }
  const groq = createGroq({ apiKey: env.GROQ_API_KEY });
  return {
    model: groq(env.GROQ_MODEL),
    ...getGroqGenerationOptions(env.GROQ_MODEL, 4096),
    temperature: 0.2,
  };
}

function providerStatus(error: unknown): number | undefined {
  const cause = RetryError.isInstance(error) ? error.lastError : error;
  return APICallError.isInstance(cause) ? cause.statusCode : undefined;
}

export class AutofillService {
  private applicationsService = new ApplicationsService();
  private coverLettersService = new CoverLettersService();
  private resumeGenerationService = new ResumeGenerationService();
  private resumesService = new ResumesService();

  async plan(
    userId: string,
    request: AutofillRequest,
  ): Promise<AutofillResponse> {
    const context = await this.loadContext(userId, request.applicationId);

    let output: unknown;
    try {
      const result = await generateText({
        ...autofillModel(),
        output: Output.object({ schema: modelOutputSchema }),
        ...buildAutofillPrompt(request, context),
        abortSignal: AbortSignal.timeout(GENERATION_TIMEOUT_MS),
      });
      // An answer cut off at the output cap has no output to read.
      if (result.finishReason === "length") {
        throw new RequestError(TOO_LARGE_MESSAGE, 413);
      }
      output = result.output;
    } catch (error) {
      const status = providerStatus(error);
      // Cut-off JSON that fails to parse surfaces as NoObjectGeneratedError.
      if (
        status === 413 ||
        (NoObjectGeneratedError.isInstance(error) &&
          error.finishReason === "length")
      ) {
        throw new RequestError(TOO_LARGE_MESSAGE, 413);
      }
      if (status === 402) {
        throw new RequestError(
          "The OpenRouter account is out of credits. Add credits, then try again.",
          402,
        );
      }
      if (status === 429) {
        throw new RequestError(
          "The model's usage limit was reached. Wait a minute, then try again.",
          429,
        );
      }
      throw error;
    }

    return finalizeFills(modelOutputSchema.parse(output), request, context);
  }

  private async loadContext(
    userId: string,
    applicationId: string | undefined,
  ): Promise<AutofillContext> {
    const profile =
      await this.resumeGenerationService.generateResumeData(userId);
    if (!applicationId) {
      const resume = await this.resumesService.getDefaultResume(userId);
      return {
        profile,
        job: null,
        coverLetter: null,
        resumeId: resume?.id ?? null,
      };
    }

    const application = await this.applicationsService.getApplicationById(
      userId,
      applicationId,
    );
    if (!application) throw new RequestError("Application not found", 404);

    const [coverLetters, tailored] = await Promise.all([
      this.coverLettersService.getCoverLetters(userId, {
        jobApplicationId: applicationId,
        limit: 1,
      }),
      this.resumesService.getTailoredResumeByApplication(userId, applicationId),
    ]);
    const resume =
      tailored ?? (await this.resumesService.getDefaultResume(userId));
    return {
      profile,
      // Notes, salary and recruiter contacts stay out of the prompt.
      job: {
        company: application.company,
        position: application.position,
        jobDescription: application.jobDescription,
      },
      coverLetter: coverLetters[0]?.content ?? null,
      resumeId: resume?.id ?? null,
    };
  }
}
