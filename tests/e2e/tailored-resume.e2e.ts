import type { APIRequestContext, Page } from "@playwright/test";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  education,
  jobApplications,
  resumeGenerationJobs,
  resumes,
  skills,
  workExperiences,
} from "../../src/lib/db/schema";
import {
  acceptedGenerationJobSchema,
  latestGenerationJobSchema,
} from "../../src/app/api/resume-generation/jobs/validators";
import { saveTailoredResumeResponseSchema } from "../../src/app/api/applications/[id]/resume/validators";
import { resumeDocumentSchema } from "../../src/lib/resume-document";
import { test, expect, type Database } from "./support/fixtures";
import {
  completion,
  userPrompt,
  type ChatRequest,
  type FakeAI,
} from "./support/fake-ai";
import {
  call,
  expectedFail,
  recordRequests,
  responseTo,
} from "./support/helpers";

test.setTimeout(120_000);

const JOBS = "/api/resume-generation/jobs";
const ALREADY_SAVED =
  "A resume is already saved for this application. Saving again replaces it.";
const AI_UNAVAILABLE =
  "AI content selection was unavailable. Recent profile entries were used.";
const PREVIEW_GONE =
  "That preview is no longer available. Preview again, then save.";
const STALE =
  "Settings changed since this preview. Preview again before saving.";

function tailorPage(applicationId: string) {
  return `/dashboard/applications/${applicationId}/resume`;
}

function previewButton(page: Page) {
  return page.getByRole("button", { name: "Preview", exact: true });
}

function saveButton(page: Page) {
  return page.getByRole("button", { name: "Save resume", exact: true });
}

function saveAndDownload(page: Page) {
  return page.getByRole("button", {
    name: "Save and download PDF",
    exact: true,
  });
}

function matching(page: Page) {
  return page.getByLabel("Match content to the job description", {
    exact: true,
  });
}

function toast(page: Page, text: string) {
  return page
    .getByRole("region", { name: /^Notifications/ })
    .getByText(text, { exact: true });
}

async function latestJob(request: APIRequestContext, applicationId: string) {
  const response = await request.get(`${JOBS}?applicationId=${applicationId}`);
  expect(response.status()).toBe(200);
  const raw: unknown = await response.json();
  return latestGenerationJobSchema.parse(raw);
}

/** The draft fit without fitting, so an unscripted fitting call cannot hide. */
async function expectFitsUnrevised(
  request: APIRequestContext,
  applicationId: string,
) {
  expect((await latestJob(request, applicationId))?.result?.fit).toMatchObject({
    revisions: 0,
    fitsTarget: true,
    warnings: [],
  });
}

/** Previews on the tailor page, without matching, and waits for the draft. */
async function previewed(page: Page, applicationId: string) {
  await page.goto(tailorPage(applicationId));
  await matching(page).uncheck();
  await previewButton(page).click();
  await expect(toast(page, "Preview ready")).toBeVisible({ timeout: 60_000 });
}

async function seededIds(database: Database, userId: string) {
  const [work] = await database
    .select({ id: workExperiences.id })
    .from(workExperiences)
    .where(eq(workExperiences.userId, userId));
  const [school] = await database
    .select({ id: education.id })
    .from(education)
    .where(eq(education.userId, userId));
  const [skill] = await database
    .select({ id: skills.id })
    .from(skills)
    .where(eq(skills.userId, userId));
  if (!work || !school || !skill)
    throw new Error("The fixture seeds one row of each kind.");
  return { work: work.id, school: school.id, skill: skill.id };
}

const isAnalysis = (request: ChatRequest) =>
  userPrompt(request)?.startsWith("Analyze this job description") ?? false;

/** Scripts the two calls AI content selection makes: analysis, then the pick. */
function scriptSelection(
  ai: FakeAI,
  ids: { work: number; school: number; skill: number },
) {
  ai.reply(
    completion(
      JSON.stringify({
        requirements: ["Reliable web applications"],
        skills: ["TypeScript"],
        keywords: ["TypeScript"],
        seniority: "mid",
        industry: "Software",
        summary: "Builds web applications in TypeScript.",
      }),
    ),
    isAnalysis,
  );
  ai.reply(
    completion(
      JSON.stringify({
        selectedWorkExperiences: [ids.work],
        selectedEducation: [ids.school],
        selectedSkills: [ids.skill],
        selectedProjects: [],
        selectedCertifications: [],
        selectedAchievements: [],
        // The service keeps only ids it finds in the scores.
        relevanceScores: (
          [
            [ids.work, "work"],
            [ids.school, "education"],
            [ids.skill, "skill"],
          ] as const
        ).map(([id, type]) => ({
          id,
          type,
          score: 90,
          reasoning: "Matches TypeScript.",
          matchedKeywords: ["TypeScript"],
        })),
        overallStrategy: "Lead with TypeScript delivery.",
        keyMatchingPoints: ["TypeScript"],
      }),
    ),
    (request) => !isAnalysis(request),
  );
}

const revisionPromptSchema = z.object({
  source: resumeDocumentSchema,
});

/** A model reply that keeps every entry and only its first bullet. */
function trimToFirstBullet(request: ChatRequest) {
  const { source } = revisionPromptSchema.parse(
    JSON.parse(userPrompt(request) ?? "{}"),
  );
  return completion(
    JSON.stringify({
      summary: source.summary,
      entries: source.sections
        .flatMap((section) => section.entries)
        .map((entry) => ({
          sourceId: entry.sourceId,
          bullets: entry.bullets.slice(0, 1),
        })),
      changes: ["Kept the first bullet of each role."],
    }),
  );
}

const isRevision = (request: ChatRequest) =>
  request.messages.some(
    (message) =>
      message.role === "system" &&
      message.content.startsWith("You edit factual resumes"),
  );

async function addLongRoles(database: Database, userId: string) {
  const bullets = Array.from(
    { length: 10 },
    (_, line) =>
      `Delivered a measurable improvement to platform reliability and team throughput across services, item ${String(line + 1)}.`,
  ).join("\n");
  await database.insert(workExperiences).values(
    Array.from({ length: 5 }, (_, index) => ({
      userId,
      jobTitle: `Engineer ${String(index + 1)}`,
      company: `Company ${String(index + 1)}`,
      startDate: `20${String(10 + index)}-01`,
      endDate: `20${String(11 + index)}-01`,
      description: bullets,
    })),
  );
}

test.describe(
  "Tailor a resume: matching and Preview",
  { tag: "@application-tailor-preview" },
  () => {
    test("AI matching picks the entries, and the page says what was matched", async ({
      page,
      request,
      database,
      candidate,
      worker,
      ai,
    }) => {
      const ids = await seededIds(database, candidate.id);
      scriptSelection(ai, ids);
      await worker.start();
      await page.goto(tailorPage(candidate.applicationId));
      await expect(matching(page)).toBeChecked();
      await page.getByLabel(/^Skills/).fill("5");
      await previewButton(page).click();
      await expect(toast(page, "Preview ready")).toBeVisible({
        timeout: 60_000,
      });
      const card = page.getByRole("region", { name: "What was matched" });
      await expect(card).toContainText("Lead with TypeScript delivery.");
      await expect(card.getByText("TypeScript", { exact: true })).toBeVisible();
      await expect(card).toContainText(
        "Selected 1 work experience, 1 skill, 0 projects and 1 education entry.",
      );
      await expect(page.getByText(AI_UNAVAILABLE)).toHaveCount(0);

      const job = await latestJob(request, candidate.applicationId);
      expect(job?.payload).toMatchObject({
        kind: "application",
        request: { useAISelection: true, maxSkills: 5 },
      });
      expect(job?.result?.aiSelection).toMatchObject({
        selectedWorkExperiences: [ids.work],
        overallStrategy: "Lead with TypeScript delivery.",
      });
      const analysis = ai.requests().find(isAnalysis);
      expect(analysis ? userPrompt(analysis) : undefined).toContain(
        "Build reliable web applications using TypeScript.",
      );

      // A finished preview is restored with its matching on return.
      await page.reload();
      await expect(card).toContainText("Lead with TypeScript delivery.");
    });

    test("when matching fails, recent entries are used within the limits", async ({
      page,
      request,
      database,
      candidate,
      worker,
    }) => {
      await database.insert(workExperiences).values({
        userId: candidate.id,
        jobTitle: "Data Analyst",
        company: "Acme",
        startDate: "2019-01",
        endDate: "2020-01",
        displayOrder: 1,
      });
      await worker.start();
      await page.goto(tailorPage(candidate.applicationId));
      await page.getByLabel(/^Work experiences/).fill("1");
      // Unscripted, the fake provider refuses the matching calls.
      await previewButton(page).click();
      await expect(toast(page, "Preview ready")).toBeVisible({
        timeout: 60_000,
      });
      await expect(
        page.getByText(AI_UNAVAILABLE, { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("region", { name: "What was matched" }),
      ).toHaveCount(0);
      const job = await latestJob(request, candidate.applicationId);
      expect(job?.result?.aiSelection).toBeNull();
      const work = job?.result?.document.sections.find(
        (section) => section.kind === "work",
      );
      expect(work?.entries.map((entry) => entry.heading)).toEqual([
        "Example Co, Software Engineer",
      ]);
    });

    test("without a job description everything is included and nothing is matched", async ({
      page,
      request,
      database,
      candidate,
      worker,
    }) => {
      await database
        .update(jobApplications)
        .set({ jobDescription: null })
        .where(eq(jobApplications.id, candidate.applicationId));
      await worker.start();
      await page.goto(tailorPage(candidate.applicationId));
      await expect(
        page.getByRole("main").getByText("No job description", { exact: true }),
      ).toBeVisible();
      await previewButton(page).click();
      await expect(toast(page, "Preview ready")).toBeVisible({
        timeout: 60_000,
      });
      await expect(page.getByText(AI_UNAVAILABLE)).toHaveCount(0);
      expect(
        (await latestJob(request, candidate.applicationId))?.payload,
      ).toMatchObject({ request: { useAISelection: false } });
    });

    test("a job description removed after the page loaded stops a matched preview", async ({
      page,
      database,
      candidate,
    }) => {
      await page.goto(tailorPage(candidate.applicationId));
      await expect(matching(page)).toBeChecked();
      await database
        .update(jobApplications)
        .set({ jobDescription: null })
        .where(eq(jobApplications.id, candidate.applicationId));
      const refused = responseTo(page, "POST", JOBS);
      await previewButton(page).click();
      expect((await refused).status()).toBe(400);
      await expect(
        page
          .getByRole("main")
          .getByText(
            "Job description is required for AI-powered resume generation",
            { exact: true },
          ),
      ).toBeVisible();
    });

    test("with three jobs waiting a fourth is refused", async ({
      page,
      request,
      candidate,
    }) => {
      for (let queued = 0; queued < 3; queued += 1) {
        const response = await request.post(JOBS, {
          data: {
            kind: "profile",
            request: { title: "q", contentSelection: {} },
          },
        });
        expect(response.status()).toBe(202);
      }
      await page.goto(tailorPage(candidate.applicationId));
      await matching(page).uncheck();
      await previewButton(page).click();
      await expect(
        page
          .getByRole("main")
          .getByText(
            "You already have resumes being generated. Wait for one to finish, then try again.",
            { exact: true },
          ),
      ).toBeVisible();
    });

    test("a draft the compiler rejects says so and shows no preview", async ({
      page,
      request,
      database,
      candidate,
      worker,
    }) => {
      await database
        .update(workExperiences)
        .set({ description: "Shipped the unicorn feature 🦄" })
        .where(eq(workExperiences.userId, candidate.id));
      await worker.start();
      await page.goto(tailorPage(candidate.applicationId));
      await matching(page).uncheck();
      await previewButton(page).click();
      await expect
        .poll(
          async () =>
            (await latestJob(request, candidate.applicationId))?.status,
          { timeout: 60_000 },
        )
        .toBe("failed");
      const failed = await latestJob(request, candidate.applicationId);
      if (!failed?.error) throw new Error("Missing compiler error.");
      await expect(
        page.getByRole("main").getByText(failed.error, { exact: true }),
      ).toBeVisible();
      await expect(page.getByLabel("Page fit")).toHaveCount(0);
    });

    test("an overflowing draft is fitted by the model", async ({
      page,
      request,
      database,
      candidate,
      worker,
      ai,
    }) => {
      await addLongRoles(database, candidate.id);
      ai.reply(trimToFirstBullet, isRevision);
      await worker.start();
      await previewed(page, candidate.applicationId);
      await expect(page.getByLabel("Page fit")).toHaveText(
        /Pages\s*1\s*Target\s*1\s*Revisions\s*1/,
      );
      await expect(
        page.getByText("Fits 1 page", { exact: true }),
      ).toBeVisible();
      const job = await latestJob(request, candidate.applicationId);
      expect(job?.result?.fit).toMatchObject({
        revisions: 1,
        fitsTarget: true,
        changes: ["Kept the first bullet of each role."],
      });
      const revision = ai.requests().find(isRevision);
      expect(revision ? userPrompt(revision) : undefined).toContain(
        '"targetPages":1',
      );
      for (const entry of job?.result?.document.sections.find(
        (section) => section.kind === "work",
      )?.entries ?? [])
        expect(entry.bullets.length).toBeLessThanOrEqual(1);
    });
  },
);

test.describe(
  "Save a tailored resume",
  { tag: "@application-tailor-save" },
  () => {
    test("a preview is saved, downloaded without a new job, and replaced by the next save", async ({
      page,
      request,
      database,
      candidate,
      worker,
      inspectPDF,
    }) => {
      await worker.start();
      const id = candidate.applicationId;
      await previewed(page, id);
      await expectFitsUnrevised(request, id);
      const first = await latestJob(request, id);

      const saved = responseTo(page, "PUT", `/api/applications/${id}/resume`);
      await saveButton(page).click();
      const savedResponse = await saved;
      const savedRaw: unknown = await savedResponse.json();
      const firstSave = saveTailoredResumeResponseSchema.parse(savedRaw);
      expect(firstSave.isNew).toBe(true);
      await expect(toast(page, "Resume saved")).toBeVisible();
      await expect(
        page.getByText(ALREADY_SAVED, { exact: true }),
      ).toBeVisible();
      const [row] = await database
        .select({ pdfKey: resumes.pdfKey, isTailored: resumes.isTailored })
        .from(resumes)
        .where(eq(resumes.id, firstSave.resume.id));
      expect(row?.isTailored).toBe(true);
      expect(row?.pdfKey).toMatch(/\.pdf$/);

      const jobs = recordRequests(page, call("POST", JOBS));
      const download = page.waitForEvent("download");
      await saveAndDownload(page).click();
      const pdf = await inspectPDF(await download);
      expect(
        pdf.bytes.equals(Buffer.from(first?.result?.pdfBase64 ?? "", "base64")),
      ).toBe(true);
      await expect(
        toast(page, "Resume saved and PDF downloaded"),
      ).toBeVisible();
      expect(jobs).toHaveLength(0);

      await page
        .getByLabel("Resume title", { exact: true })
        .fill("Renamed Tailored Resume");
      await previewButton(page).click();
      await expect
        .poll(async () => (await latestJob(request, id))?.id, {
          timeout: 60_000,
        })
        .not.toBe(first?.id);
      await expect(saveButton(page)).toBeEnabled({ timeout: 60_000 });
      const replaced = responseTo(
        page,
        "PUT",
        `/api/applications/${id}/resume`,
      );
      await saveButton(page).click();
      const replacedRaw: unknown = await (await replaced).json();
      const secondSave = saveTailoredResumeResponseSchema.parse(replacedRaw);
      expect(secondSave).toMatchObject({
        isNew: false,
        resume: { id: firstSave.resume.id, title: "Renamed Tailored Resume" },
      });
      expect(
        await database
          .select({ title: resumes.title })
          .from(resumes)
          .where(eq(resumes.userId, candidate.id)),
      ).toEqual([{ title: "Renamed Tailored Resume" }]);
      await page.goto("/dashboard/resumes");
      await expect(
        page
          .getByRole("main")
          .getByRole("listitem")
          .filter({ hasText: "Renamed Tailored Resume" })
          .getByText("Tailored", { exact: true }),
      ).toBeVisible();
    });

    test("changed settings mark the preview stale and send a new save job", async ({
      page,
      request,
      worker,
      candidate,
    }) => {
      await worker.start();
      const id = candidate.applicationId;
      await previewed(page, id);
      await expectFitsUnrevised(request, id);
      await page.getByText("2 pages", { exact: true }).click();
      await expect(page.getByText(STALE, { exact: true })).toBeVisible();
      await expect(saveButton(page)).toBeDisabled();
      const queued = page.waitForRequest((request) =>
        call("POST", JOBS)(request),
      );
      await saveAndDownload(page).click();
      const body: unknown = (await queued).postDataJSON();
      expect(body).toMatchObject({
        kind: "application",
        intent: "save-and-download",
        request: { applicationId: id, targetPages: 2 },
      });
    });

    test("a preview that is gone cannot be saved, and the error clears after a new preview", async ({
      page,
      request,
      database,
      candidate,
      worker,
    }) => {
      await worker.start();
      const id = candidate.applicationId;
      await previewed(page, id);
      await expectFitsUnrevised(request, id);
      const job = await latestJob(request, id);
      if (!job) throw new Error("The preview made a job.");
      await database
        .delete(resumeGenerationJobs)
        .where(eq(resumeGenerationJobs.id, job.id));
      const refused = responseTo(page, "PUT", `/api/applications/${id}/resume`);
      await saveButton(page).click();
      expect((await refused).status()).toBe(404);
      const main = page.getByRole("main");
      await expect(main.getByText(PREVIEW_GONE, { exact: true })).toBeVisible();

      await previewButton(page).click();
      await expect
        .poll(async () => (await latestJob(request, id))?.status, {
          timeout: 60_000,
        })
        .toBe("completed");
      await expect(saveButton(page)).toBeEnabled();
      expectedFail(
        "src/app/dashboard/applications/[id]/resume/page.tsx:423: the notice shows saveMutation.error, which is only cleared by the next save, so it outlives the new preview",
      );
      await expect(main.getByText(PREVIEW_GONE, { exact: true })).toHaveCount(
        0,
        { timeout: 2_000 },
      );
    });

    test("a failed save shows its message, and the buttons wait while saving", async ({
      page,
      request,
      worker,
      candidate,
    }) => {
      await worker.start();
      const id = candidate.applicationId;
      await previewed(page, id);
      await expectFitsUnrevised(request, id);
      const gate = Promise.withResolvers<undefined>();
      await page.route(`**/api/applications/${id}/resume`, async (route) => {
        if (route.request().method() !== "PUT") return route.fallback();
        await gate.promise;
        return route.fulfill({
          status: 500,
          json: { error: "Failed to save tailored resume" },
        });
      });
      await saveButton(page).click();
      for (const button of [
        saveButton(page),
        previewButton(page),
        saveAndDownload(page),
      ])
        await expect(button).toBeDisabled();
      gate.resolve(undefined);
      await expect(
        page
          .getByRole("main")
          .getByText("Failed to save tailored resume", { exact: true }),
      ).toBeVisible();
    });

    test("a save-and-download the compiler rejects saves nothing", async ({
      page,
      request,
      database,
      candidate,
      worker,
    }) => {
      await database
        .update(workExperiences)
        .set({ description: "Shipped the unicorn feature 🦄" })
        .where(eq(workExperiences.userId, candidate.id));
      await worker.start();
      let downloads = 0;
      page.on("download", () => {
        downloads += 1;
      });
      await page.goto(tailorPage(candidate.applicationId));
      await matching(page).uncheck();
      await saveAndDownload(page).click();
      await expect
        .poll(
          async () =>
            (await latestJob(request, candidate.applicationId))?.status,
          { timeout: 60_000 },
        )
        .toBe("failed");
      const failed = await latestJob(request, candidate.applicationId);
      if (!failed?.error) throw new Error("Missing compiler error.");
      await expect(
        page.getByRole("main").getByText(failed.error, { exact: true }),
      ).toBeVisible();
      expect(downloads).toBe(0);
      expect(
        await database
          .select({ id: resumes.id })
          .from(resumes)
          .where(eq(resumes.userId, candidate.id)),
      ).toEqual([]);
    });

    test(
      "the dashboard counts a tailored resume saved a moment ago",
      { tag: "@GAP-cross-page-cache-staleness" },
      async ({ page, request, worker, candidate }) => {
        await worker.start();
        await page.goto("/dashboard");
        const documents = page.getByRole("region", { name: "Documents" });
        const resumesRow = documents
          .getByRole("listitem")
          .filter({ has: page.getByRole("link", { name: "Resumes" }) });
        await expect(resumesRow).toContainText("0");
        const nav = page.getByRole("navigation", { name: "Main" });
        await nav
          .getByRole("link", { name: "Applications", exact: true })
          .click();
        await page
          .getByRole("main")
          .getByRole("link", { name: "Tailor resume", exact: true })
          .click();
        await expect(page).toHaveURL(tailorPage(candidate.applicationId));
        await matching(page).uncheck();
        await previewButton(page).click();
        await expect(toast(page, "Preview ready")).toBeVisible({
          timeout: 60_000,
        });
        await expectFitsUnrevised(request, candidate.applicationId);
        await saveButton(page).click();
        await expect(toast(page, "Resume saved")).toBeVisible();
        await nav.getByRole("link", { name: "Dashboard", exact: true }).click();
        await expect(
          page.getByRole("heading", { name: "Dashboard", level: 1 }),
        ).toBeVisible();
        await expect(resumesRow).toBeVisible();
        expectedFail(
          "src/app/dashboard/applications/mutations/use-generate-job-application-resume.ts:67: a tailored save invalidates the resume lists but not the dashboard stats, so the cached count stays 0",
        );
        await expect(resumesRow).toContainText("1", { timeout: 2_000 });
      },
    );

    test("a finished preview from elsewhere cannot be saved here", async ({
      request,
      candidate,
      worker,
    }) => {
      const other = await request.post("/api/applications", {
        data: {
          company: "Other Co",
          position: "Engineer",
          jobDescription: "x",
        },
      });
      expect(other.status()).toBe(201);
      const otherRaw: unknown = await other.json();
      const otherId = z.object({ id: z.string() }).parse(otherRaw).id;
      const fromOther = await request.post(
        `/api/applications/${otherId}/resume`,
        { data: { title: "Other", useAISelection: false } },
      );
      const fromProfile = await request.post(JOBS, {
        data: {
          kind: "profile",
          request: { title: "p", contentSelection: {} },
        },
      });
      const jobIds = await Promise.all(
        [fromOther, fromProfile].map(async (response) => {
          expect(response.status()).toBe(202);
          const raw: unknown = await response.json();
          return acceptedGenerationJobSchema.parse(raw).jobId;
        }),
      );
      await worker.start();
      for (const jobId of jobIds)
        await expect
          .poll(
            async () => {
              const response = await request.get(`${JOBS}/${jobId}`);
              const raw: unknown = await response.json();
              return z.object({ status: z.string() }).parse(raw).status;
            },
            { timeout: 60_000 },
          )
          .toBe("completed");
      for (const jobId of jobIds) {
        const response = await request.put(
          `/api/applications/${candidate.applicationId}/resume`,
          { data: { title: "Hijack", jobId } },
        );
        expect(response.status()).toBe(404);
        expect(await response.json()).toEqual({ error: PREVIEW_GONE });
      }
    });
  },
);
