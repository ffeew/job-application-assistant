import { z } from "zod";
import { databaseUrlSchema } from "./db/config";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_URL: z.url(),

  DATABASE_URL: databaseUrlSchema,

  GROQ_API_KEY: z.string().min(1, "GROQ_API_KEY is required for AI features"),
  GROQ_MODEL: z.string().default("qwen/qwen3.8-27b"),
  GROQ_FALLBACK_MODEL: z.string().default("openai/gpt-oss-120b"),
  LATEX_COMPILER_URL: z.url().optional(),
  LATEX_COMPILER_TOKEN: z.string().min(32).optional(),

  MISTRAL_API_KEY: z
    .string()
    .min(1, "MISTRAL_API_KEY is required for resume imports"),

  RESEND_API_KEY: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().optional(),
  ),
  RESEND_FROM_EMAIL: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.email().optional(),
  ),

  NEXT_PUBLIC_APP_URL: z.url().optional(),

  PORT: z
    .string()
    .default("3000")
    .transform(Number)
    .pipe(z.number().int().positive()),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  try {
    console.log("Validating environment variables...");
    const parsed = envSchema.parse(process.env);
    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars: string[] = [];
      const invalidVars: string[] = [];

      error.issues.forEach((err) => {
        const path = err.path.join(".");
        if (
          err.code === "invalid_type" &&
          "received" in err &&
          err.received === "undefined"
        ) {
          missingVars.push(path);
        } else {
          invalidVars.push(`${path}: ${err.message}`);
        }
      });

      let errorMessage = "❌ Environment validation failed:\n\n";

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
      errorMessage += "See .env.example for reference.\n";

      console.error(errorMessage);
      throw new Error(
        "Environment validation failed. Check console for details.",
      );
    }

    console.error("❌ Environment validation failed:", error);
    throw new Error(
      "Environment validation failed. Check console for details.",
    );
  }
}

export const env = validateEnv();
