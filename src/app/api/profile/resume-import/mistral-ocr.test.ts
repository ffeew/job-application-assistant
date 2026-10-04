import { expect, spyOn, test } from "bun:test";
import { Mistral } from "@mistralai/mistralai";
import { HTTPClient } from "@mistralai/mistralai/lib/http";
import { Buffer } from "node:buffer";
import { z } from "zod";
import {
  extractMarkdownFromOcrResponse,
  processDocWithMistral,
  processPdfWithMistral,
} from "./mistral-ocr";

const firstPage =
  "Jordan Example\njordan@example.test\n\n| Skill | Level |\n| --- | --- |\n| TypeScript | Expert |";
const secondPage = "## Experience\nBuilt accessible web applications.";
const ocrResponse = {
  model: "mistral-ocr-4-1",
  pages: [firstPage, secondPage].map((markdown, index) => ({
    index,
    markdown,
    images: [],
    tables: [],
    hyperlinks: [],
    header: null,
    footer: null,
    dimensions: { dpi: 200, height: 2200, width: 1700 },
    confidence_scores: {
      average_page_confidence_score: 0.99,
      minimum_page_confidence_score: 0.95,
    },
    blocks: [
      {
        type: "text",
        content: markdown,
        top_left_x: 20,
        top_left_y: 20,
        bottom_right_x: 1500,
        bottom_right_y: 2000,
        confidence_scores: { average_content_confidence_score: 0.99 },
      },
    ],
  })),
  usage_info: { pages_processed: 2, doc_size_bytes: 128 },
};

const requestSchema = z.object({
  model: z.string(),
  document: z.object({ type: z.string(), document_url: z.string() }),
  table_format: z.null(),
  extract_header: z.boolean(),
  extract_footer: z.boolean(),
});

function mistralFixture(failure?: "sign" | "ocr" | "delete" | "invalid") {
  const calls: string[] = [];
  const requests: z.infer<typeof requestSchema>[] = [];
  const uploads: {
    filename: string;
    text: string;
    purpose: FormDataEntryValue | null;
  }[] = [];
  const client = new Mistral({
    apiKey: "test-only",
    retryConfig: { strategy: "none" },
    httpClient: new HTTPClient({
      fetcher: async (input) => {
        if (!(input instanceof Request))
          throw new Error("Expected an SDK Request.");
        const path = new URL(input.url).pathname;
        calls.push(`${input.method} ${path}`);

        if (
          (failure === "sign" && path.endsWith("/url")) ||
          (failure === "ocr" && path === "/v1/ocr") ||
          (failure === "delete" && input.method === "DELETE")
        ) {
          return Response.json(
            { message: `Synthetic ${failure} failure.` },
            { status: 400 },
          );
        }

        if (path === "/v1/ocr") {
          const body: unknown = await input.json();
          requests.push(requestSchema.parse(body));
          return Response.json(
            failure === "invalid" ? { pages: [] } : ocrResponse,
          );
        }
        if (path === "/v1/files" && input.method === "POST") {
          const form = await input.formData();
          const file = form.get("file");
          if (!(file instanceof File))
            throw new Error("Expected an uploaded file.");
          uploads.push({
            filename: file.name,
            text: await file.text(),
            purpose: form.get("purpose"),
          });
          return Response.json({
            id: "file-test",
            object: "file",
            bytes: file.size,
            created_at: 0,
            filename: file.name,
            purpose: "ocr",
            sample_type: "instruct",
            source: "upload",
          });
        }
        if (path === "/v1/files/file-test/url") {
          return Response.json({ url: "https://example.test/resume.docx" });
        }
        if (path === "/v1/files/file-test" && input.method === "DELETE") {
          return Response.json({
            id: "file-test",
            object: "file",
            deleted: true,
          });
        }
        throw new Error(`Unexpected Mistral request: ${input.method} ${path}`);
      },
    }),
  });
  return { client, calls, requests, uploads };
}

test("PDF import preserves OCR 4.1 Markdown, tables, contacts, and page order", async () => {
  const fixture = mistralFixture();
  const pdf = Buffer.from("%PDF-1.4\nSynthetic resume");
  const result = await processPdfWithMistral(fixture.client, pdf);

  expect(result.model).toBe("mistral-ocr-4-1");
  expect(result.pages[0]?.blocks?.[0]?.type).toBe("text");
  expect(extractMarkdownFromOcrResponse(result)).toBe(
    `${firstPage}\n\n${secondPage}`,
  );
  expect(fixture.calls).toEqual(["POST /v1/ocr"]);
  expect(fixture.requests).toEqual([
    {
      model: "mistral-ocr-latest",
      document: {
        type: "document_url",
        document_url: `data:application/pdf;base64,${pdf.toString("base64")}`,
      },
      table_format: null,
      extract_header: false,
      extract_footer: false,
    },
  ]);
});

test.each([
  ["application/msword", ".doc"],
  [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".docx",
  ],
])(
  "Word import uploads and deletes the temporary %s document",
  async (mimeType, extension) => {
    const fixture = mistralFixture();
    const result = await processDocWithMistral(
      fixture.client,
      Buffer.from("Synthetic Word document"),
      mimeType,
    );

    expect(extractMarkdownFromOcrResponse(result)).toBe(
      `${firstPage}\n\n${secondPage}`,
    );
    expect(fixture.uploads[0]?.filename.endsWith(extension)).toBe(true);
    expect(fixture.uploads[0]?.text).toBe("Synthetic Word document");
    expect(fixture.uploads[0]?.purpose).toBe("ocr");
    expect(fixture.requests[0]?.document.document_url).toBe(
      "https://example.test/resume.docx",
    );
    expect(fixture.calls).toEqual([
      "POST /v1/files",
      "GET /v1/files/file-test/url",
      "POST /v1/ocr",
      "DELETE /v1/files/file-test",
    ]);
  },
);

test.each(["sign", "ocr", "invalid"] as const)(
  "Word import cleans up after a %s failure",
  async (failure) => {
    const fixture = mistralFixture(failure);
    let error: unknown;
    try {
      await processDocWithMistral(
        fixture.client,
        Buffer.from("Synthetic Word document"),
        "application/msword",
      );
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(Error);
    expect(fixture.calls.at(-1)).toBe("DELETE /v1/files/file-test");
    expect(
      fixture.calls.filter((call) => call.startsWith("DELETE")),
    ).toHaveLength(1);
  },
);

test("temporary file cleanup failure does not discard a successful OCR result", async () => {
  const fixture = mistralFixture("delete");
  const warning = spyOn(console, "warn").mockImplementation(() => {});
  try {
    const result = await processDocWithMistral(
      fixture.client,
      Buffer.from("Synthetic Word document"),
      "application/msword",
    );
    expect(extractMarkdownFromOcrResponse(result)).toBe(
      `${firstPage}\n\n${secondPage}`,
    );
    expect(warning).toHaveBeenCalledTimes(1);
  } finally {
    warning.mockRestore();
  }
});

test("Markdown extraction handles unreadable pages and legacy text defensively", () => {
  expect(extractMarkdownFromOcrResponse(null)).toBeNull();
  expect(
    extractMarkdownFromOcrResponse({
      pages: [null, { markdown: 123 }, { markdown: " " }],
    }),
  ).toBeNull();
  expect(
    extractMarkdownFromOcrResponse({
      pages: [{ text: " Legacy text " }, { markdown: " Second page " }],
    }),
  ).toBe("Legacy text\n\nSecond page");
  expect(
    extractMarkdownFromOcrResponse({
      documentAnnotation: "Annotation fallback",
    }),
  ).toBe("Annotation fallback");
});
