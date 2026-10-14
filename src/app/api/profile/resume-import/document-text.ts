import { Buffer } from "node:buffer";
import JSZip from "jszip";
import mammoth from "mammoth";
import { extractLinks, extractText, getDocumentProxy } from "unpdf";
import { logger } from "@/lib/logger";
import type { OcrResult } from "@/lib/ocr-service";
import { ResumeImportError } from "./errors";
import { ocrPagesToText } from "./ocr-layout";

export type DocumentKind = "pdf" | "docx" | "legacy-doc" | "text" | "unknown";

const PDF_SIGNATURE = Buffer.from("%PDF-");
const ZIP_SIGNATURE = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
const OLE_SIGNATURE = Buffer.from([
  0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1,
]);

// Browsers report unreliable MIME types for uploads, so the leading bytes
// decide how a file is read. Plain text has no signature and relies on its type.
export function detectDocumentKind(
  fileBuffer: Buffer,
  mimeType: string,
): DocumentKind {
  if (fileBuffer.subarray(0, 5).equals(PDF_SIGNATURE)) return "pdf";
  if (fileBuffer.subarray(0, 4).equals(ZIP_SIGNATURE)) return "docx";
  if (fileBuffer.subarray(0, 8).equals(OLE_SIGNATURE)) return "legacy-doc";
  if (mimeType.toLowerCase().startsWith("text/plain")) return "text";
  // PDF readers accept a header anywhere in the first 1024 bytes.
  if (fileBuffer.subarray(0, 1024).includes(PDF_SIGNATURE)) return "pdf";
  return "unknown";
}

// A resume page holds well over a thousand characters, while a scan has none
// or only a scanner watermark. Counting letters and digits also rejects text
// layers whose font encoding decodes to symbols.
const MIN_TEXT_LAYER_CHARACTERS = 100;

export function hasReadableText(pages: string[]): boolean {
  const readable = pages.join("").match(/[\p{L}\p{N}]/gu);
  return (readable?.length ?? 0) >= MIN_TEXT_LAYER_CHARACTERS;
}

const MAX_APPENDED_LINKS = 40;

// A link's target lives outside the visible text: a resume may show
// "LinkedIn" while the profile URL exists only on the link itself.
export function appendLinks(text: string, links: string[]): string {
  const visible = text.toLowerCase();
  const hidden = [...new Set(links.map((link) => link.trim()))]
    .filter((link) => {
      if (!/^(https?:\/\/|mailto:)/i.test(link)) return false;
      const shown = link
        .replace(/^(https?:\/\/(www\.)?|mailto:)/i, "")
        .replace(/\/$/, "")
        .toLowerCase();
      return shown.length > 0 && !visible.includes(shown);
    })
    .slice(0, MAX_APPENDED_LINKS);

  return hidden.length > 0
    ? `${text}\n\nLinks:\n${hidden.map((link) => `- ${link}`).join("\n")}`
    : text;
}

export async function extractPdfText(
  fileBuffer: Buffer,
): Promise<{ pages: string[]; links: string[] }> {
  // PDF.js may detach the buffer it is given, so it reads a copy and the
  // upload stays intact for the OCR fallback.
  const pdf = await getDocumentProxy(new Uint8Array(fileBuffer), {
    verbosity: 0,
  });
  try {
    const { text } = await extractText(pdf, { mergePages: false });
    const { links } = await extractLinks(pdf);
    return { pages: text.map((page) => page.trim()), links };
  } finally {
    await pdf.loadingTask.destroy();
  }
}

// Only link targets are read from the HTML pass, so embedded pictures are not
// inlined as data URIs.
const skipImages = mammoth.images.imgElement(() =>
  Promise.resolve({ src: "" }),
);

function decodeEntities(value: string): string {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

function wordXmlToParagraphs(xml: string): string[] {
  return xml.split("</w:p>").flatMap((paragraph) => {
    const text = [
      ...paragraph.matchAll(
        /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:(?:tab|br)\b[^>]*\/>/g,
      ),
    ]
      .map((match) => (match[1] === undefined ? " " : decodeEntities(match[1])))
      .join("")
      .trim();
    return text ? [text] : [];
  });
}

// Mammoth reads the document body only, but Word resumes often keep the name
// and contact details in the page header. Those parts are read from the
// archive directly.
async function readDocxMargins(fileBuffer: Buffer) {
  const archive = await JSZip.loadAsync(fileBuffer);
  const readParts = (pattern: RegExp) =>
    Promise.all(
      Object.values(archive.files)
        .filter((file) => pattern.test(file.name))
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((file) => file.async("string")),
    );
  // First-page, odd and even variants usually repeat the same paragraphs.
  const uniqueParagraphs = (parts: string[]) => [
    ...new Set(parts.flatMap(wordXmlToParagraphs)),
  ];

  const [headers, footers, relationships] = await Promise.all([
    readParts(/^word\/header\d*\.xml$/),
    readParts(/^word\/footer\d*\.xml$/),
    readParts(/^word\/_rels\/(?:header|footer)\d*\.xml\.rels$/),
  ]);
  const links = relationships.flatMap((xml) =>
    [...xml.matchAll(/<Relationship\b[^>]*>/g)].flatMap(([tag]) => {
      const target = /\bTarget="([^"]*)"/.exec(tag)?.[1];
      return tag.includes('/hyperlink"') && target
        ? [decodeEntities(target)]
        : [];
    }),
  );
  return {
    header: uniqueParagraphs(headers),
    footer: uniqueParagraphs(footers),
    links,
  };
}

export async function extractDocxText(
  fileBuffer: Buffer,
): Promise<{ text: string; links: string[] }> {
  const [raw, html, margins] = await Promise.all([
    mammoth.extractRawText({ buffer: fileBuffer }),
    // Raw text drops hyperlink targets, so a second pass collects them.
    mammoth.convertToHtml({ buffer: fileBuffer }, { convertImage: skipImages }),
    readDocxMargins(fileBuffer),
  ]);
  const links = [...html.value.matchAll(/<a\b[^>]*\bhref="([^"]*)"/g)].flatMap(
    (match) => (match[1] ? [decodeEntities(match[1])] : []),
  );
  const text = [
    margins.header.join("\n"),
    raw.value.replace(/\n{3,}/g, "\n\n").trim(),
    margins.footer.join("\n"),
  ]
    .filter((part) => part.length > 0)
    .join("\n\n");
  return { text, links: [...margins.links, ...links] };
}

export type ScannedPdfReader = (pdf: Buffer) => Promise<OcrResult>;

export type ExtractedResumeText = { markdown: string; warnings: string[] };

type ExtractParams = {
  fileBuffer: Buffer;
  mimeType: string;
  /** Null when no OCR service is configured. */
  readScannedPdf: ScannedPdfReader | null;
};

async function extractFromPdf({
  fileBuffer,
  readScannedPdf,
}: ExtractParams): Promise<ExtractedResumeText> {
  let textLayer: Awaited<ReturnType<typeof extractPdfText>>;
  try {
    textLayer = await extractPdfText(fileBuffer);
  } catch (error) {
    if (error instanceof Error && error.name === "PasswordException") {
      throw new ResumeImportError(
        "This PDF is password-protected. Remove the password, then upload it again.",
        422,
        error,
      );
    }
    logger.error({ err: error }, "Failed to read the uploaded PDF");
    throw new ResumeImportError(
      "This PDF could not be read. Export it again, or upload a DOCX or TXT file.",
      422,
      error,
    );
  }

  if (hasReadableText(textLayer.pages)) {
    const text = textLayer.pages.filter((page) => page.length > 0).join("\n\n");
    return { markdown: appendLinks(text, textLayer.links), warnings: [] };
  }

  if (!readScannedPdf) {
    throw new ResumeImportError(
      "This PDF has no selectable text and OCR is not set up on this server. Upload a text-based PDF, DOCX or TXT file.",
      422,
    );
  }

  let scan: OcrResult;
  try {
    scan = await readScannedPdf(fileBuffer);
  } catch (error) {
    logger.error({ err: error }, "OCR service error");
    throw new ResumeImportError(
      "The scanned resume could not be read. Try again, or upload a text-based PDF or DOCX.",
      502,
      error,
    );
  }

  const text = ocrPagesToText(scan.pages);
  if (text.length === 0) {
    throw new ResumeImportError(
      "No readable text was found in this file. Upload a clearer scan or a text-based PDF.",
      422,
    );
  }

  const warnings = [
    "This resume was read with OCR. Check names, dates and links before saving.",
  ];
  if (scan.truncated) {
    warnings.push(
      `Only the first ${scan.pages.length} pages of the scan were read.`,
    );
  }
  return { markdown: appendLinks(text, textLayer.links), warnings };
}

export async function extractResumeText(
  params: ExtractParams,
): Promise<ExtractedResumeText> {
  const { fileBuffer, mimeType } = params;

  switch (detectDocumentKind(fileBuffer, mimeType)) {
    case "text": {
      const text = fileBuffer.toString("utf8");
      if (text.trim().length === 0) {
        throw new ResumeImportError(
          "Uploaded text file did not contain readable content.",
          400,
        );
      }
      return { markdown: text, warnings: [] };
    }
    case "pdf":
      return extractFromPdf(params);
    case "docx": {
      let document: Awaited<ReturnType<typeof extractDocxText>>;
      try {
        document = await extractDocxText(fileBuffer);
      } catch (error) {
        logger.error({ err: error }, "Failed to read the uploaded DOCX");
        throw new ResumeImportError(
          "This DOCX file could not be read. Save it again from your editor, or upload a PDF.",
          422,
          error,
        );
      }
      if (document.text.length === 0) {
        throw new ResumeImportError(
          "No readable text was found in this file. Upload a PDF or TXT file instead.",
          422,
        );
      }
      return {
        markdown: appendLinks(document.text, document.links),
        warnings: [],
      };
    }
    case "legacy-doc":
      throw new ResumeImportError(
        "Legacy .doc files are not supported. Save the document as DOCX or PDF, then upload it again.",
        415,
      );
    case "unknown":
      throw new ResumeImportError(
        "This file is not a PDF, DOCX or TXT document. Upload a PDF, DOCX or TXT file.",
        415,
      );
  }
}
