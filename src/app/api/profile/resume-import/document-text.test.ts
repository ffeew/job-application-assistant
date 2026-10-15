import { Buffer } from "node:buffer";
import { describe, expect, test, vi } from "vitest";
import { logger } from "@/lib/logger";
import type { OcrResult } from "@/lib/ocr-service";
import { buildDocx, buildPdf } from "./document-fixtures.test-helper";
import {
  appendLinks,
  detectDocumentKind,
  extractDocxText,
  extractPdfText,
  extractResumeText,
  hasReadableText,
} from "./document-text";

const PDF_MIME = "application/pdf";
const profileUrl = "https://www.linkedin.com/in/jordan-example";
const resumeLines = [
  "Jordan Example",
  "jordan@example.test",
  "LinkedIn",
  "Senior Software Engineer at Example Company from 2020 to 2024",
  "Built accessible web applications used by thousands of customers",
];
const textPdf = () =>
  buildPdf([
    { lines: resumeLines, link: profileUrl },
    { lines: ["Education", "Bachelor of Computing, Example University"] },
  ]);
const scannedPdf = () => buildPdf([{ lines: [] }]);

const scan = (lines: string[], truncated = false): OcrResult => ({
  truncated,
  pages: [
    {
      width: 1700,
      height: 2200,
      lines: lines.map((text, index) => ({
        text,
        score: 0.98,
        box: [100, 100 + index * 40, 900, 128 + index * 40],
      })),
    },
  ],
});

describe("document kind detection", () => {
  test("reads the file signature instead of trusting the MIME type", () => {
    expect(detectDocumentKind(textPdf(), "application/octet-stream")).toBe(
      "pdf",
    );
    expect(detectDocumentKind(textPdf(), "text/plain")).toBe("pdf");
    expect(detectDocumentKind(buildDocx(["Jordan Example"]), PDF_MIME)).toBe(
      "docx",
    );
    expect(
      detectDocumentKind(
        Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00]),
        "application/octet-stream",
      ),
    ).toBe("legacy-doc");
  });

  test("accepts a PDF header after leading bytes", () => {
    const padded = Buffer.concat([Buffer.from("\n\n"), textPdf()]);
    expect(detectDocumentKind(padded, PDF_MIME)).toBe("pdf");
  });

  test("treats signature-less files as text only when typed as text", () => {
    const text = Buffer.from("Jordan Example");
    expect(detectDocumentKind(text, "text/plain; charset=utf-8")).toBe("text");
    expect(detectDocumentKind(text, PDF_MIME)).toBe("unknown");
  });
});

describe("text layer checks", () => {
  test("rejects empty layers, scanner watermarks, and undecodable fonts", () => {
    expect(hasReadableText([""])).toBe(false);
    expect(hasReadableText(["Scanned with Example Scanner"])).toBe(false);
    expect(hasReadableText([" ".repeat(200)])).toBe(false);
    expect(hasReadableText([resumeLines.join("\n")])).toBe(true);
  });

  test("appends only link targets that the text does not already show", () => {
    const text = "Jordan Example\nLinkedIn\ngithub.com/jordan-example";
    expect(
      appendLinks(text, [
        profileUrl,
        profileUrl,
        "https://github.com/jordan-example/",
        "mailto:jordan@example.test",
        "#section",
      ]),
    ).toBe(`${text}\n\nLinks:\n- ${profileUrl}\n- mailto:jordan@example.test`);
    expect(appendLinks(text, [])).toBe(text);
  });
});

describe("in-process extraction", () => {
  test("reads PDF pages in order with their link targets", async () => {
    expect(await extractPdfText(textPdf())).toEqual({
      pages: [
        resumeLines.join("\n"),
        "Education\nBachelor of Computing, Example University",
      ],
      links: [profileUrl],
    });
  });

  test("reads the DOCX page header, where contact details often sit", async () => {
    const docx = buildDocx(
      ["Experience", "Built accessible web applications."],
      [
        "Jordan Example",
        "jordan@example.test &amp; +65 5550 0100",
        { label: "LinkedIn", url: profileUrl },
      ],
    );
    expect(await extractDocxText(docx)).toEqual({
      text: "Jordan Example\njordan@example.test & +65 5550 0100\nLinkedIn\n\nExperience\n\nBuilt accessible web applications.",
      links: [profileUrl],
    });
  });

  test("reads DOCX paragraphs with their link targets", async () => {
    const docx = buildDocx([
      "Jordan Example",
      { label: "Portfolio", url: "https://example.test/?a=1&amp;b=2" },
      "Built accessible web applications.",
    ]);
    expect(await extractDocxText(docx)).toEqual({
      text: "Jordan Example\n\nPortfolio\n\nBuilt accessible web applications.",
      links: ["https://example.test/?a=1&b=2"],
    });
  });
});

describe("resume text extraction", () => {
  test("a text-based PDF is read without OCR and keeps hidden links", async () => {
    const readScannedPdf = vi.fn();
    const result = await extractResumeText({
      fileBuffer: textPdf(),
      mimeType: PDF_MIME,
      readScannedPdf,
    });

    expect(readScannedPdf).not.toHaveBeenCalled();
    expect(result.warnings).toEqual([]);
    expect(result.markdown).toBe(
      `${resumeLines.join("\n")}\n\nEducation\nBachelor of Computing, Example University\n\nLinks:\n- ${profileUrl}`,
    );
  });

  test("a scanned PDF is sent intact to OCR and flagged for review", async () => {
    const fileBuffer = scannedPdf();
    const original = Buffer.from(fileBuffer);
    const readScannedPdf = vi.fn(() =>
      Promise.resolve(scan(["Jordan Example", "jordan@example.test"], true)),
    );
    const result = await extractResumeText({
      fileBuffer,
      mimeType: PDF_MIME,
      readScannedPdf,
    });

    expect(readScannedPdf).toHaveBeenCalledExactlyOnceWith(fileBuffer);
    expect(fileBuffer.equals(original)).toBe(true);
    expect(result.markdown).toBe("Jordan Example\njordan@example.test");
    expect(result.warnings).toEqual([
      "This resume was read with OCR. Check names, dates and links before saving.",
      "Only the first 1 pages of the scan were read.",
    ]);
  });

  test("a scanned PDF without an OCR service explains what to upload", async () => {
    await expect(
      extractResumeText({
        fileBuffer: scannedPdf(),
        mimeType: PDF_MIME,
        readScannedPdf: null,
      }),
    ).rejects.toMatchObject({
      status: 422,
      message:
        "This PDF has no selectable text and OCR is not set up on this server. Upload a text-based PDF, DOCX or TXT file.",
    });
  });

  test("an OCR failure becomes a retryable error", async () => {
    const logged = vi.spyOn(logger, "error").mockImplementation(() => {});
    await expect(
      extractResumeText({
        fileBuffer: scannedPdf(),
        mimeType: PDF_MIME,
        readScannedPdf: () => Promise.reject(new Error("Synthetic outage.")),
      }),
    ).rejects.toMatchObject({
      status: 502,
      message:
        "The scanned resume could not be read. Try again, or upload a text-based PDF or DOCX.",
    });
    expect(logged).toHaveBeenCalledTimes(1);
  });

  test("a scan with no recognised text is reported", async () => {
    await expect(
      extractResumeText({
        fileBuffer: scannedPdf(),
        mimeType: PDF_MIME,
        readScannedPdf: () => Promise.resolve(scan([])),
      }),
    ).rejects.toMatchObject({
      status: 422,
      message:
        "No readable text was found in this file. Upload a clearer scan or a text-based PDF.",
    });
  });

  test("a damaged PDF is rejected before OCR", async () => {
    const logged = vi.spyOn(logger, "error").mockImplementation(() => {});
    const readScannedPdf = vi.fn();
    await expect(
      extractResumeText({
        fileBuffer: Buffer.from("%PDF-1.4 not a document"),
        mimeType: PDF_MIME,
        readScannedPdf,
      }),
    ).rejects.toMatchObject({ status: 422 });
    expect(readScannedPdf).not.toHaveBeenCalled();
    expect(logged).toHaveBeenCalledTimes(1);
  });

  test("a DOCX is read with its link targets", async () => {
    const result = await extractResumeText({
      fileBuffer: buildDocx([
        "Jordan Example",
        { label: "LinkedIn", url: profileUrl },
      ]),
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      readScannedPdf: null,
    });
    expect(result).toEqual({
      markdown: `Jordan Example\n\nLinkedIn\n\nLinks:\n- ${profileUrl}`,
      warnings: [],
    });
  });

  test("plain text passes through and must not be blank", async () => {
    const params = { mimeType: "text/plain", readScannedPdf: null };
    expect(
      await extractResumeText({
        ...params,
        fileBuffer: Buffer.from("Jordan Example"),
      }),
    ).toEqual({ markdown: "Jordan Example", warnings: [] });
    await expect(
      extractResumeText({ ...params, fileBuffer: Buffer.from("  \n") }),
    ).rejects.toMatchObject({ status: 400 });
  });

  test.each([
    [
      "legacy .doc",
      Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]),
      "Legacy .doc files are not supported. Save the document as DOCX or PDF, then upload it again.",
    ],
    [
      "unrecognised",
      Buffer.from("GIF89a"),
      "This file is not a PDF, DOCX or TXT document. Upload a PDF, DOCX or TXT file.",
    ],
  ])(
    "a %s file is rejected with a next step",
    async (_, fileBuffer, message) => {
      await expect(
        extractResumeText({
          fileBuffer,
          mimeType: "application/octet-stream",
          readScannedPdf: null,
        }),
      ).rejects.toMatchObject({ status: 415, message });
    },
  );
});
