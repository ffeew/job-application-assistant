import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

export async function getUserId(request: NextRequest): Promise<string | null> {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user.id ?? null;
}

// parseInt would accept "12abc" as 12. The upper bound is PostgreSQL's integer
// range, beyond which the query itself would fail.
export function parseNumericId(id: string): number | null {
  if (!/^\d{1,10}$/.test(id)) return null;
  const numericId = Number(id);
  return numericId <= 2_147_483_647 ? numericId : null;
}
