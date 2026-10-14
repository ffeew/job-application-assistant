import { NextResponse } from "next/server";
import { z } from "zod";
import { JobRequestError } from "./jobs/service";
import { logger } from "@/lib/logger";
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
  if (error instanceof ResumeGenerationError) {
    // The message is written for the user; the cause is only useful here.
    logger.warn({ err: error }, "Resume generation is unavailable");
    return NextResponse.json({ error: error.message }, { status: 503 });
  }
  logger.error({ err: error }, "Resume generation request failed");
  return NextResponse.json(
    { error: "The resume service hit an unexpected error. Please retry." },
    { status: 500 },
  );
}
