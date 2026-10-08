import type { Mistral } from "@mistralai/mistralai";
import type { OCRResponse } from "@mistralai/mistralai/models/components";
import type { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { z } from "zod";

// Keep tables, headers, and footers inline so the profile parser receives the
// whole resume in Markdown.
const ocrOptions = {
  model: "mistral-ocr-latest",
  tableFormat: null,
  extractHeader: false,
  extractFooter: false,
};

export function processPdfWithMistral(
  client: Mistral,
  fileBuffer: Buffer,
): Promise<OCRResponse> {
  return client.ocr.process({
    ...ocrOptions,
    document: {
      type: "document_url",
      documentUrl: `data:application/pdf;base64,${fileBuffer.toString("base64")}`,
    },
  });
}

export async function processDocWithMistral(
  client: Mistral,
  fileBuffer: Buffer,
  mimeType: string,
): Promise<OCRResponse> {
  const extension = mimeType === "application/msword" ? "doc" : "docx";
  const uploaded = await client.files.upload({
    file: {
      fileName: `${randomUUID()}.${extension}`,
      content: fileBuffer,
    },
    purpose: "ocr",
  });

  try {
    const signedUrl = await client.files.getSignedUrl({ fileId: uploaded.id });
    return await client.ocr.process({
      ...ocrOptions,
      document: { type: "document_url", documentUrl: signedUrl.url },
    });
  } finally {
    try {
      await client.files.delete({ fileId: uploaded.id });
    } catch (cleanupError) {
      console.warn(
        "Failed to delete temporary document from Mistral:",
        cleanupError,
      );
    }
  }
}

const markdownResponseSchema = z.object({
  pages: z.array(z.unknown()).catch([]),
  documentAnnotation: z.string().optional().catch(undefined),
});
const markdownPageSchema = z.object({
  markdown: z.string().optional().catch(undefined),
  text: z.string().optional().catch(undefined),
});

export function extractMarkdownFromOcrResponse(
  response: unknown,
): string | null {
  const result = markdownResponseSchema.safeParse(response);
  if (!result.success) return null;

  const sections = result.data.pages.flatMap((page) => {
    const parsed = markdownPageSchema.safeParse(page);
    if (!parsed.success) return [];
    const content = parsed.data.markdown?.trim() || parsed.data.text?.trim();
    return content ? [content] : [];
  });

  return sections.length > 0
    ? sections.join("\n\n")
    : (result.data.documentAnnotation ?? null);
}
