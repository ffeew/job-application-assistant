import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/db";
import { jobApplications, resumes } from "@/lib/db/schema";
import { RequestError } from "@/lib/request-error";

// A record may only link to an application or resume of the same account. The
// foreign keys check that the target exists, not whose it is, and a link into
// another account would be deleted along with that account's record.

export async function assertOwnsApplication(
  userId: string,
  applicationId: string | null | undefined,
): Promise<void> {
  if (!applicationId) return;
  const [owned] = await db
    .select({ id: jobApplications.id })
    .from(jobApplications)
    .where(
      and(
        eq(jobApplications.id, applicationId),
        eq(jobApplications.userId, userId),
      ),
    )
    .limit(1);
  if (!owned) {
    throw new RequestError(
      "The linked application was not found. Choose another one and try again.",
    );
  }
}

export async function assertOwnsResume(
  userId: string,
  resumeId: string | null | undefined,
): Promise<void> {
  if (!resumeId) return;
  const [owned] = await db
    .select({ id: resumes.id })
    .from(resumes)
    .where(and(eq(resumes.id, resumeId), eq(resumes.userId, userId)))
    .limit(1);
  if (!owned) {
    throw new RequestError(
      "The linked resume was not found. Choose another one and try again.",
    );
  }
}
