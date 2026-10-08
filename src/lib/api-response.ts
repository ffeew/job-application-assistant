import { z } from "zod";

const apiErrorSchema = z.object({ error: z.string().trim().min(1) });
const invalidResponseMessage = "Received an invalid server response. Please try again.";

/** Keep response parsing and validation details out of user-facing errors. */
export async function readApiError(
  response: Response,
  fallbackMessage: string,
): Promise<Error> {
  const body: unknown = await response.json().catch(() => null);
  const parsed = apiErrorSchema.safeParse(body);
  return new Error(parsed.success ? parsed.data.error : fallbackMessage);
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
    throw new Error(invalidResponseMessage, { cause });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new Error(invalidResponseMessage, { cause: parsed.error });
  }
  return parsed.data;
}
