import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/app/api/profile/utils";
import { ResumeImportService, ResumeImportError } from "./service";

export const runtime = "nodejs";

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "application/octet-stream",
]);

const resumeImportService = new ResumeImportService();

export async function POST(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (error) {
    console.error("Failed to parse form data for resume import.", error);
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

  const file = fileEntry as File;
  const mimeType = file.type || "application/octet-stream";

  if (!ALLOWED_MIME_TYPES.has(mimeType) && mimeType !== "application/octet-stream") {
    return NextResponse.json(
      { error: "Unsupported file type. Please upload a PDF, DOC, or DOCX file." },
      { status: 415 },
    );
  }

  let arrayBuffer: ArrayBuffer;
  try {
    arrayBuffer = await file.arrayBuffer();
  } catch (error) {
    console.error("Failed to read resume file.", error);
    return NextResponse.json(
      { error: "Unable to read the uploaded file. Please try again." },
      { status: 400 },
    );
  }

  const fileSize = arrayBuffer.byteLength;
  if (fileSize === 0) {
    return NextResponse.json(
      { error: "Uploaded file is empty. Please choose a valid resume." },
      { status: 400 },
    );
  }

  if (fileSize > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: "Resume file is too large. Please upload a file under 8MB." },
      { status: 413 },
    );
  }

  try {
    const result = await resumeImportService.importProfileFromResume({
      arrayBuffer,
      mimeType,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ResumeImportError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Unexpected error during resume import.", error);
    return NextResponse.json(
      { error: "Unexpected error importing resume. Please try again." },
      { status: 500 },
    );
  }
}
