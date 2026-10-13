import { z } from "zod";

const apiErrorSchema = z.object({ error: z.string().trim().min(1) });
const invalidResponseMessage = "Received an invalid server response. Please try again.";

/** Carries the HTTP status so callers can tell a rejected request from an outage. */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number, options?: ErrorOptions) {
    super(message, options);
    this.name = "ApiError";
    this.status = status;
  }
}

/**
 * A response the server chose to send (4xx, or a payload it got wrong) will
 * not change on a second attempt. Only outages and dropped connections may.
 */
export function isRetryableError(error: unknown): boolean {
  return !(error instanceof ApiError) || error.status >= 500;
}

/** Keep response parsing and validation details out of user-facing errors. */
export async function readApiError(
  response: Response,
  fallbackMessage: string,
): Promise<ApiError> {
  const body: unknown = await response.json().catch(() => null);
  const parsed = apiErrorSchema.safeParse(body);
  return new ApiError(
    parsed.success ? parsed.data.error : fallbackMessage,
    response.status,
  );
}

/** Invalid server data must not reach query caches or workflow state. */
export async function parseJsonResponse<S extends z.ZodType>(
  response: Response,
  schema: S,
  fallbackMessage: string,
): Promise<z.output<S>> {
  if (!response.ok) {
    throw await readApiError(response, fallbackMessage);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch (cause) {
    throw new ApiError(invalidResponseMessage, response.status, { cause });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(invalidResponseMessage, response.status, {
      cause: parsed.error,
    });
  }
  return parsed.data;
}
