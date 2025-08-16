import { db } from "@/lib/db/db";
import { resumes } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import type { 
  CreateResumeRequest, 
  UpdateResumeRequest, 
  ResumesQuery,
  ResumeResponse 
} from "@/lib/validators";

export class ResumesService {
  async getResumes(userId: string, query?: ResumesQuery): Promise<ResumeResponse[]> {
    let whereConditions = [eq(resumes.userId, userId)];

    // Add query filters
    if (query?.isDefault !== undefined) {
      whereConditions.push(eq(resumes.isDefault, query.isDefault));
    }

    const resumesList = await db
      .select()
      .from(resumes)
      .where(and(...whereConditions))
      .orderBy(desc(resumes.updatedAt))
      .limit(query?.limit || 100)
      .offset(query?.offset || 0);

    return resumesList;
  }

  async getResumeById(userId: string, id: string): Promise<ResumeResponse | null> {
    const resumesList = await db
      .select()
      .from(resumes)
      .where(and(
        eq(resumes.id, id),
        eq(resumes.userId, userId)
      ))
      .limit(1);

    return resumesList[0] || null;
  }

  async createResume(userId: string, data: CreateResumeRequest): Promise<ResumeResponse> {
    const id = nanoid();
    const now = new Date();

    // If this is being set as default, unset all other defaults first
    if (data.isDefault) {
      await this.unsetAllDefaults(userId);
    }

    const [resume] = await db
      .insert(resumes)
      .values({
        id,
        userId,
        title: data.title,
        content: data.content,
        isDefault: data.isDefault || false,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return resume;
  }

  async updateResume(
    userId: string, 
    id: string, 
    data: UpdateResumeRequest
  ): Promise<ResumeResponse | null> {
    const now = new Date();

    // If this is being set as default, unset all other defaults first
    if (data.isDefault) {
      await this.unsetAllDefaults(userId);
    }

    const [resume] = await db
      .update(resumes)
      .set({
        ...data,
        updatedAt: now,
      })
      .where(and(
        eq(resumes.id, id),
        eq(resumes.userId, userId)
      ))
      .returning();

    return resume || null;
  }

  async deleteResume(userId: string, id: string): Promise<boolean> {
    const result = await db
      .delete(resumes)
      .where(and(
        eq(resumes.id, id),
        eq(resumes.userId, userId)
      ));

    return result.rowsAffected > 0;
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
      .where(and(
        eq(resumes.userId, userId),
        eq(resumes.isDefault, true)
      ))
      .limit(1);

    return resumesList[0] || null;
  }

  private async unsetAllDefaults(userId: string): Promise<void> {
    await db
      .update(resumes)
      .set({ isDefault: false })
      .where(eq(resumes.userId, userId));
  }
}