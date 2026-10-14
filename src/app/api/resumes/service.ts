import { db } from "@/lib/db/db";
import { resumes } from "@/lib/db/schema";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { assertOwnsApplication } from "../linked-records";
import { discardFile, removeFile } from "../stored-files";
import type {
  CreateResumeRequest,
  ResumeResponse,
  ResumesQuery,
  UpdateResumeRequest,
} from "./validators";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type ResumeRow = typeof resumes.$inferSelect;

// Lists every field a client receives. The storage key is left out: clients
// ask for a PDF by resume ID.
function toResponse(resume: ResumeRow): ResumeResponse {
  return {
    id: resume.id,
    userId: resume.userId,
    title: resume.title,
    content: resume.content,
    isDefault: Boolean(resume.isDefault),
    jobApplicationId: resume.jobApplicationId,
    isTailored: Boolean(resume.isTailored),
    createdAt: resume.createdAt,
    updatedAt: resume.updatedAt,
  };
}

/**
 * Locks the user's resumes in ID order and returns their IDs. Two concurrent
 * default changes then queue up instead of deadlocking or leaving two defaults.
 */
async function lockResumes(tx: Transaction, userId: string) {
  const owned = await tx
    .select({ id: resumes.id })
    .from(resumes)
    .where(eq(resumes.userId, userId))
    .orderBy(asc(resumes.id))
    .for("update");
  return owned.map((resume) => resume.id);
}

async function clearDefault(tx: Transaction, userId: string) {
  await tx
    .update(resumes)
    .set({ isDefault: false })
    .where(and(eq(resumes.userId, userId), eq(resumes.isDefault, true)));
}

export class ResumesService {
  async getResumes(
    userId: string,
    query?: ResumesQuery,
  ): Promise<ResumeResponse[]> {
    const whereConditions = [eq(resumes.userId, userId)];

    if (query?.isDefault !== undefined) {
      whereConditions.push(eq(resumes.isDefault, query.isDefault));
    }
    if (query?.isTailored !== undefined) {
      whereConditions.push(eq(resumes.isTailored, query.isTailored));
    }
    if (query?.jobApplicationId !== undefined) {
      whereConditions.push(
        eq(resumes.jobApplicationId, query.jobApplicationId),
      );
    }

    const resumesList = await db
      .select()
      .from(resumes)
      .where(and(...whereConditions))
      .orderBy(desc(resumes.updatedAt))
      .limit(query?.limit || 100)
      .offset(query?.offset || 0);

    return resumesList.map(toResponse);
  }

  async getResumeById(
    userId: string,
    id: string,
  ): Promise<ResumeResponse | null> {
    const resumesList = await db
      .select()
      .from(resumes)
      .where(and(eq(resumes.id, id), eq(resumes.userId, userId)))
      .limit(1);

    const resume = resumesList[0];
    return resume ? toResponse(resume) : null;
  }

  /**
   * `pdfKey` names a PDF already stored for this content. If the resume is not
   * created, that file is removed again.
   */
  async createResume(
    userId: string,
    data: CreateResumeRequest,
    pdfKey: string | null = null,
  ): Promise<ResumeResponse> {
    const id = randomUUID();
    const now = new Date();

    try {
      await assertOwnsApplication(userId, data.jobApplicationId);

      const resume = await db.transaction(async (tx) => {
        if (data.isDefault) {
          await lockResumes(tx, userId);
          await clearDefault(tx, userId);
        }
        const [created] = await tx
          .insert(resumes)
          .values({
            id,
            userId,
            title: data.title,
            content: data.content,
            isDefault: data.isDefault || false,
            jobApplicationId: data.jobApplicationId || null,
            isTailored: data.isTailored || false,
            pdfKey,
            createdAt: now,
            updatedAt: now,
          })
          .returning();
        return created;
      });

      if (!resume) {
        throw new Error("Failed to create resume");
      }

      return toResponse(resume);
    } catch (error) {
      await discardFile(pdfKey);
      throw error;
    }
  }

  /**
   * New content makes the stored PDF out of date, so it is replaced by
   * `pdfKey`, a PDF already stored for that content, or cleared. Other changes
   * leave it alone.
   */
  async updateResume(
    userId: string,
    id: string,
    data: UpdateResumeRequest,
    pdfKey: string | null = null,
  ): Promise<ResumeResponse | null> {
    const now = new Date();
    const replacesContent = data.content !== undefined;

    let outcome: { resume: ResumeRow | undefined; previousKey: string | null };
    try {
      await assertOwnsApplication(userId, data.jobApplicationId);

      outcome = await db.transaction(async (tx) => {
        if (data.isDefault) {
          // Only a resume this user owns may displace the current default; an
          // unknown ID must leave it in place.
          const owned = await lockResumes(tx, userId);
          if (!owned.includes(id))
            return { resume: undefined, previousKey: null };
          await clearDefault(tx, userId);
        }
        const owns = and(eq(resumes.id, id), eq(resumes.userId, userId));
        let previousKey: string | null = null;
        if (replacesContent) {
          const [current] = await tx
            .select({ pdfKey: resumes.pdfKey })
            .from(resumes)
            .where(owns)
            .for("update");
          previousKey = current?.pdfKey ?? null;
        }
        const [updated] = await tx
          .update(resumes)
          .set({
            ...data,
            ...(replacesContent ? { pdfKey } : {}),
            updatedAt: now,
          })
          .where(owns)
          .returning();
        return { resume: updated, previousKey };
      });
    } catch (error) {
      await discardFile(pdfKey);
      throw error;
    }

    if (!outcome.resume) {
      await discardFile(pdfKey);
      return null;
    }
    if (outcome.previousKey !== outcome.resume.pdfKey) {
      await discardFile(outcome.previousKey);
    }
    return toResponse(outcome.resume);
  }

  async deleteResume(userId: string, id: string): Promise<boolean> {
    const owns = and(eq(resumes.id, id), eq(resumes.userId, userId));
    const [owned] = await db
      .select({ pdfKey: resumes.pdfKey })
      .from(resumes)
      .where(owns)
      .limit(1);
    if (!owned) return false;

    // The file goes first. If it cannot be removed the resume stays, and the
    // delete can be tried again; the other order could leave the file behind.
    await removeFile(owned.pdfKey);
    const [deleted] = await db
      .delete(resumes)
      .where(owns)
      .returning({ pdfKey: resumes.pdfKey });
    // A save that landed in between stored another PDF.
    if (deleted && deleted.pdfKey !== owned.pdfKey) {
      await discardFile(deleted.pdfKey);
    }
    return Boolean(deleted);
  }

  /** What the PDF route needs, including the key no other response carries. */
  async getResumeForPdf(userId: string, id: string) {
    const [resume] = await db
      .select({
        title: resumes.title,
        content: resumes.content,
        pdfKey: resumes.pdfKey,
        updatedAt: resumes.updatedAt,
      })
      .from(resumes)
      .where(and(eq(resumes.id, id), eq(resumes.userId, userId)))
      .limit(1);
    return resume ?? null;
  }

  /**
   * Records a PDF compiled for a resume that had none stored. It applies only
   * if the resume is still as it was read, and it leaves `updatedAt` alone:
   * that timestamp orders the library and picks an application's saved resume.
   */
  async attachPdf(
    userId: string,
    id: string,
    key: string,
    seen: { pdfKey: string | null; updatedAt: Date },
  ): Promise<boolean> {
    const attached = await db
      .update(resumes)
      .set({ pdfKey: key })
      .where(
        and(
          eq(resumes.id, id),
          eq(resumes.userId, userId),
          eq(resumes.updatedAt, seen.updatedAt),
          seen.pdfKey === null
            ? isNull(resumes.pdfKey)
            : eq(resumes.pdfKey, seen.pdfKey),
        ),
      )
      .returning({ id: resumes.id });
    return attached.length > 0;
  }

  async getResumesCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: resumes.id })
      .from(resumes)
      .where(eq(resumes.userId, userId));

    return result.length;
  }

  async getDefaultResume(userId: string): Promise<ResumeResponse | null> {
    const resumesList = await db
      .select()
      .from(resumes)
      .where(and(eq(resumes.userId, userId), eq(resumes.isDefault, true)))
      .limit(1);

    const resume = resumesList[0];
    return resume ? toResponse(resume) : null;
  }

  async getTailoredResumeByApplication(
    userId: string,
    jobApplicationId: string,
  ): Promise<ResumeResponse | null> {
    const resumesList = await db
      .select()
      .from(resumes)
      .where(
        and(
          eq(resumes.userId, userId),
          eq(resumes.jobApplicationId, jobApplicationId),
          eq(resumes.isTailored, true),
        ),
      )
      .orderBy(desc(resumes.updatedAt))
      .limit(1);

    const resume = resumesList[0];
    return resume ? toResponse(resume) : null;
  }

}
