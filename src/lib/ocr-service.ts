import { z } from "zod";
import { parseJsonResponse } from "./api-response";

const ocrLineSchema = z.object({
  text: z.string(),
  score: z.number(),
  // Left, top, right, bottom in page pixels.
  box: z.tuple([z.number(), z.number(), z.number(), z.number()]),
});
const ocrPageSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
  lines: z.array(ocrLineSchema),
});
export const ocrResultSchema = z.object({
  pages: z.array(ocrPageSchema),
  truncated: z.boolean(),
});

export type OcrLine = z.infer<typeof ocrLineSchema>;
export type OcrPage = z.infer<typeof ocrPageSchema>;
export type OcrResult = z.infer<typeof ocrResultSchema>;

export type OcrServiceConfig = { url: string; token: string };

// The service reads one page at a time on CPU; a full scan can take a minute
// or more on a low-power host.
const OCR_TIMEOUT_MS = 120_000;

export async function recognizeScannedPdf(
  config: OcrServiceConfig,
  pdf: Uint8Array<ArrayBuffer>,
  fetchImplementation: typeof fetch = fetch,
): Promise<OcrResult> {
  const response = await fetchImplementation(
    `${config.url.replace(/\/$/, "")}/ocr`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/pdf",
        Authorization: `Bearer ${config.token}`,
      },
      body: pdf,
      signal: AbortSignal.timeout(OCR_TIMEOUT_MS),
      cache: "no-store",
    },
  );
  return parseJsonResponse(
    response,
    ocrResultSchema,
    "The OCR service could not read the document.",
  );
}
