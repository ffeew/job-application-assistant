import { db } from "@/lib/db/db";
import { coverLetters, jobApplications, resumes } from "@/lib/db/schema";
import { count, desc, eq } from "drizzle-orm";
import type {
  ActivityItem,
  ActivityQuery,
  DashboardActivity,
  DashboardStats,
} from "./validators";

type ActivityRow = Omit<ActivityItem, "createdAt"> & { createdAt: Date };

export class DashboardService {
  // Counted in the database: these tables hold whole resumes, letters and job
  // descriptions, which a row-by-row count would load on every dashboard visit.
  async getDashboardStats(userId: string): Promise<DashboardStats> {
    const [statusCounts, totalResumes, totalCoverLetters] = await Promise.all([
      db
        .select({ status: jobApplications.status, total: count() })
        .from(jobApplications)
        .where(eq(jobApplications.userId, userId))
        .groupBy(jobApplications.status),
      db.$count(resumes, eq(resumes.userId, userId)),
      db.$count(coverLetters, eq(coverLetters.userId, userId)),
    ]);

    const applicationsByStatus: DashboardStats["applicationsByStatus"] = {
      applied: 0,
      interviewing: 0,
      offer: 0,
      rejected: 0,
      withdrawn: 0,
    };
    const isKnownStatus = (
      status: string,
    ): status is keyof typeof applicationsByStatus =>
      status in applicationsByStatus;

    let totalApplications = 0;
    for (const { status, total } of statusCounts) {
      totalApplications += total;
      if (isKnownStatus(status)) applicationsByStatus[status] = total;
    }

    return {
      totalApplications,
      totalResumes,
      totalCoverLetters,
      applicationsByStatus,
    };
  }

  async getDashboardActivity(
    userId: string,
    query?: ActivityQuery,
  ): Promise<DashboardActivity> {
    const limit = query?.limit || 10;
    const wants = (type: ActivityItem["type"]) =>
      !query?.type || query.type === type;

    const [applications, resumesList, coverLettersList] = await Promise.all([
      wants("application")
        ? db
            .select({
              id: jobApplications.id,
              position: jobApplications.position,
              company: jobApplications.company,
              createdAt: jobApplications.createdAt,
            })
            .from(jobApplications)
            .where(eq(jobApplications.userId, userId))
            .orderBy(desc(jobApplications.createdAt))
            .limit(limit)
        : [],
      wants("resume")
        ? db
            .select({
              id: resumes.id,
              title: resumes.title,
              createdAt: resumes.createdAt,
            })
            .from(resumes)
            .where(eq(resumes.userId, userId))
            .orderBy(desc(resumes.createdAt))
            .limit(limit)
        : [],
      wants("cover_letter")
        ? db
            .select({
              id: coverLetters.id,
              title: coverLetters.title,
              isAiGenerated: coverLetters.isAiGenerated,
              createdAt: coverLetters.createdAt,
            })
            .from(coverLetters)
            .where(eq(coverLetters.userId, userId))
            .orderBy(desc(coverLetters.createdAt))
            .limit(limit)
        : [],
    ]);

    const activities: ActivityRow[] = [
      ...applications.map(
        (app): ActivityRow => ({
          id: app.id,
          type: "application",
          action: "created",
          title: `${app.position} at ${app.company}`,
          description: `Applied for ${app.position} position`,
          createdAt: app.createdAt,
        }),
      ),
      ...resumesList.map(
        (resume): ActivityRow => ({
          id: resume.id,
          type: "resume",
          action: "created",
          title: resume.title,
          description: `Created resume: ${resume.title}`,
          createdAt: resume.createdAt,
        }),
      ),
      ...coverLettersList.map(
        (letter): ActivityRow => ({
          id: letter.id,
          type: "cover_letter",
          action: "created",
          title: letter.title,
          description: letter.isAiGenerated
            ? `Generated AI cover letter: ${letter.title}`
            : `Created cover letter: ${letter.title}`,
          createdAt: letter.createdAt,
        }),
      ),
    ];

    return activities
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
      .map((activity) => ({
        ...activity,
        createdAt: activity.createdAt.toISOString(),
      }));
  }
}
