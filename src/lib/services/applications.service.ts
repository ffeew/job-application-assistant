
import { jobApplications } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import type {
  CreateApplicationRequest,
  UpdateApplicationRequest,
  ApplicationsQuery,
  ApplicationResponse
} from "@/lib/validators";
import { db } from "@/lib/db/db";

export class ApplicationsService {
  async getApplications(userId: string, query?: ApplicationsQuery): Promise<ApplicationResponse[]> {
    let whereConditions = [eq(jobApplications.userId, userId)];

    // Add query filters
    if (query?.status) {
      whereConditions.push(eq(jobApplications.status, query.status));
    }
    if (query?.company) {
      whereConditions.push(eq(jobApplications.company, query.company));
    }

    const applications = await db
      .select()
      .from(jobApplications)
      .where(and(...whereConditions))
      .orderBy(desc(jobApplications.createdAt))
      .limit(query?.limit || 100)
      .offset(query?.offset || 0);

    // Convert null to undefined and ensure proper typing
    return applications.map(app => ({
      ...app,
      jobDescription: app.jobDescription ?? undefined,
      location: app.location ?? undefined,
      jobUrl: app.jobUrl ?? undefined,
      salaryRange: app.salaryRange ?? undefined,
      appliedAt: app.appliedAt ?? undefined,
      notes: app.notes ?? undefined,
      contactEmail: app.contactEmail ?? undefined,
      contactName: app.contactName ?? undefined,
      recruiterId: app.recruiterId ?? undefined,
      status: app.status as "applied" | "interviewing" | "offer" | "rejected" | "withdrawn",
    }));
  }

  async getApplicationById(userId: string, id: string): Promise<ApplicationResponse | null> {
    const applications = await db
      .select()
      .from(jobApplications)
      .where(and(
        eq(jobApplications.id, id),
        eq(jobApplications.userId, userId)
      ))
      .limit(1);

    if (!applications[0]) return null;

    const app = applications[0];
    return {
      ...app,
      jobDescription: app.jobDescription ?? undefined,
      location: app.location ?? undefined,
      jobUrl: app.jobUrl ?? undefined,
      salaryRange: app.salaryRange ?? undefined,
      appliedAt: app.appliedAt ?? undefined,
      notes: app.notes ?? undefined,
      contactEmail: app.contactEmail ?? undefined,
      contactName: app.contactName ?? undefined,
      recruiterId: app.recruiterId ?? undefined,
      status: app.status as "applied" | "interviewing" | "offer" | "rejected" | "withdrawn",
    };
  }

  async createApplication(userId: string, data: CreateApplicationRequest): Promise<ApplicationResponse> {
    const id = nanoid();
    const now = new Date();

    const [application] = await db
      .insert(jobApplications)
      .values({
        id,
        userId,
        company: data.company,
        position: data.position,
        jobDescription: data.jobDescription,
        location: data.location,
        jobUrl: data.jobUrl,
        salaryRange: data.salaryRange,
        status: data.status || "applied",
        appliedAt: data.appliedAt ? new Date(data.appliedAt) : null,
        notes: data.notes,
        contactEmail: data.contactEmail,
        contactName: data.contactName,
        recruiterId: data.recruiterId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return {
      ...application,
      jobDescription: application.jobDescription ?? undefined,
      location: application.location ?? undefined,
      jobUrl: application.jobUrl ?? undefined,
      salaryRange: application.salaryRange ?? undefined,
      appliedAt: application.appliedAt ?? undefined,
      notes: application.notes ?? undefined,
      contactEmail: application.contactEmail ?? undefined,
      contactName: application.contactName ?? undefined,
      recruiterId: application.recruiterId ?? undefined,
      status: application.status as "applied" | "interviewing" | "offer" | "rejected" | "withdrawn",
    };
  }

  async updateApplication(
    userId: string,
    id: string,
    data: UpdateApplicationRequest
  ): Promise<ApplicationResponse | null> {
    const now = new Date();

    const [application] = await db
      .update(jobApplications)
      .set({
        ...data,
        appliedAt: data.appliedAt ? new Date(data.appliedAt) : undefined,
        updatedAt: now,
      })
      .where(and(
        eq(jobApplications.id, id),
        eq(jobApplications.userId, userId)
      ))
      .returning();

    if (!application) return null;

    return {
      ...application,
      jobDescription: application.jobDescription ?? undefined,
      location: application.location ?? undefined,
      jobUrl: application.jobUrl ?? undefined,
      salaryRange: application.salaryRange ?? undefined,
      appliedAt: application.appliedAt ?? undefined,
      notes: application.notes ?? undefined,
      contactEmail: application.contactEmail ?? undefined,
      contactName: application.contactName ?? undefined,
      recruiterId: application.recruiterId ?? undefined,
      status: application.status as "applied" | "interviewing" | "offer" | "rejected" | "withdrawn",
    };
  }

  async deleteApplication(userId: string, id: string): Promise<boolean> {
    const result = await db
      .delete(jobApplications)
      .where(and(
        eq(jobApplications.id, id),
        eq(jobApplications.userId, userId)
      ));

    return result.rowsAffected > 0;
  }

  async getApplicationsCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: jobApplications.id })
      .from(jobApplications)
      .where(eq(jobApplications.userId, userId));

    return result.length;
  }

  async getApplicationsCountByStatus(userId: string): Promise<Record<string, number>> {
    const applications = await db
      .select()
      .from(jobApplications)
      .where(eq(jobApplications.userId, userId));

    const counts = {
      applied: 0,
      interviewing: 0,
      offer: 0,
      rejected: 0,
      withdrawn: 0,
    };

    applications.forEach(app => {
      if (app.status in counts) {
        counts[app.status as keyof typeof counts]++;
      }
    });

    return counts;
  }
}