import { NextResponse } from "next/server";
import { z } from "zod";
import { JobRequestError } from "./jobs/service";
import { ResumeGenerationError } from "@/lib/resume-errors";

export function generationErrorResponse(error: unknown) {
  if (error instanceof JobRequestError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  }
  if (error instanceof z.ZodError || error instanceof SyntaxError) {
    return NextResponse.json(
      { error: "Invalid resume request. Check the selected options." },
      { status: 400 },
    );
  }
  const message =
    error instanceof ResumeGenerationError
      ? error.message
      : "Failed to generate the resume. Please retry.";
  return NextResponse.json({ error: message }, { status: 503 });
}
