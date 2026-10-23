import { z } from "zod";
import { databaseUrlSchema } from "./db/config";

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),

    BETTER_AUTH_SECRET: z
      .string()
      .min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
    BETTER_AUTH_URL: z.url(),
    DISABLE_SIGNUP: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),

    DATABASE_URL: databaseUrlSchema,

    GROQ_API_KEY: z.string().min(1, "GROQ_API_KEY is required for AI features"),
    GROQ_MODEL: z.string().default("qwen/qwen3.8-27b"),
    GROQ_FALLBACK_MODEL: z.string().default("openai/gpt-oss-120b"),
    OPENROUTER_API_KEY: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.string().optional(),
    ),
    // The model behind the "tier-3" codename, such as openai/gpt-6-luna.
    OPENROUTER_TIER_3_MODEL: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.string().optional(),
    ),
    LATEX_COMPILER_URL: z.url().optional(),
    LATEX_COMPILER_TOKEN: z.string().min(32).optional(),
    OCR_SERVICE_URL: z.url().optional(),
    OCR_SERVICE_TOKEN: z.string().min(32).optional(),
    OBJECT_STORAGE_URL: z.url().optional(),
    OBJECT_STORAGE_BUCKET: z.string().min(1).default("job-assistant"),
    OBJECT_STORAGE_ACCESS_KEY: z.string().min(1).optional(),
    OBJECT_STORAGE_SECRET_KEY: z.string().min(32).optional(),
    OBJECT_STORAGE_REGION: z.string().min(1).default("us-east-1"),

    RESEND_API_KEY: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.string().optional(),
    ),
    RESEND_FROM_EMAIL: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.email().optional(),
    ),

    PORT: z
      .string()
      .default("3000")
      .transform(Number)
      .pipe(z.number().int().positive()),
  })
  // Either one alone would quietly leave answer drafting and form filling on Groq.
  .refine(
    (values) => !values.OPENROUTER_API_KEY === !values.OPENROUTER_TIER_3_MODEL,
    {
      message:
        "Set OPENROUTER_API_KEY and OPENROUTER_TIER_3_MODEL together, or neither",
      path: ["OPENROUTER_TIER_3_MODEL"],
    },
  );

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  try {
    const parsed = envSchema.parse(process.env);
    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars: string[] = [];
      const invalidVars: string[] = [];

      error.issues.forEach((err) => {
        const path = err.path.join(".");
        if (err.code === "invalid_type" && process.env[path] === undefined) {
          missingVars.push(path);
        } else {
          invalidVars.push(`${path}: ${err.message}`);
        }
      });

      let errorMessage = "Environment validation failed:\n\n";

      if (missingVars.length > 0) {
        errorMessage += "Missing required environment variables:\n";
        missingVars.forEach((varName) => {
          errorMessage += `  - ${varName}\n`;
        });
        errorMessage += "\n";
      }

      if (invalidVars.length > 0) {
        errorMessage += "Invalid environment variables:\n";
        invalidVars.forEach((error) => {
          errorMessage += `  - ${error}\n`;
        });
        errorMessage += "\n";
      }

      errorMessage +=
        "Please check your .env file and ensure all required variables are set correctly.\n";
      errorMessage += "See .env.example for reference.";

      // The detail travels in the message because this module must not log:
      // the proxy and root layout import it, and whatever starts the process
      // already prints an uncaught startup error.
      throw new Error(errorMessage);
    }

    throw new Error("Environment validation failed.", { cause: error });
  }
}

export const env = validateEnv();
