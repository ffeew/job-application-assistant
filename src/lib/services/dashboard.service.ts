import { db } from "@/lib/db/db";
import { jobApplications, resumes, coverLetters } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import type { 
  DashboardStats, 
  DashboardActivity, 
  ActivityQuery,
  ActivityItem 
} from "@/lib/validators";

export class DashboardService {
  async getDashboardStats(userId: string): Promise<DashboardStats> {
    // Get total counts
    const [applicationsList, resumesList, coverLettersList] = await Promise.all([
      db.select().from(jobApplications).where(eq(jobApplications.userId, userId)),
      db.select().from(resumes).where(eq(resumes.userId, userId)),
      db.select().from(coverLetters).where(eq(coverLetters.userId, userId)),
    ]);

    // Count applications by status
    const applicationsByStatus = {
      applied: 0,
      interviewing: 0,
      offer: 0,
      rejected: 0,
      withdrawn: 0,
    };

    applicationsList.forEach(app => {
      if (app.status in applicationsByStatus) {
        applicationsByStatus[app.status as keyof typeof applicationsByStatus]++;
      }
    });

    return {
      totalApplications: applicationsList.length,
      totalResumes: resumesList.length,
      totalCoverLetters: coverLettersList.length,
      applicationsByStatus,
    };
  }

  async getDashboardActivity(userId: string, query?: ActivityQuery): Promise<DashboardActivity> {
    const activities: ActivityItem[] = [];

    // Get recent applications
    if (!query?.type || query.type === 'application') {
      const applications = await db
        .select()
        .from(jobApplications)
        .where(eq(jobApplications.userId, userId))
        .orderBy(desc(jobApplications.createdAt))
        .limit(query?.limit || 10);

      applications.forEach(app => {
        activities.push({
          id: app.id,
          type: 'application',
          action: 'created',
          title: `${app.position} at ${app.company}`,
          description: `Applied for ${app.position} position`,
          createdAt: app.createdAt,
        });
      });
    }

    // Get recent resumes
    if (!query?.type || query.type === 'resume') {
      const resumesList = await db
        .select()
        .from(resumes)
        .where(eq(resumes.userId, userId))
        .orderBy(desc(resumes.createdAt))
        .limit(query?.limit || 10);

      resumesList.forEach(resume => {
        activities.push({
          id: resume.id,
          type: 'resume',
          action: 'created',
          title: resume.title,
          description: `Created resume: ${resume.title}`,
          createdAt: resume.createdAt,
        });
      });
    }

    // Get recent cover letters
    if (!query?.type || query.type === 'cover_letter') {
      const coverLettersList = await db
        .select()
        .from(coverLetters)
        .where(eq(coverLetters.userId, userId))
        .orderBy(desc(coverLetters.createdAt))
        .limit(query?.limit || 10);

      coverLettersList.forEach(letter => {
        activities.push({
          id: letter.id,
          type: 'cover_letter',
          action: 'created',
          title: letter.title,
          description: letter.isAiGenerated 
            ? `Generated AI cover letter: ${letter.title}`
            : `Created cover letter: ${letter.title}`,
          createdAt: letter.createdAt,
        });
      });
    }

    // Sort by creation date and limit
    return activities
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, query?.limit || 10);
  }
}