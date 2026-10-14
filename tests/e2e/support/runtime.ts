import { z } from "zod";

export const BASE_URL = "http://127.0.0.1:3100";
export const LOG_DIRECTORY = "artifacts/e2e/logs";
export const BUILD_DIRECTORY = ".next-e2e";

export const runtimeSchema = z.object({
  databaseUrl: z.url().refine((url) => new URL(url).pathname.endsWith("_test")),
  compilerUrl: z.url(),
  compilerContainerId: z.string().min(1),
  compilerToken: z.string().min(32),
  storageUrl: z.url(),
  storageAccessKey: z.string().min(1),
  storageSecretKey: z.string().min(32),
});
export type Runtime = z.infer<typeof runtimeSchema>;

export function getRuntime(): Runtime {
  const serialized = process.env.E2E_RUNTIME;
  if (!serialized)
    throw new Error("Run E2E tests through the Playwright configuration.");
  const raw: unknown = JSON.parse(serialized);
  return runtimeSchema.parse(raw);
}

export function runtimeEnvironment(
  runtime: Runtime,
): NodeJS.ProcessEnv {
  // Carry tooling/OS settings without inheriting application secrets from .env.
  const inherited: Record<string, string | undefined> = {};
  for (const key of [
    "PATH",
    "HOME",
    "LANG",
    "LC_ALL",
    "TMPDIR",
    "TMP",
    "TEMP",
    "SystemRoot",
    "WINDIR",
    "CI",
    "PNPM_HOME",
    "XDG_DATA_HOME",
    "XDG_CACHE_HOME",
    "XDG_STATE_HOME",
    "XDG_CONFIG_HOME",
    "NODE_EXTRA_CA_CERTS",
    "HTTP_PROXY",
    "HTTPS_PROXY",
    "NO_PROXY",
  ]) {
    const value = process.env[key];
    if (value !== undefined) inherited[key] = value;
  }
  return {
    ...inherited,
    NODE_ENV: "production",
    NEXT_TELEMETRY_DISABLED: "1",
    E2E_TEST: "1",
    E2E_RUNTIME: JSON.stringify(runtime),
    E2E_ALLOWED_ORIGINS: [
      BASE_URL,
      new URL(runtime.compilerUrl).origin,
      new URL(runtime.storageUrl).origin,
    ].join(","),
    DATABASE_URL: runtime.databaseUrl,
    BETTER_AUTH_URL: BASE_URL,
    BETTER_AUTH_SECRET: "e2e-only-auth-secret-at-least-thirty-two-characters",
    GROQ_API_KEY: "e2e-only-no-provider-access",
    GROQ_MODEL: "qwen/qwen3.8-27b",
    GROQ_FALLBACK_MODEL: "openai/gpt-oss-120b",
    LATEX_COMPILER_URL: runtime.compilerUrl,
    LATEX_COMPILER_TOKEN: runtime.compilerToken,
    OBJECT_STORAGE_URL: runtime.storageUrl,
    OBJECT_STORAGE_ACCESS_KEY: runtime.storageAccessKey,
    OBJECT_STORAGE_SECRET_KEY: runtime.storageSecretKey,
    RESEND_API_KEY: "",
    RESEND_FROM_EMAIL: "",
    PORT: "3100",
    HOSTNAME: "127.0.0.1",
  };
}
