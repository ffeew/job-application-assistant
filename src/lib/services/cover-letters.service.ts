import { db } from "@/lib/db/db";
import { coverLetters } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";
import { env } from "@/lib/env";
import type {
  CreateCoverLetterRequest,
  UpdateCoverLetterRequest,
  CoverLettersQuery,
  CoverLetterResponse,
  GenerateCoverLetterRequest,
  GenerateCoverLetterResponse
} from "@/lib/validators";

export class CoverLettersService {
  async getCoverLetters(userId: string, query?: CoverLettersQuery): Promise<CoverLetterResponse[]> {
    const whereConditions = [eq(coverLetters.userId, userId)];

    // Add query filters
    if (query?.isAiGenerated !== undefined) {
      whereConditions.push(eq(coverLetters.isAiGenerated, query.isAiGenerated));
    }
    if (query?.jobApplicationId) {
      whereConditions.push(eq(coverLetters.jobApplicationId, query.jobApplicationId));
    }
    if (query?.resumeId) {
      whereConditions.push(eq(coverLetters.resumeId, query.resumeId));
    }

    const coverLettersList = await db
      .select()
      .from(coverLetters)
      .where(and(...whereConditions))
      .orderBy(desc(coverLetters.createdAt))
      .limit(query?.limit || 100)
      .offset(query?.offset || 0);

    // Convert null to undefined and ensure proper typing
    return coverLettersList.map(letter => ({
      ...letter,
      jobApplicationId: letter.jobApplicationId ?? undefined,
      resumeId: letter.resumeId ?? undefined,
      isAiGenerated: letter.isAiGenerated ?? false,
    }));
  }

  async getCoverLetterById(userId: string, id: string): Promise<CoverLetterResponse | null> {
    const coverLettersList = await db
      .select()
      .from(coverLetters)
      .where(and(
        eq(coverLetters.id, id),
        eq(coverLetters.userId, userId)
      ))
      .limit(1);

    if (!coverLettersList[0]) return null;

    const letter = coverLettersList[0];
    return {
      ...letter,
      jobApplicationId: letter.jobApplicationId ?? undefined,
      resumeId: letter.resumeId ?? undefined,
      isAiGenerated: letter.isAiGenerated ?? false,
    };
  }

  async createCoverLetter(userId: string, data: CreateCoverLetterRequest): Promise<CoverLetterResponse> {
    const id = nanoid();
    const now = new Date();

    const [coverLetter] = await db
      .insert(coverLetters)
      .values({
        id,
        userId,
        title: data.title,
        content: data.content,
        isAiGenerated: data.isAiGenerated || false,
        jobApplicationId: data.jobApplicationId || null,
        resumeId: data.resumeId || null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return {
      ...coverLetter,
      jobApplicationId: coverLetter.jobApplicationId ?? undefined,
      resumeId: coverLetter.resumeId ?? undefined,
      isAiGenerated: coverLetter.isAiGenerated ?? false,
    };
  }

  async updateCoverLetter(
    userId: string,
    id: string,
    data: UpdateCoverLetterRequest
  ): Promise<CoverLetterResponse | null> {
    const now = new Date();

    const [coverLetter] = await db
      .update(coverLetters)
      .set({
        ...data,
        updatedAt: now,
      })
      .where(and(
        eq(coverLetters.id, id),
        eq(coverLetters.userId, userId)
      ))
      .returning();

    if (!coverLetter) return null;

    return {
      ...coverLetter,
      jobApplicationId: coverLetter.jobApplicationId ?? undefined,
      resumeId: coverLetter.resumeId ?? undefined,
      isAiGenerated: coverLetter.isAiGenerated ?? false,
    };
  }

  async deleteCoverLetter(userId: string, id: string): Promise<boolean> {
    const result = await db
      .delete(coverLetters)
      .where(and(
        eq(coverLetters.id, id),
        eq(coverLetters.userId, userId)
      ));

    return result.rowsAffected > 0;
  }

  async getCoverLettersCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: coverLetters.id })
      .from(coverLetters)
      .where(eq(coverLetters.userId, userId));

    return result.length;
  }

  async generateCoverLetter(data: GenerateCoverLetterRequest): Promise<GenerateCoverLetterResponse> {
    if (!env.GROQ_API_KEY) {
      throw new Error("AI service not configured. Please contact administrator.");
    }

    const prompt = `You are an expert cover letter writer. Create a professional, personalized cover letter based on the following information:

Company: ${data.company}
Position: ${data.position}
Applicant Name: ${data.applicantName || ""}

Job Description:
${data.jobDescription}

${data.resumeContent ? `Resume/Background Information:
${typeof data.resumeContent === 'string' ? data.resumeContent : JSON.stringify(data.resumeContent, null, 2)}` : ''}

Please write a compelling cover letter that:
1. Addresses the specific role and company
2. Highlights relevant experience and skills from the resume that match the job requirements
3. Shows enthusiasm for the role and company
4. Demonstrates knowledge of the company/industry
5. Includes a strong opening and closing
6. Is professional but personable
7. Is about 3-4 paragraphs long

Format the cover letter properly with appropriate salutations and structure. Do not include placeholder text like [Your Name] - use the actual information provided or leave blank if not available.`;

    try {
      const groq = createGroq({
        apiKey: env.GROQ_API_KEY,
      });

      const result = await generateText({
        model: groq("llama3-8b-8192"),
        prompt,
        temperature: 0.7,
        maxOutputTokens: 1000,
      });

      return {
        coverLetter: result.text,
        success: true,
      };
    } catch (error) {
      console.error("AI Generation error:", error);
      throw new Error("Failed to generate cover letter. Please try again.");
    }
  }
}