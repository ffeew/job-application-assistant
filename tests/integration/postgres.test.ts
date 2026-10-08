import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { createHmac } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { NextRequest } from "next/server";
import {
  account,
  education,
  jobApplications,
  resumes,
  resumeGenerationJobs,
  skills,
  session,
  user,
  userProfiles,
  workExperiences,
} from "../../src/lib/db/schema";
import type { GeneratedResumeResult } from "../../src/lib/resume-document";
import { syntheticResume } from "../../src/lib/resume-fixture.test-helper";
import {
  generateResumeSchema,
  jobApplicationResumeRequestSchema,
} from "../../src/app/api/profile/validators";
import { acceptedGenerationJobSchema } from "../../src/app/api/resume-generation/jobs/validators";

const integration = process.env.RUN_DB_INTEGRATION === "1";
describe.skipIf(!integration)("PostgreSQL and persistent generation", () => {
  let database: typeof import("../../src/lib/db/db");
  let jobs: typeof import("../../src/app/api/resume-generation/jobs/service");
  let routes: typeof import("../../src/app/api/resume-generation/jobs/route");
  let detailRoute: typeof import("../../src/app/api/resume-generation/jobs/[id]/route");
  let pdfRoute: typeof import("../../src/app/api/resume-generation/jobs/[id]/pdf/route");
  let auth: typeof import("../../src/lib/auth");
  let userId: string;
  let otherUserId: string;
  let cookie: string;
  let applicationId: string;
  const fixture = crypto.randomUUID();
  const manual = generateResumeSchema.parse({
    title: "Integration Resume",
    contentSelection: {
      includeWorkExperience: false,
      includeEducation: false,
      includeSkills: false,
    },
  });
  const result = (): GeneratedResumeResult => ({
    schemaVersion: 2,
    renderer: "latex",
    templateVersion: 1,
    document: syntheticResume(),
    aiSelection: null,
    config: manual,
    generatedAt: new Date().toISOString(),
    pdfBase64: "JVBERi0xLjQK",
    fit: {
      targetPages: 1,
      pageCount: 1,
      revisions: 0,
      fitsTarget: true,
      changes: [],
      warnings: [],
    },
  });

  beforeAll(async () => {
    if (!new URL(process.env.DATABASE_URL ?? "").pathname.endsWith("_test")) {
      throw new Error(
        "Integration tests require a dedicated database ending in _test.",
      );
    }
    database = await import("../../src/lib/db/db");
    await migrate(database.db, { migrationsFolder: "./migrations" });
    await migrate(database.db, { migrationsFolder: "./migrations" });
    jobs = await import("../../src/app/api/resume-generation/jobs/service");
    routes = await import("../../src/app/api/resume-generation/jobs/route");
    detailRoute = await import(
      "../../src/app/api/resume-generation/jobs/[id]/route"
    );
    pdfRoute = await import(
      "../../src/app/api/resume-generation/jobs/[id]/pdf/route"
    );
    auth = await import("../../src/lib/auth");
    const signedUp = await auth.auth.api.signUpEmail({
      body: {
        name: "Fixture Candidate",
        email: `${fixture}@example.test`,
        password: "Test-only-password-1234",
      },
      asResponse: true,
    });
    expect(signedUp.status).toBe(200);
    cookie = signedUp.headers.get("set-cookie")?.split(";")[0] ?? "";
    const session = await auth.auth.api.getSession({
      headers: new Headers({ cookie }),
    });
    if (!session) throw new Error("Fixture login did not create a session");
    userId = session.user.id;
    otherUserId = crypto.randomUUID();
    await database.db.insert(user).values({
      id: otherUserId,
      name: "Other Fixture",
      email: `${otherUserId}@example.test`,
    });
    await database.db
      .insert(userProfiles)
      .values({ userId, firstName: "Fixture", lastName: "Candidate" });
    const [application] = await database.db
      .insert(jobApplications)
      .values({ userId, company: "Example Co", position: "Engineer" })
      .returning();
    if (!application) throw new Error("Fixture application missing");
    applicationId = application.id;
  });

  afterAll(async () => {
    if (userId) await database.db.delete(user).where(eq(user.id, userId));
    if (otherUserId)
      await database.db.delete(user).where(eq(user.id, otherUserId));
    await database.pool.end();
  });

  const enqueue = () =>
    jobs.enqueueGenerationJob(userId, {
      kind: "profile",
      intent: "preview",
      request: manual,
    });
  async function claimed() {
    const job = await jobs.claimGenerationJob();
    if (!job) throw new Error("Expected a queued job");
    return job;
  }
  async function clearJobs() {
    await database.db
      .delete(resumeGenerationJobs)
      .where(eq(resumeGenerationJobs.userId, userId));
  }

  test("migration is repeatable and auth timestamps and booleans retain their types", async () => {
    const [record] = await database.db
      .select()
      .from(user)
      .where(eq(user.id, userId));
    expect(record?.createdAt).toBeInstanceOf(Date);
    expect(record?.emailVerified).toBe(false);
    const signedIn = await auth.auth.api.signInEmail({
      body: {
        email: `${fixture}@example.test`,
        password: "Test-only-password-1234",
      },
      asResponse: true,
    });
    expect(signedIn.status).toBe(200);
  });

  test("existing BetterAuth 1.3 credentials and session cookies remain usable", async () => {
    const legacyUserId = crypto.randomUUID();
    const legacyToken = crypto.randomUUID();
    const now = new Date();
    // BetterAuth 1.3.6 used NFKC-normalized scrypt (N=16384, r=16, p=1,
    // dkLen=64) with a hex salt stored as text. This is synthetic test data.
    const legacyHash =
      "00112233445566778899aabbccddeeff:412ad5ae3664f13a503a14ecf04cffd2656f83fca8f90e540313cdd4eade6c816c33d57d274c088feca73baed98a9280a51b92ee86f729dcd20a7733d3c7aa9a";
    await database.db.insert(user).values({
      id: legacyUserId,
      name: "Legacy Fixture",
      email: `${legacyUserId}@example.test`,
    });
    try {
      await database.db.insert(account).values({
        id: crypto.randomUUID(),
        accountId: legacyUserId,
        providerId: "credential",
        userId: legacyUserId,
        password: legacyHash,
        createdAt: now,
        updatedAt: now,
      });
      await database.db.insert(session).values({
        id: crypto.randomUUID(),
        token: legacyToken,
        userId: legacyUserId,
        expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
        createdAt: now,
        updatedAt: now,
      });
      const signature = createHmac("sha256", auth.auth.options.secret)
        .update(legacyToken)
        .digest("base64");
      const legacyCookie = `better-auth.session_token=${encodeURIComponent(`${legacyToken}.${signature}`)}`;
      const existingSession = await auth.auth.api.getSession({
        headers: new Headers({ cookie: legacyCookie }),
      });
      expect(existingSession?.user.id).toBe(legacyUserId);

      const signedIn = await auth.auth.api.signInEmail({
        body: {
          email: `${legacyUserId}@example.test`,
          password: "Test-only-password-1234",
        },
        asResponse: true,
      });
      expect(signedIn.status).toBe(200);
    } finally {
      await database.db.delete(user).where(eq(user.id, legacyUserId));
    }
  });

  test("numeric identities, CRUD, ownership, and DELETE RETURNING work with PostgreSQL", async () => {
    const { ApplicationsService } = await import(
      "../../src/app/api/applications/service"
    );
    const { ResumesService } = await import(
      "../../src/app/api/resumes/service"
    );
    const { CoverLettersService } = await import(
      "../../src/app/api/cover-letters/service"
    );
    const { ProfileService } = await import(
      "../../src/app/api/profile/service"
    );
    const service = new ApplicationsService();
    const created = await service.createApplication(userId, {
      company: "Fixture",
      position: "Engineer",
      status: "applied",
      appliedAt: "2026-01-01T00:00:00Z",
    });
    expect(created.appliedAt).toBeInstanceOf(Date);
    expect(
      await service.getApplicationById(otherUserId, created.id),
    ).toBeNull();
    expect(
      (await service.updateApplication(userId, created.id, { status: "offer" }))
        ?.status,
    ).toBe("offer");
    expect(await service.deleteApplication(otherUserId, created.id)).toBe(
      false,
    );
    expect(await service.deleteApplication(userId, created.id)).toBe(true);
    expect(await service.deleteApplication(userId, created.id)).toBe(false);
    const resumeService = new ResumesService();
    const resume = await resumeService.createResume(userId, {
      title: "Fixture",
      content: "{}",
      isDefault: true,
      isTailored: false,
    });
    expect(resume.isDefault).toBe(true);
    const coverService = new CoverLettersService();
    const letter = await coverService.createCoverLetter(userId, {
      title: "Fixture",
      content: "Fixture letter",
      resumeId: resume.id,
      isAiGenerated: false,
    });
    expect(await resumeService.deleteResume(userId, resume.id)).toBe(true);
    expect(
      (await coverService.getCoverLetterById(userId, letter.id))?.resumeId,
    ).toBeUndefined();
    expect(await coverService.deleteCoverLetter(userId, letter.id)).toBe(true);
    const [skill] = await database.db
      .insert(skills)
      .values({ userId, name: "TypeScript", category: "technical" })
      .returning();
    if (!skill) throw new Error("Missing skill");
    expect(typeof skill.id).toBe("number");
    expect(await new ProfileService().deleteSkill(userId, skill.id)).toBe(true);
    expect(await new ProfileService().deleteSkill(userId, skill.id)).toBe(
      false,
    );
  });

  test("HTTP creation returns 202, validation errors return 400, and ownership is enforced", async () => {
    await clearJobs();
    const response = await routes.POST(
      new NextRequest("http://localhost:3000/api/resume-generation/jobs", {
        method: "POST",
        headers: { cookie, "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "profile",
          request: manual,
          intent: "preview",
        }),
      }),
    );
    expect(response.status).toBe(202);
    const raw: unknown = await response.json();
    const accepted = acceptedGenerationJobSchema.parse(raw);
    expect(await jobs.getGenerationJob(otherUserId, accepted.jobId)).toBeNull();
    expect(await jobs.getLatestGenerationJob(otherUserId, null)).toBeNull();
    const noAuth = await detailRoute.GET(
      new NextRequest("http://localhost:3000/api/resume-generation/jobs/test"),
      { params: Promise.resolve({ id: accepted.jobId }) },
    );
    expect(noAuth.status).toBe(401);
    const pendingPdf = await pdfRoute.GET(
      new NextRequest(
        "http://localhost:3000/api/resume-generation/jobs/test/pdf",
        { headers: { cookie } },
      ),
      { params: Promise.resolve({ id: accepted.jobId }) },
    );
    expect(pendingPdf.status).toBe(409);
    const invalid = await routes.POST(
      new NextRequest("http://localhost:3000/api/resume-generation/jobs", {
        method: "POST",
        headers: { cookie, "Content-Type": "application/json" },
        body: "{}",
      }),
    );
    expect(invalid.status).toBe(400);
    await jobs.completeGenerationJob(await claimed(), result());
    const pdf = await pdfRoute.GET(
      new NextRequest(
        "http://localhost:3000/api/resume-generation/jobs/test/pdf",
        { headers: { cookie } },
      ),
      { params: Promise.resolve({ id: accepted.jobId }) },
    );
    expect(pdf.status).toBe(200);
    expect((await pdf.text()).startsWith("%PDF-")).toBe(true);
  });

  test("concurrent workers never claim the same queued job", async () => {
    await clearJobs();
    await enqueue();
    await enqueue();
    const [first, second] = await Promise.all([claimed(), claimed()]);
    expect(first.id).not.toBe(second.id);
    expect(await jobs.claimGenerationJob()).toBeNull();
    await jobs.completeGenerationJob(first, result());
    await jobs.completeGenerationJob(second, result());
  });

  test("interrupted jobs recover once and obsolete workers cannot overwrite results", async () => {
    await clearJobs();
    await enqueue();
    const original = await claimed();
    await database.db
      .update(resumeGenerationJobs)
      .set({ leaseExpiresAt: new Date(0) })
      .where(eq(resumeGenerationJobs.id, original.id));
    expect(await jobs.heartbeatGenerationJob(original)).toBe(false);
    await jobs.recoverGenerationJobs();
    const replacement = await claimed();
    expect(replacement.attempts).toBe(2);
    expect(await jobs.completeGenerationJob(original, result())).toBe(false);
    await database.db
      .update(resumeGenerationJobs)
      .set({ leaseExpiresAt: new Date(0) })
      .where(eq(resumeGenerationJobs.id, replacement.id));
    await jobs.recoverGenerationJobs();
    expect((await jobs.getGenerationJob(userId, replacement.id))?.status).toBe(
      "failed",
    );
  });

  test("save intent persists tailored resumes once; previews stay drafts", async () => {
    await clearJobs();
    const request = jobApplicationResumeRequestSchema.parse({
      title: "Tailored Fixture",
      applicationId,
      useAISelection: false,
    });
    await jobs.enqueueGenerationJob(userId, {
      kind: "application",
      intent: "preview",
      request,
    });
    await jobs.completeGenerationJob(await claimed(), result());
    const countSaved = () =>
      database.db
        .select()
        .from(resumes)
        .where(
          and(
            eq(resumes.userId, userId),
            eq(resumes.jobApplicationId, applicationId),
          ),
        );
    expect(await countSaved()).toHaveLength(0);
    await jobs.enqueueGenerationJob(userId, {
      kind: "application",
      intent: "save-and-download",
      request,
    });
    const saving = await claimed();
    await jobs.completeGenerationJob(saving, result());
    expect(await jobs.completeGenerationJob(saving, result())).toBe(false);
    expect(await countSaved()).toHaveLength(1);
    expect(
      (await jobs.getLatestGenerationJob(userId, applicationId))?.savedResumeId,
    ).toBeTruthy();
  });

  test("slow generation runs separately from polling and ordinary failures remain retryable", async () => {
    await clearJobs();
    await enqueue();
    const job = await claimed();
    const { runGenerationJob } = await import(
      "../../src/app/api/resume-generation/jobs/worker"
    );
    let release: (() => void) | undefined;
    const waiting = new Promise<void>((resolve) => {
      release = resolve;
    });
    const running = runGenerationJob(job, async () => {
      await waiting;
      return result();
    });
    expect((await jobs.getGenerationJob(userId, job.id))?.status).toBe(
      "running",
    );
    release?.();
    await running;
    expect((await jobs.getGenerationJob(userId, job.id))?.status).toBe(
      "completed",
    );
    await enqueue();
    const failed = await claimed();
    await runGenerationJob(failed, () =>
      Promise.reject(new Error("Mock model failure")),
    );
    expect((await jobs.getGenerationJob(userId, failed.id))?.error).toBe(
      "Resume generation failed. Please retry.",
    );
    await enqueue();
    expect(await jobs.claimGenerationJob()).not.toBeNull();
  });

  test("retention removes old finished jobs and keeps active jobs and saved resumes", async () => {
    await clearJobs();
    await enqueue();
    const old = await claimed();
    await jobs.completeGenerationJob(old, result());
    await database.db
      .update(resumeGenerationJobs)
      .set({ finishedAt: new Date(0) })
      .where(eq(resumeGenerationJobs.id, old.id));
    const active = await enqueue();
    await jobs.cleanupGenerationJobs();
    expect(await jobs.getGenerationJob(userId, old.id)).toBeNull();
    expect((await jobs.getGenerationJob(userId, active.jobId))?.status).toBe(
      "queued",
    );
    expect(
      await database.db
        .select()
        .from(resumes)
        .where(eq(resumes.userId, userId)),
    ).toHaveLength(1);
    await database.db.execute(sql`select 1`);
    await database.db
      .insert(education)
      .values({ userId: otherUserId, degree: "Test", institution: "Example" });
    await database.db.insert(workExperiences).values({
      userId: otherUserId,
      jobTitle: "Test",
      company: "Example",
      startDate: "2024-01",
    });
    await database.db.delete(user).where(eq(user.id, otherUserId));
    expect(
      await database.db
        .select()
        .from(education)
        .where(eq(education.userId, otherUserId)),
    ).toHaveLength(0);
    expect(
      await database.db
        .select()
        .from(workExperiences)
        .where(eq(workExperiences.userId, otherUserId)),
    ).toHaveLength(0);
  });
});
