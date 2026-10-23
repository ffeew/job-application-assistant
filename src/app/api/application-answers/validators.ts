import { z } from "zod";
import { recordId } from "@/lib/validators/fields";

export const APPLICATION_QUESTIONS_MAX = 6_000;

export const draftAnswersRequestSchema = z.object({
  applicationId: recordId.optional(),
  questions: z
    .string()
    .trim()
    .min(1, "Paste the application's questions.")
    .max(
      APPLICATION_QUESTIONS_MAX,
      "That's too much at once. Paste fewer questions.",
    ),
});

// Groq's strict structured outputs require every field, so "no reason" is "".
// No length limits: some providers' structured outputs reject maxLength, and
// the output token cap bounds the answer instead.
export const modelOutputSchema = z.object({
  answers: z.array(
    z.object({ question: z.string(), answer: z.string(), reason: z.string() }),
  ),
});

export const draftAnswersResponseSchema = modelOutputSchema;

export type DraftAnswersRequest = z.infer<typeof draftAnswersRequestSchema>;
export type DraftAnswersResponse = z.infer<typeof draftAnswersResponseSchema>;
export type DraftedAnswer = DraftAnswersResponse["answers"][number];
