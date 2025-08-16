import { z } from "zod";

// Define the schema for environment variables
const envSchema = z.object({
  // Node environment
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Better Auth configuration
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_URL: z.string().url(),
  NEXT_PUBLIC_BETTER_AUTH_URL: z.string().url(),

  // Database configuration (Turso)
  TURSO_CONNECTION_URL: z.string().startsWith("libsql://", "TURSO_CONNECTION_URL must be a valid Turso connection string"),
  TURSO_AUTH_TOKEN: z.string().min(1, "TURSO_AUTH_TOKEN is required"),

  // AI Configuration (Groq)
  GROQ_API_KEY: z.string().min(1, "GROQ_API_KEY is required for AI features").optional(),

  // Next.js configuration
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),

  // Port configuration
  PORT: z.string().default("3000").transform(Number).pipe(z.number().int().positive()),
});

// Infer the type from the schema
export type Env = z.infer<typeof envSchema>;

// Validate environment variables
function validateEnv(): Env {
  try {
    console.log("Validating environment variables...");
    const parsed = envSchema.parse(process.env);
    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars: string[] = [];
      const invalidVars: string[] = [];

      error.issues.forEach((err: any) => {
        const path = err.path.join('.');
        if (err.code === 'invalid_type' && err.received === 'undefined') {
          missingVars.push(path);
        } else {
          invalidVars.push(`${path}: ${err.message}`);
        }
      });

      let errorMessage = "❌ Environment validation failed:\n\n";

      if (missingVars.length > 0) {
        errorMessage += "Missing required environment variables:\n";
        missingVars.forEach(varName => {
          errorMessage += `  - ${varName}\n`;
        });
        errorMessage += "\n";
      }

      if (invalidVars.length > 0) {
        errorMessage += "Invalid environment variables:\n";
        invalidVars.forEach(error => {
          errorMessage += `  - ${error}\n`;
        });
        errorMessage += "\n";
      }

      errorMessage += "Please check your .env file and ensure all required variables are set correctly.\n";
      errorMessage += "See .env.example for reference.\n";

      console.error(errorMessage);
      throw new Error("Environment validation failed. Check console for details.");
    }

    // Fallback for other types of errors
    console.error("❌ Environment validation failed:", error);
    throw new Error("Environment validation failed. Check console for details.");
  }
}

// Export validated environment variables for server-side use
export const env = validateEnv();
