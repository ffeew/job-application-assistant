import { db } from "@/lib/db/db";
import { resumes } from "@/lib/db/schema";
import { and, asc, desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { assertOwnsApplication } from "../linked-records";
import type {
  CreateResumeRequest,
  ResumeResponse,
  ResumesQuery,
  UpdateResumeRequest,
} from "./validators";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

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

    return resumesList.map((resume) => ({
      ...resume,
      isDefault: Boolean(resume.isDefault),
      isTailored: Boolean(resume.isTailored),
    }));
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
    return resume
      ? {
          ...resume,
          isDefault: Boolean(resume.isDefault),
          isTailored: Boolean(resume.isTailored),
        }
      : null;
  }

  async createResume(
    userId: string,
    data: CreateResumeRequest,
  ): Promise<ResumeResponse> {
    const id = randomUUID();
    const now = new Date();

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
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      return created;
    });

    if (!resume) {
      throw new Error("Failed to create resume");
    }

    return {
      ...resume,
      isDefault: Boolean(resume.isDefault),
      isTailored: Boolean(resume.isTailored),
    };
  }

  async updateResume(
    userId: string,
    id: string,
    data: UpdateResumeRequest,
  ): Promise<ResumeResponse | null> {
    const now = new Date();

    await assertOwnsApplication(userId, data.jobApplicationId);

    const resume = await db.transaction(async (tx) => {
      if (data.isDefault) {
        // Only a resume this user owns may displace the current default; an
        // unknown ID must leave it in place.
        const owned = await lockResumes(tx, userId);
        if (!owned.includes(id)) return undefined;
        await clearDefault(tx, userId);
      }
      const [updated] = await tx
        .update(resumes)
        .set({
          ...data,
          updatedAt: now,
        })
        .where(and(eq(resumes.id, id), eq(resumes.userId, userId)))
        .returning();
      return updated;
    });

    return resume
      ? {
          ...resume,
          isDefault: Boolean(resume.isDefault),
          isTailored: Boolean(resume.isTailored),
        }
      : null;
  }

  async deleteResume(userId: string, id: string): Promise<boolean> {
    const result = await db
      .delete(resumes)
      .where(and(eq(resumes.id, id), eq(resumes.userId, userId)))
      .returning({ id: resumes.id });

    return result.length > 0;
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
    return resume
      ? {
          ...resume,
          isDefault: Boolean(resume.isDefault),
          isTailored: Boolean(resume.isTailored),
        }
      : null;
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
    return resume
      ? {
          ...resume,
          isDefault: Boolean(resume.isDefault),
          isTailored: Boolean(resume.isTailored),
        }
      : null;
  }

}
