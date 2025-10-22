import { z } from "zod";

export const generateConversationStarterSchema = z.object({
  prospectDetails: z
    .string()
    .trim()
    .min(20, "Share a bit more about the person to personalize the outreach.")
    .max(2000, "Prospect details are too long"),
  additionalContext: z
    .string()
    .trim()
    .max(1200, "Additional context is too long")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export type GenerateConversationStarterRequest = z.infer<typeof generateConversationStarterSchema>;

export const generateConversationStarterResponseSchema = z.object({
  message: z.string(),
  success: z.literal(true),
});

export type GenerateConversationStarterResponse = z.infer<typeof generateConversationStarterResponseSchema>;
