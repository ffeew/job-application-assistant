import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/app/api/profile/utils";
import { limitAiRequest } from "@/app/api/ai-rate-limit";
import { fileStorageAvailable } from "@/app/api/stored-files";
import { keepUpload } from "@/app/api/profile/resume-uploads/service";
import { logger } from "@/lib/logger";
import { ResumeImportError } from "./errors";
import { ResumeImportService } from "./service";

export const runtime = "nodejs";

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "application/octet-stream",
]);

const MULTIPART_OVERHEAD_BYTES = 64 * 1024;

const tooLargeResponse = () =>
  NextResponse.json(
    { error: "Resume file is too large. Please upload a file under 8MB." },
    { status: 413 },
  );

const resumeImportService = new ResumeImportService();

export async function POST(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const limited = limitAiRequest("resumeImport", userId);
  if (limited) return limited;

  // Reject an oversized upload from its declared length, before the body is
  // read into memory. A multipart body carries a little framing beyond the file.
  const declaredLength = Number(request.headers.get("content-length"));
  if (declaredLength > MAX_FILE_SIZE_BYTES + MULTIPART_OVERHEAD_BYTES) {
    return tooLargeResponse();
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (error) {
    logger.error({ err: error }, "Failed to parse form data for resume import");
    return NextResponse.json(
      { error: "Invalid form data. Please try again." },
      { status: 400 },
    );
  }

  const fileEntry = formData.get("file");
  if (!fileEntry || !(fileEntry instanceof Blob)) {
    return NextResponse.json(
      { error: "No resume file uploaded. Please select a file to import." },
      { status: 400 },
    );
  }

  const file = fileEntry;
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return tooLargeResponse();
  }
  const mimeType = file.type || "application/octet-stream";
  const fileName = file instanceof File ? file.name : "resume";

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return NextResponse.json(
      { error: "Unsupported file type. Upload a PDF, DOCX or TXT file." },
      { status: 415 },
    );
  }

  let arrayBuffer: ArrayBuffer;
  try {
    arrayBuffer = await file.arrayBuffer();
  } catch (error) {
    logger.error({ err: error }, "Failed to read resume file");
    return NextResponse.json(
      { error: "Unable to read the uploaded file. Please try again." },
      { status: 400 },
    );
  }

  if (arrayBuffer.byteLength === 0) {
    return NextResponse.json(
      { error: "Uploaded file is empty. Please choose a valid resume." },
      { status: 400 },
    );
  }

  try {
    const result = await resumeImportService.importProfileFromResume({
      arrayBuffer,
      mimeType,
    });

    // The original is kept once it has been read, so every file listed under
    // imported files is one that imported. Keeping it is secondary: a failure
    // is reported beside the result, not in place of it.
    const kept =
      !fileStorageAvailable ||
      (await keepUpload(userId, {
        fileName,
        mimeType,
        bytes: new Uint8Array(arrayBuffer),
      }));

    return NextResponse.json(
      kept
        ? result
        : {
            ...result,
            warnings: [
              ...result.warnings,
              "The original file couldn't be kept, so it is not listed under imported files. Everything read from it is still here.",
            ],
          },
    );
  } catch (error) {
    if (error instanceof ResumeImportError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    logger.error({ err: error }, "Unexpected error during resume import");
    return NextResponse.json(
      { error: "Unexpected error importing resume. Please try again." },
      { status: 500 },
    );
  }
}
