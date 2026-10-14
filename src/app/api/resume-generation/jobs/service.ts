import { and, asc, desc, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db/db";
import {
  jobApplications,
  resumes,
  resumeGenerationJobs,
} from "@/lib/db/schema";
import {
  generatedResumeResultSchema,
  serializeGeneratedResume,
  type GeneratedResumeResult,
} from "@/lib/resume-document";
import { ResumeGenerationError } from "@/lib/resume-errors";
import { ApplicationsService } from "../../applications/service";
import { discardFile, storeResumePdf } from "../../stored-files";
import { ResumeGenerationService } from "../service";
import {
  generationJobPayloadSchema,
  generationJobResponseSchema,
  type GenerationJobPayload,
} from "./validators";

export const MAX_ACTIVE_JOBS_PER_USER = 3;
const LEASE_MS = 5 * 60 * 1000;
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
// A restored failure is only useful right after it happened; later it would
// greet a returning user with an error for something they are no longer doing.
const FAILURE_VISIBLE_MS = 15 * 60 * 1000;
type Job = typeof resumeGenerationJobs.$inferSelect;
export type ClaimedGenerationJob = Job & { claimToken: string };

export class JobRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

// A row written by an earlier release may not match the current schemas. It is
// reported as absent, which lets the screen start a new generation, rather than
// as a malformed request from the client.
function response(job: Job) {
  const parsed = generationJobResponseSchema.safeParse({
    ...job,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  });
  if (!parsed.success) {
    console.error(
      `Generation job ${job.id} does not match the current schema:`,
      parsed.error,
    );
    return null;
  }
  return parsed.data;
}

export async function enqueueGenerationJob(userId: string, input: unknown) {
  const payload = generationJobPayloadSchema.parse(input);
  if (payload.kind === "application") {
    const application = await new ApplicationsService().getApplicationById(
      userId,
      payload.request.applicationId,
    );
    if (!application) throw new JobRequestError("Application not found", 404);
    if (payload.request.useAISelection && !application.jobDescription) {
      throw new JobRequestError(
        "Job description is required for AI-powered resume generation",
        400,
      );
    }
  } else {
    const validation =
      await new ResumeGenerationService().validateResumeGeneration(
        userId,
        payload.request,
      );
    if (!validation.valid)
      throw new JobRequestError(validation.errors.join("; "), 400);
  }
  // One worker serves every account in turn, so an account that could queue
  // without limit would hold up everyone else's resumes.
  const active = await db.$count(
    resumeGenerationJobs,
    and(
      eq(resumeGenerationJobs.userId, userId),
      inArray(resumeGenerationJobs.status, ["queued", "running"]),
    ),
  );
  if (active >= MAX_ACTIVE_JOBS_PER_USER) {
    throw new JobRequestError(
      "You already have resumes being generated. Wait for one to finish, then try again.",
      429,
    );
  }
  const [job] = await db
    .insert(resumeGenerationJobs)
    .values({
      userId,
      payload,
      applicationId:
        payload.kind === "application" ? payload.request.applicationId : null,
    })
    .returning();
  if (!job) throw new Error("Failed to enqueue generation");
  return { jobId: job.id, status: job.status };
}

export async function getGenerationJob(userId: string, id: string) {
  const [job] = await db
    .select()
    .from(resumeGenerationJobs)
    .where(
      and(
        eq(resumeGenerationJobs.id, id),
        eq(resumeGenerationJobs.userId, userId),
      ),
    )
    .limit(1);
  return job ? response(job) : null;
}

export async function getLatestGenerationJob(
  userId: string,
  applicationId: string | null,
  now = new Date(),
) {
  const [job] = await db
    .select()
    .from(resumeGenerationJobs)
    .where(
      and(
        eq(resumeGenerationJobs.userId, userId),
        applicationId === null
          ? isNull(resumeGenerationJobs.applicationId)
          : eq(resumeGenerationJobs.applicationId, applicationId),
      ),
    )
    .orderBy(
      desc(resumeGenerationJobs.createdAt),
      desc(resumeGenerationJobs.id),
    )
    .limit(1);
  if (
    job?.status === "failed" &&
    job.updatedAt.getTime() < now.getTime() - FAILURE_VISIBLE_MS
  )
    return null;
  return job ? response(job) : null;
}

export async function recoverGenerationJobs(now = new Date()) {
  await db
    .update(resumeGenerationJobs)
    .set({
      status: "failed",
      error: "Generation was interrupted twice. Please retry.",
      finishedAt: now,
      updatedAt: now,
      claimToken: null,
      leaseExpiresAt: null,
    })
    .where(
      and(
        eq(resumeGenerationJobs.status, "running"),
        lt(resumeGenerationJobs.leaseExpiresAt, now),
        sql`${resumeGenerationJobs.attempts} >= 2`,
      ),
    );
  await db
    .update(resumeGenerationJobs)
    .set({
      status: "queued",
      updatedAt: now,
      claimToken: null,
      leaseExpiresAt: null,
    })
    .where(
      and(
        eq(resumeGenerationJobs.status, "running"),
        lt(resumeGenerationJobs.leaseExpiresAt, now),
        sql`${resumeGenerationJobs.attempts} < 2`,
      ),
    );
}

export async function claimGenerationJob(): Promise<ClaimedGenerationJob | null> {
  return db.transaction(async (tx) => {
    const [next] = await tx
      .select()
      .from(resumeGenerationJobs)
      .where(eq(resumeGenerationJobs.status, "queued"))
      .orderBy(
        asc(resumeGenerationJobs.createdAt),
        asc(resumeGenerationJobs.id),
      )
      .limit(1)
      .for("update", { skipLocked: true });
    if (!next) return null;
    const claimToken = crypto.randomUUID();
    const now = new Date();
    const [claimed] = await tx
      .update(resumeGenerationJobs)
      .set({
        status: "running",
        claimToken,
        updatedAt: now,
        attempts: next.attempts + 1,
        leaseExpiresAt: new Date(now.getTime() + LEASE_MS),
      })
      .where(eq(resumeGenerationJobs.id, next.id))
      .returning();
    return claimed ? { ...claimed, claimToken } : null;
  });
}

function ownsClaim(job: ClaimedGenerationJob) {
  return and(
    eq(resumeGenerationJobs.id, job.id),
    eq(resumeGenerationJobs.status, "running"),
    eq(resumeGenerationJobs.claimToken, job.claimToken),
    sql`${resumeGenerationJobs.leaseExpiresAt} > now()`,
  );
}

export async function heartbeatGenerationJob(job: ClaimedGenerationJob) {
  const now = new Date();
  const renewed = await db
    .update(resumeGenerationJobs)
    .set({
      leaseExpiresAt: new Date(now.getTime() + LEASE_MS),
      updatedAt: now,
    })
    .where(ownsClaim(job))
    .returning({ id: resumeGenerationJobs.id });
  return renewed.length > 0;
}

export async function completeGenerationJob(
  job: ClaimedGenerationJob,
  input: unknown,
) {
  const result = generatedResumeResultSchema.parse(input);
  const payload = generationJobPayloadSchema.parse(job.payload);
  // Only this intent saves a library resume, and with it the PDF.
  const savedForApplication =
    payload.kind === "application" && payload.intent === "save-and-download"
      ? payload.request.applicationId
      : null;
  // Stored ahead of the transaction so no row lock is held across the upload.
  // The file is removed again below if the save does not commit.
  const pdfKey = savedForApplication
    ? await storeResumePdf(
        job.userId,
        Buffer.from(result.pdfBase64, "base64"),
      )
    : null;
  let outcome: { completed: boolean; replacedKey: string | null };
  try {
    outcome = await completeInTransaction(
      job,
      result,
      payload.request.title,
      savedForApplication,
      pdfKey,
    );
  } catch (error) {
    await discardFile(pdfKey);
    throw error;
  }
  await discardFile(outcome.completed ? outcome.replacedKey : pdfKey);
  return outcome.completed;
}

function completeInTransaction(
  job: ClaimedGenerationJob,
  result: GeneratedResumeResult,
  title: string,
  savedForApplication: string | null,
  pdfKey: string | null,
) {
  return db.transaction(async (tx) => {
    const [owned] = await tx
      .select()
      .from(resumeGenerationJobs)
      .where(ownsClaim(job))
      .for("update");
    if (!owned) return { completed: false, replacedKey: null };
    let savedResumeId: string | null = null;
    let replacedKey: string | null = null;
    if (savedForApplication) {
      // Lock the application to serialize saves for the same workflow.
      const [application] = await tx
        .select()
        .from(jobApplications)
        .where(
          and(
            eq(jobApplications.id, savedForApplication),
            eq(jobApplications.userId, job.userId),
          ),
        )
        .for("update");
      if (!application) throw new JobRequestError("Application not found", 404);
      const [existing] = await tx
        .select()
        .from(resumes)
        .where(
          and(
            eq(resumes.userId, job.userId),
            eq(resumes.jobApplicationId, application.id),
            eq(resumes.isTailored, true),
          ),
        )
        // The same row the application page reads as the saved resume.
        .orderBy(desc(resumes.updatedAt))
        .limit(1);
      const values = {
        title,
        content: serializeGeneratedResume(result),
        pdfKey,
        updatedAt: new Date(),
      };
      if (existing) {
        await tx.update(resumes).set(values).where(eq(resumes.id, existing.id));
        savedResumeId = existing.id;
        replacedKey = existing.pdfKey;
      } else {
        const [saved] = await tx
          .insert(resumes)
          .values({
            ...values,
            userId: job.userId,
            jobApplicationId: application.id,
            isTailored: true,
            isDefault: false,
          })
          .returning({ id: resumes.id });
        if (!saved) throw new Error("Failed to save tailored resume");
        savedResumeId = saved.id;
      }
    }
    const now = new Date();
    await tx
      .update(resumeGenerationJobs)
      .set({
        status: "completed",
        result,
        savedResumeId,
        finishedAt: now,
        updatedAt: now,
        claimToken: null,
        leaseExpiresAt: null,
      })
      .where(eq(resumeGenerationJobs.id, job.id));
    return { completed: true, replacedKey };
  });
}

export async function failGenerationJob(
  job: ClaimedGenerationJob,
  error: unknown,
) {
  const now = new Date();
  const message =
    error instanceof ResumeGenerationError || error instanceof JobRequestError
      ? error.message
      : "Resume generation failed. Please retry.";
  await db
    .update(resumeGenerationJobs)
    .set({
      status: "failed",
      error: message,
      finishedAt: now,
      updatedAt: now,
      claimToken: null,
      leaseExpiresAt: null,
    })
    .where(ownsClaim(job));
}

export async function cleanupGenerationJobs(now = new Date()) {
  await db
    .delete(resumeGenerationJobs)
    .where(
      lt(
        resumeGenerationJobs.finishedAt,
        new Date(now.getTime() - RETENTION_MS),
      ),
    );
}

export async function generateJobResult(
  userId: string,
  payload: GenerationJobPayload,
  signal: AbortSignal,
): Promise<GeneratedResumeResult> {
  const service = new ResumeGenerationService();
  if (payload.kind === "profile")
    return service.generateResume(userId, payload.request, signal);
  const application = await new ApplicationsService().getApplicationById(
    userId,
    payload.request.applicationId,
  );
  if (!application) throw new JobRequestError("Application not found", 404);
  return service.generateJobApplicationResume(
    userId,
    application,
    payload.request,
    signal,
  );
}
