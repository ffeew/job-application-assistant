import type { APIRequestContext, Page } from "@playwright/test";
import { eq } from "drizzle-orm";
import { resumeGenerationJobs } from "../../src/lib/db/schema";
import {
  acceptedGenerationJobSchema,
  generationJobResponseSchema,
  latestGenerationJobSchema,
} from "../../src/app/api/resume-generation/jobs/validators";
import { resumeDataJsonResponseSchema } from "../../src/app/api/resume-generation/validators";
import { test, expect, type Database } from "./support/fixtures";
import {
  anonymousRequest,
  expectedFail,
  MALFORMED_JSON,
  responseTo,
} from "./support/helpers";
import { BASE_URL } from "./support/runtime";

test.setTimeout(120_000);

const GENERATE_PAGE = "/dashboard/resumes/generate";
const JOBS = "/api/resume-generation/jobs";
const EMPTY_HINT =
  "Select Preview to compile your resume and check how it fits the page.";
const INVALID_RESUME_REQUEST =
  "Invalid resume request. Check the selected options.";
const QUEUED = "Your resume is queued.";

async function latestJob(request: APIRequestContext, applicationId?: string) {
  const suffix = applicationId ? `?applicationId=${applicationId}` : "";
  const response = await request.get(`${JOBS}${suffix}`);
  expect(response.status()).toBe(200);
  const raw: unknown = await response.json();
  return latestGenerationJobSchema.parse(raw);
}

async function getJob(request: APIRequestContext, id: string) {
  const response = await request.get(`${JOBS}/${id}`);
  expect(response.status()).toBe(200);
  const raw: unknown = await response.json();
  return generationJobResponseSchema.parse(raw);
}

/** Queues a profile preview from the page and returns its job id. */
async function queuePreview(page: Page, title: string) {
  await page.goto(GENERATE_PAGE);
  await expect(page.getByText(EMPTY_HINT, { exact: true })).toBeVisible();
  await page.getByLabel("Resume title", { exact: true }).fill(title);
  const accepted = responseTo(page, "POST", JOBS);
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  const response = await accepted;
  expect(response.status()).toBe(202);
  const raw: unknown = await response.json();
  return acceptedGenerationJobSchema.parse(raw).jobId;
}

async function setJob(
  database: Database,
  id: string,
  values: Partial<typeof resumeGenerationJobs.$inferInsert>,
) {
  await database
    .update(resumeGenerationJobs)
    .set(values)
    .where(eq(resumeGenerationJobs.id, id));
}

function preview(page: Page) {
  return page.getByRole("button", { name: "Preview", exact: true });
}

test.describe(
  "Generation job states and restoring them",
  { tag: "@generation-job-lifecycle" },
  () => {
    test("a queued preview is restored on return and finishes once the worker runs", async ({
      page,
      request,
      worker,
    }) => {
      const project = await request.post("/api/profile/projects", {
        data: {
          title: "Route Planner",
          description: null,
          technologies: null,
          projectUrl: null,
          githubUrl: null,
          startDate: null,
          endDate: null,
          isOngoing: false,
          displayOrder: 0,
        },
      });
      expect(project.status()).toBe(201);
      await page.goto(GENERATE_PAGE);
      await expect(page.getByText(EMPTY_HINT, { exact: true })).toBeVisible();
      await page
        .getByLabel("Resume title", { exact: true })
        .fill("Restore E2E");
      await page.getByText("2 pages", { exact: true }).click();
      await page.getByLabel("Projects", { exact: true }).check();
      await preview(page).click();
      await expect(page.getByText(QUEUED, { exact: true })).toBeVisible();

      await page
        .getByRole("navigation", { name: "Main" })
        .getByRole("link", { name: "Resumes", exact: true })
        .click();
      await expect(page).toHaveURL(/\/dashboard\/resumes$/);
      await page.goto(GENERATE_PAGE);
      await expect(
        page.getByLabel("Resume title", { exact: true }),
      ).toHaveValue("Restore E2E");
      await expect(
        page.getByRole("radio", { name: "2 pages", exact: true }),
      ).toBeChecked();
      await expect(page.getByLabel("Projects", { exact: true })).toBeChecked();
      await expect(page.getByText(QUEUED, { exact: true })).toBeVisible();
      await expect(preview(page)).toBeDisabled();

      await worker.start();
      await expect(page.getByLabel("Page fit")).toBeVisible({
        timeout: 60_000,
      });
      // Only a job submitted while this page is open is announced.
      await expect(
        page.getByText("Preview ready", { exact: true }),
      ).toHaveCount(0);
      const job = await latestJob(request);
      if (!job) throw new Error("The restored job is the latest one.");
      // No fitting was needed, so an unscripted fitting call cannot hide here.
      expect(job.result?.fit).toMatchObject({
        revisions: 0,
        fitsTarget: true,
        warnings: [],
      });
      const pdf = await request.get(`${JOBS}/${job.id}/pdf`);
      expect(pdf.status()).toBe(200);
      expect(pdf.headers()["content-type"]).toBe("application/pdf");
      expect(pdf.headers()["content-disposition"]).toBe(
        'attachment; filename="Restore_E2E.pdf"',
      );
    });

    test("a running job says it is compiling", async ({ page, database }) => {
      const id = await queuePreview(page, "Running E2E");
      await setJob(database, id, {
        status: "running",
        attempts: 1,
        leaseExpiresAt: new Date(Date.now() + 300_000),
      });
      await expect(page.getByRole("main")).toContainText(
        "Compiling and checking the fit. You can leave this page. The result will be here when you come back.",
      );
    });

    test("a failure is announced on the page that asked, and restored after a reload", async ({
      page,
      database,
    }) => {
      const id = await queuePreview(page, "Failing E2E");
      await setJob(database, id, { status: "failed", error: "Seeded failure" });
      const main = page.getByRole("main");
      await expect(
        page
          .getByRole("region", { name: /^Notifications/ })
          .getByText("Seeded failure", { exact: true }),
      ).toBeVisible();
      await expect(
        main.getByText("Seeded failure", { exact: true }),
      ).toBeVisible();
      await expect(preview(page)).toBeEnabled();

      await page.reload();
      await expect(
        main.getByText("Seeded failure", { exact: true }),
      ).toBeVisible();
      await expect(
        page
          .getByRole("region", { name: /^Notifications/ })
          .getByText("Seeded failure", { exact: true }),
      ).toHaveCount(0);
    });

    test("a failure older than fifteen minutes is not brought back", async ({
      page,
      request,
      database,
    }) => {
      const id = await queuePreview(page, "Old Failure E2E");
      await setJob(database, id, {
        status: "failed",
        error: "Old failure",
        updatedAt: new Date(Date.now() - 16 * 60_000),
      });
      expect(await latestJob(request)).toBeNull();
      await page.reload();
      await expect(page.getByText(EMPTY_HINT, { exact: true })).toBeVisible();
      await expect(page.getByText("Old failure", { exact: true })).toHaveCount(
        0,
      );
    });

    test("a job interrupted twice fails with its own message", async ({
      page,
      request,
      database,
      worker,
    }) => {
      const id = await queuePreview(page, "Twice E2E");
      await setJob(database, id, {
        status: "running",
        attempts: 2,
        leaseExpiresAt: new Date(Date.now() - 60_000),
      });
      await worker.start();
      await expect
        .poll(async () => (await getJob(request, id)).status, {
          timeout: 30_000,
        })
        .toBe("failed");
      expect((await getJob(request, id)).error).toBe(
        "Generation was interrupted twice. Please retry.",
      );
      await expect(
        page
          .getByRole("main")
          .getByText("Generation was interrupted twice. Please retry.", {
            exact: true,
          }),
      ).toBeVisible();
    });

    test("a job interrupted once is picked up again and finishes", async ({
      page,
      request,
      database,
      worker,
    }) => {
      const id = await queuePreview(page, "Once E2E");
      await setJob(database, id, {
        status: "running",
        attempts: 1,
        leaseExpiresAt: new Date(Date.now() - 60_000),
      });
      await worker.start();
      await expect
        .poll(async () => (await getJob(request, id)).status, {
          timeout: 60_000,
        })
        .toBe("completed");
      const [row] = await database
        .select({ attempts: resumeGenerationJobs.attempts })
        .from(resumeGenerationJobs)
        .where(eq(resumeGenerationJobs.id, id));
      expect(row?.attempts).toBe(2);
      expect((await getJob(request, id)).result?.fit).toMatchObject({
        revisions: 0,
        fitsTarget: true,
        warnings: [],
      });
      await expect(page.getByLabel("Page fit")).toBeVisible();
    });

    test(
      "a job deleted while the page waits frees the page",
      { tag: "@GAP-delete-application-side-effects" },
      async ({ page, request, candidate }) => {
        const id = candidate.applicationId;
        await page.goto(`/dashboard/applications/${id}/resume`);
        await page
          .getByLabel("Match content to the job description", { exact: true })
          .uncheck();
        await preview(page).click();
        await expect(page.getByText(QUEUED, { exact: true })).toBeVisible();
        const gone = page.waitForResponse(
          (response) =>
            new URL(response.url()).pathname.startsWith(`${JOBS}/`) &&
            response.status() === 404,
        );
        expect((await request.delete(`/api/applications/${id}`)).status()).toBe(
          200,
        );
        await gone;
        await expect(
          page
            .getByRole("main")
            .getByText("Generation job not found", { exact: true }),
        ).toBeVisible();
        expectedFail(
          "src/app/dashboard/resumes/queries/use-generation-job.ts:96: the last polled job, still queued, is kept after the 404, so the pane stays queued",
        );
        await expect(page.getByText(QUEUED, { exact: true })).toHaveCount(0, {
          timeout: 2_000,
        });
      },
    );

    test("a job with an outdated payload is ignored, and the worker fails it", async ({
      request,
      database,
      candidate,
      worker,
    }) => {
      const [row] = await database
        .insert(resumeGenerationJobs)
        .values({
          userId: candidate.id,
          payload: { kind: "profile", request: {} },
          status: "queued",
        })
        .returning({ id: resumeGenerationJobs.id });
      if (!row) throw new Error("Could not seed the outdated job.");
      expect(await latestJob(request)).toBeNull();
      const lookup = await request.get(`${JOBS}/${row.id}`);
      expect(lookup.status()).toBe(404);
      await worker.start();
      await expect
        .poll(
          async () => {
            const [stored] = await database
              .select({
                status: resumeGenerationJobs.status,
                error: resumeGenerationJobs.error,
              })
              .from(resumeGenerationJobs)
              .where(eq(resumeGenerationJobs.id, row.id));
            return stored;
          },
          { timeout: 30_000 },
        )
        .toEqual({
          status: "failed",
          error: "Resume generation failed. Please retry.",
        });
    });

    test("a restore request that fails shows its message, or the fallback", async ({
      page,
    }) => {
      let attempt = 0;
      await page.route(
        (url) => url.pathname === JOBS,
        (route) => {
          if (route.request().method() !== "GET") return route.fallback();
          attempt += 1;
          return attempt === 1
            ? route.fulfill({ status: 403, json: { error: "Restore down" } })
            : route.fulfill({ status: 403, body: "" });
        },
      );
      await page.goto(GENERATE_PAGE);
      const main = page.getByRole("main");
      await expect(
        main.getByText("Restore down", { exact: true }),
      ).toBeVisible();
      await page.reload();
      await expect(
        main.getByText("Could not restore generation.", { exact: true }),
      ).toBeVisible();
    });

    test("the jobs API keeps each account's jobs to itself", async ({
      page,
      request,
      createCandidate,
      playwright,
      extraHTTPHeaders,
    }) => {
      const id = await queuePreview(page, "Contract E2E");
      const notFound = await request.get(`${JOBS}/not-a-uuid`);
      expect(notFound.status()).toBe(404);
      expect(await notFound.json()).toEqual({
        error: "Generation job not found",
      });
      const notReady = await request.get(`${JOBS}/${id}/pdf`);
      expect(notReady.status()).toBe(409);
      expect(await notReady.json()).toEqual({ error: "The PDF is not ready." });

      const other = await createCandidate();
      expect(await latestJob(request, other.applicationId)).toBeNull();
      const otherRequest = await playwright.request.newContext({
        baseURL: BASE_URL,
        storageState: other.storageState,
        extraHTTPHeaders,
      });
      try {
        for (const path of [`${JOBS}/${id}`, `${JOBS}/${id}/pdf`]) {
          const response = await otherRequest.get(path);
          expect(response.status(), path).toBe(404);
          expect(await response.json()).toEqual({
            error: "Generation job not found",
          });
        }
        const response = await otherRequest.get(JOBS);
        const raw: unknown = await response.json();
        expect(latestGenerationJobSchema.parse(raw)).toBeNull();
      } finally {
        await otherRequest.dispose();
      }
    });
  },
);

test.describe(
  "Resume generation API contract",
  { tag: "@resume-generation-api-contract" },
  () => {
    test("the older preview and PDF routes queue jobs, and the data route reads the profile", async ({
      request,
      candidate,
    }) => {
      for (const [path, intent] of [
        ["/api/resume-generation/preview", "preview"],
        ["/api/resume-generation/pdf", "download"],
      ] as const) {
        const response = await request.post(path, {
          data: { title: "p", contentSelection: {} },
        });
        expect(response.status(), path).toBe(202);
        expect(response.headers()["cache-control"]).toBe("no-store");
        const raw: unknown = await response.json();
        const accepted = acceptedGenerationJobSchema.parse(raw);
        expect(accepted.status).toBe("queued");
        expect((await getJob(request, accepted.jobId)).payload.intent).toBe(
          intent,
        );
      }
      const data = await request.get("/api/resume-generation");
      expect(data.status()).toBe(200);
      const raw: unknown = await data.json();
      const resumeData = resumeDataJsonResponseSchema.parse(raw);
      expect(resumeData.profile?.userId).toBe(candidate.id);
      expect(resumeData.workExperiences.map((row) => row.company)).toEqual([
        "Example Co",
      ]);
    });

    test("invalid job requests are refused", async ({
      request,
      createCandidate,
    }) => {
      const malformed = await request.post(JOBS, MALFORMED_JSON);
      expect(malformed.status()).toBe(400);
      expect(await malformed.json()).toEqual({ error: INVALID_RESUME_REQUEST });
      for (const data of [
        {},
        {
          kind: "profile",
          intent: "save-and-download",
          request: { title: "t", contentSelection: {} },
        },
        {
          kind: "profile",
          request: { title: "t", targetPages: 3, contentSelection: {} },
        },
        { kind: "application", request: { applicationId: "", title: "t" } },
      ]) {
        const response = await request.post(JOBS, { data });
        expect(response.status(), JSON.stringify(data)).toBe(400);
        expect(await response.json()).toEqual({
          error: INVALID_RESUME_REQUEST,
        });
      }
      const other = await createCandidate();
      const foreign = await request.post(JOBS, {
        data: {
          kind: "application",
          request: { applicationId: other.applicationId, title: "t" },
        },
      });
      expect(foreign.status()).toBe(404);
      expect(await foreign.json()).toEqual({ error: "Application not found" });
    });

    test("an old template name is accepted and the one template is used", async ({
      request,
      worker,
    }) => {
      const response = await request.post(JOBS, {
        data: {
          kind: "profile",
          request: {
            title: "Modern E2E",
            template: "modern",
            contentSelection: {},
          },
        },
      });
      expect(response.status()).toBe(202);
      const raw: unknown = await response.json();
      const { jobId } = acceptedGenerationJobSchema.parse(raw);
      await worker.start();
      await expect
        .poll(async () => (await getJob(request, jobId)).status, {
          timeout: 60_000,
        })
        .toBe("completed");
      expect((await getJob(request, jobId)).result?.config.template).toBe(
        "professional",
      );
    });

    test("every generation endpoint requires a session", async ({
      playwright,
      extraHTTPHeaders,
      candidate,
    }) => {
      const anonymous = await anonymousRequest(playwright, extraHTTPHeaders);
      const body = { data: { title: "p", contentSelection: {} } };
      try {
        for (const response of [
          await anonymous.get("/api/resume-generation"),
          await anonymous.post("/api/resume-generation", body),
          await anonymous.post("/api/resume-generation/preview", body),
          await anonymous.post("/api/resume-generation/pdf", body),
          await anonymous.get(JOBS),
          await anonymous.post(JOBS, body),
          await anonymous.get(`${JOBS}/${crypto.randomUUID()}`),
          await anonymous.get(`${JOBS}/${crypto.randomUUID()}/pdf`),
          await anonymous.get(
            `/api/applications/${candidate.applicationId}/resume`,
          ),
        ]) {
          expect(response.status(), response.url()).toBe(401);
          expect(await response.json()).toEqual({ error: "Unauthorized" });
        }
      } finally {
        await anonymous.dispose();
      }
    });
  },
);
