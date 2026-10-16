import { NextResponse } from "next/server";
import { createRateLimiter } from "@/lib/rate-limit";

// These endpoints call the model while the request waits, on one API key shared
// by every account, and imports may also run OCR. Each account gets a small
// allowance so that no single one can spend the key or stall the others.
const limiters = {
  coverLetter: createRateLimiter({ limit: 10, windowMs: 60_000 }),
  conversationStarter: createRateLimiter({ limit: 10, windowMs: 60_000 }),
  resumeImport: createRateLimiter({ limit: 5, windowMs: 60_000 }),
  // One application takes a model call per step, often several a minute.
  autofill: createRateLimiter({ limit: 30, windowMs: 60_000 }),
};

export function limitAiRequest(
  kind: keyof typeof limiters,
  userId: string,
): NextResponse | null {
  const result = limiters[kind](userId);
  if (result.allowed) return null;
  return NextResponse.json(
    {
      error:
        "You're sending requests too quickly. Wait a minute, then try again.",
    },
    {
      status: 429,
      headers: { "Retry-After": String(result.retryAfterSeconds) },
    },
  );
}
