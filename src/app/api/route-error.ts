import { NextResponse } from "next/server";
import { z } from "zod";

/**
 * A request the client got wrong is a 400 and needs no log entry. Anything
 * else is a server fault: it is logged with its cause and reported generically.
 */
export function routeErrorResponse(error: unknown, message: string) {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: "Invalid request data", details: error.issues },
      { status: 400 },
    );
  }
  // request.json() rejects with a SyntaxError for a malformed body.
  if (error instanceof SyntaxError) {
    return NextResponse.json(
      { error: "Request body must be valid JSON" },
      { status: 400 },
    );
  }
  console.error(`${message}:`, error);
  return NextResponse.json({ error: message }, { status: 500 });
}
