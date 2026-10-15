import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
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
  resumeUploads,
  skills,
  session,
  user,
  userProfiles,
  workExperiences,
} from "../../src/lib/db/schema";
import { logger } from "../../src/lib/logger";
import {
  serializeGeneratedResume,
  type GeneratedResumeResult,
} from "../../src/lib/resume-document";
import { syntheticResume } from "../../src/lib/resume-fixture.test-helper";
import {
  generateResumeSchema,
  jobApplicationResumeRequestSchema,
  workExperienceJsonResponseSchema,
} from "../../src/app/api/profile/validators";
import { acceptedGenerationJobSchema } from "../../src/app/api/resume-generation/jobs/validators";

// Object storage is replaced by a map, so the code that decides what to keep,
// replace and remove runs for real while no storage server is needed. Each
// operation can be made to fail to stand in for an outage.
const objectStore = vi.hoisted(() => {
  process.env.OBJECT_STORAGE_URL = "http://storage.example.test:8333";
  process.env.OBJECT_STORAGE_ACCESS_KEY = "test-only-access-key";
  process.env.OBJECT_STORAGE_SECRET_KEY =
    "test-only-secret-with-thirty-two-characters";
  return {
    objects: new Map<string, Uint8Array<ArrayBuffer>>(),
    failing: new Set<"put" | "get" | "delete">(),
  };
});
vi.mock("../../src/lib/object-storage", () => {
  class ObjectStorageError extends Error {}
  const run = <T>(operation: "put" | "get" | "delete", action: () => T) =>
    objectStore.failing.has(operation)
      ? Promise.reject(new ObjectStorageError(`Synthetic ${operation} failure`))
      : Promise.resolve(action());
  return {
    ObjectStorageError,
    createObjectStorage: () => ({
      put: (key: string, bytes: Uint8Array<ArrayBuffer>) =>
        run("put", () => {
          objectStore.objects.set(key, bytes);
        }),
      get: (key: string) =>
        run("get", () => objectStore.objects.get(key) ?? null),
      delete: (key: string) =>
        run("delete", () => {
          objectStore.objects.delete(key);
        }),
    }),
  };
});
// A stored PDF must be served as it is; a test that expects a compilation
// supplies the result.
const compiler = vi.hoisted(() => ({ compile: vi.fn() }));
vi.mock("../../src/lib/latex-compiler", () => ({
  compileResumeLatex: compiler.compile,
}));

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
    detailRoute =
      await import("../../src/app/api/resume-generation/jobs/[id]/route");
    pdfRoute =
      await import("../../src/app/api/resume-generation/jobs/[id]/pdf/route");
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
  const pdfResult = (text: string): GeneratedResumeResult => ({
    ...result(),
    pdfBase64: Buffer.from(`%PDF-1.4\n${text}`).toString("base64"),
  });
  const storedText = (key: string | null) =>
    key && objectStore.objects.has(key)
      ? Buffer.from(objectStore.objects.get(key) ?? []).toString()
      : null;
  const tailoredRequest = () =>
    jobApplicationResumeRequestSchema.parse({
      title: "Tailored Fixture",
      applicationId,
      useAISelection: false,
    });
  async function tailoredResume() {
    const [row] = await database.db
      .select()
      .from(resumes)
      .where(
        and(
          eq(resumes.userId, userId),
          eq(resumes.jobApplicationId, applicationId),
          eq(resumes.isTailored, true),
        ),
      );
    if (!row) throw new Error("Expected the saved tailored resume");
    return row;
  }
  async function completeApplicationJob(
    intent: "preview" | "save-and-download",
    generated: GeneratedResumeResult,
  ) {
    await jobs.enqueueGenerationJob(userId, {
      kind: "application",
      intent,
      request: tailoredRequest(),
    });
    const job = await claimed();
    await jobs.completeGenerationJob(job, generated);
    return job;
  }
  // The storage helpers log the outage they survive.
  const silenceErrors = () =>
    vi.spyOn(logger, "error").mockImplementation(() => undefined);

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
    const { ApplicationsService } =
      await import("../../src/app/api/applications/service");
    const { ResumesService } =
      await import("../../src/app/api/resumes/service");
    const { CoverLettersService } =
      await import("../../src/app/api/cover-letters/service");
    const { ProfileService } =
      await import("../../src/app/api/profile/service");
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
    const { runGenerationJob } =
      await import("../../src/app/api/resume-generation/jobs/worker");
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
    expect((await jobs.getLatestGenerationJob(userId, null))?.id).toBe(
      failed.id,
    );
    expect(
      await jobs.getLatestGenerationJob(
        userId,
        null,
        new Date(Date.now() + 16 * 60 * 1000),
      ),
    ).toBeNull();
    await enqueue();
    expect(await jobs.claimGenerationJob()).not.toBeNull();
  });

  test("profile requests the client got wrong return 400 and entries list newest first", async () => {
    const collection =
      await import("../../src/app/api/profile/work-experiences/route");
    const item =
      await import("../../src/app/api/profile/work-experiences/[id]/route");
    const url = "http://localhost:3000/api/profile/work-experiences";
    const post = (body: string) =>
      collection.POST(
        new NextRequest(url, {
          method: "POST",
          headers: { cookie, "Content-Type": "application/json" },
          body,
        }),
      );
    const experience = (company: string, startDate: string) =>
      JSON.stringify({
        jobTitle: "Engineer",
        company,
        location: null,
        startDate,
        endDate: "2024-01",
        description: null,
        technologies: null,
      });

    expect((await post(JSON.stringify({ jobTitle: "Engineer" }))).status).toBe(
      400,
    );
    expect((await post("{not json")).status).toBe(400);
    expect((await post(experience("Example", "2024-13"))).status).toBe(400);
    expect(
      (
        await collection.GET(
          new NextRequest(`${url}?limit=abc`, { headers: { cookie } }),
        )
      ).status,
    ).toBe(400);

    try {
      // Created oldest, newest, middle; every entry has the default display order.
      for (const [company, start] of [
        ["Oldest", "2019-01"],
        ["Newest", "2023-06"],
        ["Middle", "2021-03"],
      ] as const) {
        expect((await post(experience(company, start))).status).toBe(201);
      }
      const list = async () => {
        const response = await collection.GET(
          new NextRequest(url, { headers: { cookie } }),
        );
        const raw: unknown = await response.json();
        return workExperienceJsonResponseSchema.array().parse(raw);
      };
      expect((await list()).map((row) => row.company)).toEqual([
        "Newest",
        "Middle",
        "Oldest",
      ]);

      // An edit rewrites the row; the order must not follow storage order.
      const oldest = (await list()).find((row) => row.company === "Oldest");
      if (!oldest) throw new Error("Missing fixture experience");
      const cleared = await item.PUT(
        new NextRequest(`${url}/${oldest.id}`, {
          method: "PUT",
          headers: { cookie, "Content-Type": "application/json" },
          // A cleared date input submits an empty string.
          body: JSON.stringify({ endDate: "", isCurrent: true }),
        }),
        { params: Promise.resolve({ id: String(oldest.id) }) },
      );
      expect(cleared.status).toBe(200);
      const rows = await list();
      expect(rows.map((row) => row.company)).toEqual([
        "Newest",
        "Middle",
        "Oldest",
      ]);
      expect(rows[2]?.endDate).toBeNull();

      const malformedId = await item.GET(
        new NextRequest(`${url}/12abc`, { headers: { cookie } }),
        { params: Promise.resolve({ id: "12abc" }) },
      );
      expect(malformedId.status).toBe(400);
    } finally {
      await database.db
        .delete(workExperiences)
        .where(eq(workExperiences.userId, userId));
    }
  });

  test("the default resume changes atomically and an unknown ID leaves it alone", async () => {
    const { ResumesService } =
      await import("../../src/app/api/resumes/service");
    const service = new ResumesService();
    const draft = { content: "{}", isTailored: false };
    const first = await service.createResume(userId, {
      ...draft,
      title: "First",
      isDefault: true,
    });
    const second = await service.createResume(userId, {
      ...draft,
      title: "Second",
      isDefault: false,
    });
    const defaults = async () =>
      (
        await database.db
          .select({ id: resumes.id })
          .from(resumes)
          .where(and(eq(resumes.userId, userId), eq(resumes.isDefault, true)))
      ).map((row) => row.id);

    try {
      expect(
        await service.updateResume(userId, crypto.randomUUID(), {
          isDefault: true,
        }),
      ).toBeNull();
      expect(
        await service.updateResume(otherUserId, second.id, { isDefault: true }),
      ).toBeNull();
      expect(await defaults()).toEqual([first.id]);

      await service.updateResume(userId, second.id, { isDefault: true });
      expect(await defaults()).toEqual([second.id]);

      await Promise.all([
        service.updateResume(userId, first.id, { isDefault: true }),
        service.updateResume(userId, second.id, { isDefault: true }),
      ]);
      expect(await defaults()).toHaveLength(1);

      const third = await service.createResume(userId, {
        ...draft,
        title: "Third",
        isDefault: true,
      });
      expect(await defaults()).toEqual([third.id]);
      await service.deleteResume(userId, third.id);
    } finally {
      await service.deleteResume(userId, first.id);
      await service.deleteResume(userId, second.id);
    }
  });

  test("a stored job that no longer matches the schema reads as absent", async () => {
    await clearJobs();
    const [legacy] = await database.db
      .insert(resumeGenerationJobs)
      .values({
        userId,
        payload: { kind: "retired-kind" },
        status: "completed",
      })
      .returning();
    if (!legacy) throw new Error("Missing legacy job fixture");
    const log = vi.spyOn(logger, "error").mockImplementation(() => undefined);
    try {
      expect(await jobs.getGenerationJob(userId, legacy.id)).toBeNull();
      expect(await jobs.getLatestGenerationJob(userId, null)).toBeNull();
      const response = await detailRoute.GET(
        new NextRequest(
          "http://localhost:3000/api/resume-generation/jobs/test",
          { headers: { cookie } },
        ),
        { params: Promise.resolve({ id: legacy.id }) },
      );
      // Previously a 400 that blamed the request for the server's old data.
      expect(response.status).toBe(404);
      expect(log).toHaveBeenCalled();
    } finally {
      log.mockRestore();
      await clearJobs();
    }
  });

  test("an account cannot queue more jobs than the worker should hold for it", async () => {
    await clearJobs();
    try {
      for (let index = 0; index < jobs.MAX_ACTIVE_JOBS_PER_USER; index++) {
        await enqueue();
      }
      await expect(enqueue()).rejects.toMatchObject({ status: 429 });
      const refused = await routes.POST(
        new NextRequest("http://localhost:3000/api/resume-generation/jobs", {
          method: "POST",
          headers: { cookie, "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "profile", request: manual }),
        }),
      );
      expect(refused.status).toBe(429);

      await jobs.completeGenerationJob(await claimed(), result());
      await expect(enqueue()).resolves.toMatchObject({ status: "queued" });
    } finally {
      await clearJobs();
    }
  });

  test("links to another account's records are refused and removed with their target", async () => {
    const { ApplicationsService } =
      await import("../../src/app/api/applications/service");
    const { ResumesService } =
      await import("../../src/app/api/resumes/service");
    const { CoverLettersService } =
      await import("../../src/app/api/cover-letters/service");
    const applications = new ApplicationsService();
    const resumeService = new ResumesService();
    const letters = new CoverLettersService();
    const draft = { content: "{}", isDefault: false, isTailored: true };

    const foreignApplication = await applications.createApplication(
      otherUserId,
      {
        company: "Other Co",
        position: "Engineer",
        status: "applied",
      },
    );
    const foreignResume = await resumeService.createResume(otherUserId, {
      ...draft,
      title: "Other resume",
    });
    const ownApplication = await applications.createApplication(userId, {
      company: "Own Co",
      position: "Engineer",
      status: "applied",
    });
    const ownResume = await resumeService.createResume(userId, {
      ...draft,
      title: "Tailored",
      jobApplicationId: ownApplication.id,
    });

    try {
      const refused = { status: 400 };
      await expect(
        resumeService.createResume(userId, {
          ...draft,
          title: "Linked elsewhere",
          jobApplicationId: foreignApplication.id,
        }),
      ).rejects.toMatchObject(refused);
      await expect(
        resumeService.updateResume(userId, ownResume.id, {
          jobApplicationId: foreignApplication.id,
        }),
      ).rejects.toMatchObject(refused);
      const letter = { title: "Letter", content: "Text", isAiGenerated: false };
      await expect(
        letters.createCoverLetter(userId, {
          ...letter,
          jobApplicationId: foreignApplication.id,
        }),
      ).rejects.toMatchObject(refused);
      await expect(
        letters.createCoverLetter(userId, {
          ...letter,
          resumeId: foreignResume.id,
        }),
      ).rejects.toMatchObject(refused);
      await expect(
        letters.createCoverLetter(userId, {
          ...letter,
          jobApplicationId: crypto.randomUUID(),
        }),
      ).rejects.toMatchObject(refused);

      const linked = await letters.createCoverLetter(userId, {
        ...letter,
        jobApplicationId: ownApplication.id,
        resumeId: ownResume.id,
      });
      await expect(
        letters.updateCoverLetter(userId, linked.id, {
          resumeId: foreignResume.id,
        }),
      ).rejects.toMatchObject(refused);

      expect(
        await applications.deleteApplication(userId, ownApplication.id),
      ).toBe(true);
      expect(await letters.getCoverLetterById(userId, linked.id)).toBeNull();
      const kept = await resumeService.getResumeById(userId, ownResume.id);
      expect(kept?.jobApplicationId).toBeNull();
    } finally {
      await resumeService.deleteResume(userId, ownResume.id);
      await applications.deleteApplication(userId, ownApplication.id);
      await resumeService.deleteResume(otherUserId, foreignResume.id);
      await applications.deleteApplication(otherUserId, foreignApplication.id);
    }
  });

  test("dashboard figures are counted per account and status", async () => {
    const { ApplicationsService } =
      await import("../../src/app/api/applications/service");
    const { DashboardService } =
      await import("../../src/app/api/dashboard/service");
    const applications = new ApplicationsService();
    const dashboard = new DashboardService();
    const before = await dashboard.getDashboardStats(userId);
    const created = await Promise.all(
      (["applied", "applied", "offer"] as const).map((status) =>
        applications.createApplication(userId, {
          company: `Counted ${status}`,
          position: "Engineer",
          status,
        }),
      ),
    );
    const foreign = await applications.createApplication(otherUserId, {
      company: "Not counted",
      position: "Engineer",
      status: "offer",
    });

    try {
      const stats = await dashboard.getDashboardStats(userId);
      expect(stats.totalApplications).toBe(before.totalApplications + 3);
      expect(stats.applicationsByStatus.applied).toBe(
        before.applicationsByStatus.applied + 2,
      );
      expect(stats.applicationsByStatus.offer).toBe(
        before.applicationsByStatus.offer + 1,
      );
      expect(stats.applicationsByStatus.rejected).toBe(
        before.applicationsByStatus.rejected,
      );
      expect(stats.totalResumes).toBe(before.totalResumes);

      const activity = await dashboard.getDashboardActivity(userId, {
        type: "application",
        limit: 2,
      });
      expect(activity).toHaveLength(2);
      expect(activity.every((item) => item.type === "application")).toBe(true);
      expect(activity.some((item) => item.title.includes("Not counted"))).toBe(
        false,
      );
    } finally {
      for (const application of created) {
        await applications.deleteApplication(userId, application.id);
      }
      await applications.deleteApplication(otherUserId, foreign.id);
    }
  });

  test("saving a tailored resume keeps the job's PDF and replaces the previous file", async () => {
    await clearJobs();
    await completeApplicationJob("save-and-download", pdfResult("first"));
    const first = await tailoredResume();
    expect(first.pdfKey).toMatch(
      new RegExp(`^users/${userId}/resumes/[0-9a-f-]{36}\\.pdf$`),
    );
    expect(storedText(first.pdfKey)).toBe("%PDF-1.4\nfirst");

    const saving = await completeApplicationJob(
      "save-and-download",
      pdfResult("second"),
    );
    const second = await tailoredResume();
    expect(second.id).toBe(first.id);
    expect(second.pdfKey).not.toBe(first.pdfKey);
    expect(storedText(second.pdfKey)).toBe("%PDF-1.4\nsecond");
    expect(storedText(first.pdfKey)).toBeNull();

    // A worker that lost its claim stores a PDF and must take it back.
    const before = objectStore.objects.size;
    expect(await jobs.completeGenerationJob(saving, pdfResult("stale"))).toBe(
      false,
    );
    expect(objectStore.objects.size).toBe(before);
    expect((await tailoredResume()).pdfKey).toBe(second.pdfKey);

    // The resume is saved even when its PDF cannot be kept.
    silenceErrors();
    objectStore.failing.add("put");
    try {
      await completeApplicationJob("save-and-download", pdfResult("third"));
    } finally {
      objectStore.failing.clear();
    }
    const third = await tailoredResume();
    expect(third.pdfKey).toBeNull();
    expect(third.updatedAt.getTime()).toBeGreaterThan(
      second.updatedAt.getTime(),
    );
    expect(storedText(second.pdfKey)).toBeNull();
  });

  test("a saved PDF is served from storage, and compiled and kept when it is missing", async () => {
    await clearJobs();
    const savedPdfRoute =
      await import("../../src/app/api/resumes/[id]/pdf/route");
    await completeApplicationJob(
      "save-and-download",
      pdfResult("as generated"),
    );
    const saved = await tailoredResume();
    const fetchPdf = (headers: Record<string, string> = { cookie }) =>
      savedPdfRoute.GET(
        new NextRequest(`http://localhost:3000/api/resumes/${saved.id}/pdf`, {
          headers,
        }),
        { params: Promise.resolve({ id: saved.id }) },
      );
    const compiled = (text: string) => ({
      pdfBase64: Buffer.from(`%PDF-1.4\n${text}`).toString("base64"),
      pageCount: 1,
      overflowPt: 0,
      warnings: [],
    });

    const served = await fetchPdf();
    expect(served.status).toBe(200);
    expect(served.headers.get("content-type")).toBe("application/pdf");
    expect(await served.text()).toBe("%PDF-1.4\nas generated");
    expect(compiler.compile).not.toHaveBeenCalled();
    expect((await fetchPdf({})).status).toBe(401);

    // An unreachable store may still hold the original: the page is compiled
    // for this request and the record keeps pointing at the stored file.
    silenceErrors();
    compiler.compile.mockResolvedValue(compiled("compiled during outage"));
    objectStore.failing.add("get");
    try {
      expect(await (await fetchPdf()).text()).toBe(
        "%PDF-1.4\ncompiled during outage",
      );
    } finally {
      objectStore.failing.clear();
    }
    expect((await tailoredResume()).pdfKey).toBe(saved.pdfKey);
    expect(storedText(saved.pdfKey)).toBe("%PDF-1.4\nas generated");

    // A file that is gone, as after restoring the database alone, is replaced
    // by the compiled page without touching the resume's place in the library.
    if (!saved.pdfKey) throw new Error("Expected a stored PDF");
    objectStore.objects.delete(saved.pdfKey);
    compiler.compile.mockResolvedValue(compiled("compiled again"));
    expect(await (await fetchPdf()).text()).toBe("%PDF-1.4\ncompiled again");
    const healed = await tailoredResume();
    expect(healed.pdfKey).not.toBe(saved.pdfKey);
    expect(storedText(healed.pdfKey)).toBe("%PDF-1.4\ncompiled again");
    expect(healed.updatedAt).toEqual(saved.updatedAt);

    compiler.compile.mockClear();
    expect(await (await fetchPdf()).text()).toBe("%PDF-1.4\ncompiled again");
    expect(compiler.compile).not.toHaveBeenCalled();
  });

  test("saving a preview names its job and keeps that job's document and PDF", async () => {
    await clearJobs();
    const route =
      await import("../../src/app/api/applications/[id]/resume/route");
    const save = (body: unknown, id = applicationId) =>
      route.PUT(
        new NextRequest(`http://localhost:3000/api/applications/${id}/resume`, {
          method: "PUT",
          headers: { cookie, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
        { params: Promise.resolve({ id }) },
      );
    const previewed = pdfResult("previewed");
    const preview = await completeApplicationJob("preview", previewed);
    const before = await tailoredResume();

    const response = await save({
      title: "Saved From Preview",
      jobId: preview.id,
      // A document sent by the client is not what gets saved.
      content: JSON.stringify({ html: "<p>Client copy</p>" }),
    });
    expect(response.status).toBe(200);
    const after = await tailoredResume();
    expect(after.id).toBe(before.id);
    expect(after.title).toBe("Saved From Preview");
    // The job result was read back from a JSON column, which reorders keys.
    const savedDocument: unknown = JSON.parse(after.content);
    const previewedDocument: unknown = JSON.parse(
      serializeGeneratedResume(previewed),
    );
    expect(savedDocument).toEqual(previewedDocument);
    expect(storedText(after.pdfKey)).toBe("%PDF-1.4\npreviewed");
    expect(storedText(before.pdfKey)).toBeNull();

    // A job belongs to one application and to one account.
    const [elsewhere] = await database.db
      .insert(jobApplications)
      .values({ userId, company: "Other Co", position: "Engineer" })
      .returning();
    if (!elsewhere) throw new Error("Fixture application missing");
    try {
      const refused = await save(
        { title: "Wrong Application", jobId: preview.id },
        elsewhere.id,
      );
      expect(refused.status).toBe(404);
      expect(await refused.json()).toEqual({
        error: "That preview is no longer available. Preview again, then save.",
      });
    } finally {
      await database.db
        .delete(jobApplications)
        .where(eq(jobApplications.id, elsewhere.id));
    }
    await enqueue();
    const profileJob = await claimed();
    await jobs.completeGenerationJob(profileJob, result());
    expect(
      (await save({ title: "Profile Job", jobId: profileJob.id })).status,
    ).toBe(404);
    expect(
      (await save({ title: "Unknown", jobId: crypto.randomUUID() })).status,
    ).toBe(404);
    expect((await save({ title: "No Job" })).status).toBe(400);
    expect((await tailoredResume()).pdfKey).toBe(after.pdfKey);
  });

  test("new content clears a stored PDF, other edits keep it, and deleting removes the file", async () => {
    const { ResumesService } =
      await import("../../src/app/api/resumes/service");
    const stored = await import("../../src/app/api/stored-files");
    const service = new ResumesService();
    const keep = async (text: string) => {
      const key = await stored.storeResumePdf(
        userId,
        new Uint8Array(Buffer.from(text)),
      );
      if (!key) throw new Error("Expected the PDF to be stored");
      return key;
    };
    const pdfKeyOf = async (id: string) =>
      (
        await database.db
          .select({ pdfKey: resumes.pdfKey })
          .from(resumes)
          .where(eq(resumes.id, id))
      )[0]?.pdfKey;

    const key = await keep("kept");
    const resume = await service.createResume(
      userId,
      { title: "Stored", content: "{}", isDefault: false, isTailored: false },
      key,
    );
    // The key is the server's business; no response carries it.
    expect(resume).not.toHaveProperty("pdfKey");
    expect(await service.getResumeById(userId, resume.id)).not.toHaveProperty(
      "pdfKey",
    );

    await service.updateResume(userId, resume.id, { title: "Renamed" });
    expect(await pdfKeyOf(resume.id)).toBe(key);
    expect(storedText(key)).toBe("kept");

    await service.updateResume(userId, resume.id, {
      content: '{"edited":true}',
    });
    expect(await pdfKeyOf(resume.id)).toBeNull();
    expect(storedText(key)).toBeNull();

    // A PDF stored for a save that then matches no resume is taken back.
    const orphan = await keep("orphan");
    expect(
      await service.updateResume(
        otherUserId,
        resume.id,
        { content: "{}" },
        orphan,
      ),
    ).toBeNull();
    expect(storedText(orphan)).toBeNull();

    const replacement = await keep("replacement");
    await service.updateResume(
      userId,
      resume.id,
      { content: "{}" },
      replacement,
    );
    expect(await pdfKeyOf(resume.id)).toBe(replacement);

    // While the file cannot be removed the resume stays, so the delete can be
    // repeated instead of leaving a file nobody can find.
    silenceErrors();
    objectStore.failing.add("delete");
    try {
      await expect(service.deleteResume(userId, resume.id)).rejects.toThrow(
        "The stored file couldn't be deleted. Try again in a moment.",
      );
    } finally {
      objectStore.failing.clear();
    }
    expect(await pdfKeyOf(resume.id)).toBe(replacement);
    expect(await service.deleteResume(otherUserId, resume.id)).toBe(false);
    expect(await service.deleteResume(userId, resume.id)).toBe(true);
    expect(storedText(replacement)).toBeNull();
    expect(await service.getResumeById(userId, resume.id)).toBeNull();
  });

  test("imported files are kept per account, capped, downloadable and deletable", async () => {
    const uploads =
      await import("../../src/app/api/profile/resume-uploads/service");
    const listRoute =
      await import("../../src/app/api/profile/resume-uploads/route");
    const fileRoute =
      await import("../../src/app/api/profile/resume-uploads/[id]/route");
    const { resumeUploadsResponseSchema } =
      await import("../../src/app/api/profile/resume-uploads/validators");
    const url = "http://localhost:3000/api/profile/resume-uploads";
    const list = async () => {
      const response = await listRoute.GET(
        new NextRequest(url, { headers: { cookie } }),
      );
      expect(response.status).toBe(200);
      const raw: unknown = await response.json();
      return resumeUploadsResponseSchema.parse(raw);
    };
    const file = (id: string, method: "GET" | "DELETE") =>
      fileRoute[method](
        new NextRequest(`${url}/${id}`, { method, headers: { cookie } }),
        { params: Promise.resolve({ id }) },
      );
    const keep = (fileName: string, text: string) =>
      uploads.keepUpload(userId, {
        fileName,
        mimeType: "text/plain",
        bytes: new Uint8Array(Buffer.from(text)),
      });
    const uploadObjects = () =>
      [...objectStore.objects.keys()].filter((key) =>
        key.startsWith(`users/${userId}/uploads/`),
      );

    try {
      expect(await list()).toEqual({ available: true, files: [] });
      expect((await listRoute.GET(new NextRequest(url))).status).toBe(401);

      expect(await keep("C:\\Users\\alex\\Résumé (final).txt", "first")).toBe(
        true,
      );
      const [first] = (await list()).files;
      if (!first) throw new Error("Expected the imported file to be listed");
      expect(first).toMatchObject({
        fileName: "Résumé (final).txt",
        mimeType: "text/plain",
        sizeBytes: 5,
      });
      expect(uploadObjects()).toEqual([`users/${userId}/uploads/${first.id}`]);

      const download = await file(first.id, "GET");
      expect(download.status).toBe(200);
      expect(await download.text()).toBe("first");
      expect(download.headers.get("content-type")).toBe("text/plain");
      expect(download.headers.get("x-content-type-options")).toBe("nosniff");
      expect(download.headers.get("content-disposition")).toBe(
        "attachment; filename=\"R_sum_ (final).txt\"; filename*=UTF-8''R%C3%A9sum%C3%A9%20%28final%29.txt",
      );

      expect(await uploads.getUpload(otherUserId, first.id)).toBeNull();
      expect(await uploads.deleteUpload(otherUserId, first.id)).toBe(false);
      expect(uploadObjects()).toHaveLength(1);

      await database.db
        .update(resumeUploads)
        .set({ createdAt: new Date(0) })
        .where(eq(resumeUploads.id, first.id));
      for (let index = 0; index < uploads.MAX_KEPT_UPLOADS; index += 1) {
        expect(await keep(`later-${index}.txt`, `later ${index}`)).toBe(true);
      }
      const kept = (await list()).files;
      expect(kept).toHaveLength(uploads.MAX_KEPT_UPLOADS);
      expect(kept.map((upload) => upload.id)).not.toContain(first.id);
      expect(uploadObjects()).toHaveLength(uploads.MAX_KEPT_UPLOADS);
      expect((await file(first.id, "GET")).status).toBe(404);

      const [target] = kept;
      if (!target) throw new Error("Expected a kept file");
      const targetKey = `users/${userId}/uploads/${target.id}`;
      silenceErrors();

      objectStore.failing.add("put");
      expect(await keep("unstored.txt", "unstored")).toBe(false);
      objectStore.failing.clear();
      expect((await list()).files).toHaveLength(uploads.MAX_KEPT_UPLOADS);

      objectStore.failing.add("get");
      expect((await file(target.id, "GET")).status).toBe(503);
      objectStore.failing.clear();

      objectStore.failing.add("delete");
      const refused = await file(target.id, "DELETE");
      expect(refused.status).toBe(503);
      expect(await refused.json()).toEqual({
        error: "The stored file couldn't be deleted. Try again in a moment.",
      });
      objectStore.failing.clear();
      expect(objectStore.objects.has(targetKey)).toBe(true);
      expect((await list()).files.map((upload) => upload.id)).toContain(
        target.id,
      );

      expect((await file(target.id, "DELETE")).status).toBe(200);
      expect(objectStore.objects.has(targetKey)).toBe(false);
      expect((await file(target.id, "DELETE")).status).toBe(404);
      expect((await list()).files).toHaveLength(uploads.MAX_KEPT_UPLOADS - 1);

      const [lost] = (await list()).files;
      if (!lost) throw new Error("Expected a kept file");
      objectStore.objects.delete(`users/${userId}/uploads/${lost.id}`);
      const missing = await file(lost.id, "GET");
      expect(missing.status).toBe(404);
      expect(await missing.json()).toEqual({
        error:
          "This file is no longer in storage. Delete it from the list and import it again.",
      });
    } finally {
      objectStore.failing.clear();
      for (const upload of await uploads.listUploads(userId)) {
        await uploads.deleteUpload(userId, upload.id);
      }
    }
    expect(uploadObjects()).toEqual([]);
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
