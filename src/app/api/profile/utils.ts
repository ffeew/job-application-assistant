import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

export async function getUserId(request: NextRequest): Promise<string | null> {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user.id ?? null;
}

export function parseNumericId(id: string): number | null {
  const numericId = parseInt(id, 10);
  return Number.isNaN(numericId) ? null : numericId;
}
