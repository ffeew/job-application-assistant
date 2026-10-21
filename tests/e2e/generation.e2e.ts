import { test, expect, type Database } from "./support/fixtures";
import {
  generationJobResponseSchema,
  latestGenerationJobSchema,
} from "../../src/app/api/resume-generation/jobs/validators";
import { resumeJsonResponseSchema } from "../../src/app/api/resumes/validators";
import { parseGeneratedResume } from "../../src/lib/resume-document";
import type { APIRequestContext, Page } from "@playwright/test";
import { eq } from "drizzle-orm";
import {
  education,
  resumeGenerationJobs,
  resumes,
  skills,
  userProfiles,
  workExperiences,
} from "../../src/lib/db/schema";
import { BASE_URL } from "./support/runtime";
import {
  call,
  errorBody,
  expectedFail,
  MALFORMED_JSON,
  recordRequests,
  responseTo,
  revokeSessions,
} from "./support/helpers";

test.setTimeout(120_000);

async function latestJob(request: APIRequestContext, applicationId?: string) {
  const suffix = applicationId ? `?applicationId=${applicationId}` : "";
  const response = await request.get(`/api/resume-generation/jobs${suffix}`);
  expect(response.status()).toBe(200);
  const raw: unknown = await response.json();
  return latestGenerationJobSchema.parse(raw);
}

async function expectCompleted(
  request: APIRequestContext,
  applicationId?: string,
) {
  await expect
    .poll(async () => (await latestJob(request, applicationId))?.status, {
      timeout: 60_000,
    })
    .toBe("completed");
  const job = await latestJob(request, applicationId);
  if (!job?.result)
    throw new Error("The completed job is missing its generated result.");
  expect(job.result.fit).toMatchObject({
    targetPages: 1,
    pageCount: 1,
    revisions: 0,
    fitsTarget: true,
    warnings: [],
  });
  expect(job.result.aiSelection).toBeNull();
  return job;
}

async function openApplicationGenerator(
  page: Page,
  applicationId: string,
  title: string,
) {
  await page.goto(`/dashboard/applications/${applicationId}/resume`);
  await page.getByLabel("Resume title", { exact: true }).fill(title);
  await page
    .getByLabel("Match content to the job description", { exact: true })
    .uncheck();
}

test("profile preview downloads the same real PDF without a second generation", async ({
  page,
  request,
  worker,
  inspectPDF,
}) => {
  await worker.start();
  await page.goto("/dashboard/resumes/generate");
  await page
    .getByLabel("Resume title", { exact: true })
    .fill("Profile E2E Resume");
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  const job = await expectCompleted(request);
  await expect(page.getByLabel("Page fit")).toHaveText(
    /Pages\s*1\s*Target\s*1\s*Revisions\s*0/,
  );
  await expect(page.getByTitle("Resume PDF preview")).toHaveAttribute(
    "src",
    /^blob:/,
  );
  const downloadPromise = page.waitForEvent("download", { timeout: 60_000 });
  await page.getByRole("button", { name: "Download PDF", exact: true }).click();
  const inspected = await inspectPDF(await downloadPromise);
  expect(
    inspected.bytes.equals(Buffer.from(job.result?.pdfBase64 ?? "", "base64")),
  ).toBe(true);
  expect((await latestJob(request))?.id).toBe(job.id);
});

test("generate, save, and reopen a linked application resume", async ({
  page,
  request,
  candidate,
  worker,
  inspectPDF,
  createCandidate,
  browser,
  extraHTTPHeaders,
  database,
}) => {
  await worker.start();
  await openApplicationGenerator(
    page,
    candidate.applicationId,
    "Tailored E2E Resume",
  );
  const downloadPromise = page.waitForEvent("download", { timeout: 60_000 });
  await page
    .getByRole("button", { name: "Save and download PDF", exact: true })
    .click();
  await inspectPDF(await downloadPromise);
  const job = await expectCompleted(request, candidate.applicationId);
  const savedId = job.savedResumeId;
  expect(savedId).toBeTruthy();
  const savedResponse = await request.get(`/api/resumes/${savedId ?? ""}`);
  expect(savedResponse.status()).toBe(200);
  const savedRaw: unknown = await savedResponse.json();
  const saved = resumeJsonResponseSchema.parse(savedRaw);
  expect(saved).toMatchObject({
    isTailored: true,
    title: "Tailored E2E Resume",
    jobApplicationId: candidate.applicationId,
  });
  expect(parseGeneratedResume(saved.content)?.document.name).toBe(
    "Alex Example",
  );
  // The library serves the file kept in storage when the resume was saved,
  // which is the generated PDF itself and not a later compilation.
  const [savedRow] = await database
    .select({ pdfKey: resumes.pdfKey })
    .from(resumes)
    .where(eq(resumes.id, saved.id));
  expect(savedRow?.pdfKey).toMatch(
    new RegExp(`^users/${candidate.id}/resumes/[0-9a-f-]{36}\\.pdf$`),
  );
  const storedPdf = await request.get(`/api/resumes/${saved.id}/pdf`);
  expect(storedPdf.status()).toBe(200);
  expect(
    (await storedPdf.body()).equals(
      Buffer.from(job.result?.pdfBase64 ?? "", "base64"),
    ),
  ).toBe(true);
  // A resume whose file is gone, as after restoring the database alone, is
  // compiled from its snapshot and given a stored file again.
  const lostKey = `users/${candidate.id}/resumes/00000000-0000-4000-8000-000000000000.pdf`;
  await database
    .update(resumes)
    .set({ pdfKey: lostKey })
    .where(eq(resumes.id, saved.id));
  const compiledPdf = await request.get(`/api/resumes/${saved.id}/pdf`);
  expect(compiledPdf.status()).toBe(200);
  const compiledBytes = await compiledPdf.body();
  expect(compiledBytes.subarray(0, 5).toString()).toBe("%PDF-");
  const [healedRow] = await database
    .select({ pdfKey: resumes.pdfKey })
    .from(resumes)
    .where(eq(resumes.id, saved.id));
  expect(healedRow?.pdfKey).toMatch(
    new RegExp(`^users/${candidate.id}/resumes/[0-9a-f-]{36}\\.pdf$`),
  );
  expect(healedRow?.pdfKey).not.toBe(lostKey);
  expect(
    (await (await request.get(`/api/resumes/${saved.id}/pdf`)).body()).equals(
      compiledBytes,
    ),
  ).toBe(true);
  await page.goto("/dashboard/resumes");
  await expect(
    page
      .getByText("Tailored E2E Resume", { exact: true })
      .filter({ visible: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Open", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Tailored E2E Resume", exact: true }),
  ).toBeVisible();
  await expect(page.getByTitle("Resume PDF preview")).toHaveAttribute(
    "src",
    /^blob:/,
    { timeout: 30_000 },
  );
  await expect(page.getByLabel("Page fit")).toHaveText(
    /Pages\s*1\s*Target\s*1\s*Revisions\s*0/,
  );

  const other = await createCandidate();
  const context = await browser.newContext({
    baseURL: BASE_URL,
    storageState: other.storageState,
    extraHTTPHeaders,
  });
  try {
    expect(
      (await context.request.get(`/api/resumes/${saved.id}`)).status(),
    ).toBe(404);
    expect(
      (await context.request.get(`/api/resumes/${saved.id}/pdf`)).status(),
    ).toBe(404);
    expect(
      (
        await context.request.get(`/api/resume-generation/jobs/${job.id}`)
      ).status(),
    ).toBe(404);
    expect(
      (
        await context.request.get(`/api/resume-generation/jobs/${job.id}/pdf`)
      ).status(),
    ).toBe(404);
    const otherPage = await context.newPage();
    await otherPage.goto("/dashboard/resumes");
    await expect(
      otherPage.getByText("No resumes yet", { exact: true }),
    ).toBeVisible();
    await expect(
      otherPage.getByText("Tailored E2E Resume", { exact: true }),
    ).not.toBeVisible();
  } finally {
    await context.close();
  }
});

test("queued generation saves after leaving the page and restores on return", async ({
  page,
  request,
  candidate,
  worker,
}) => {
  await openApplicationGenerator(
    page,
    candidate.applicationId,
    "Background E2E Resume",
  );
  await page
    .getByRole("button", { name: "Save and download PDF", exact: true })
    .click();
  await expect
    .poll(
      async () => (await latestJob(request, candidate.applicationId))?.status,
    )
    .toBe("queued");
  const queued = await latestJob(request, candidate.applicationId);
  if (!queued) throw new Error("Missing queued job.");
  await page.getByRole("link", { name: "Applications", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/applications$/);
  await worker.start();
  const completed = await expectCompleted(request, candidate.applicationId);
  expect(completed.id).toBe(queued.id);
  expect(completed.savedResumeId).toBeTruthy();
  await page.goto(`/dashboard/applications/${candidate.applicationId}/resume`);
  await expect(page.getByLabel("Resume title", { exact: true })).toHaveValue(
    "Background E2E Resume",
  );
  await expect(page.getByTitle("Resume PDF preview")).toHaveAttribute(
    "src",
    /^blob:/,
  );
  expect((await latestJob(request, candidate.applicationId))?.id).toBe(
    queued.id,
  );
  await page.goto("/dashboard/resumes");
  await expect(
    page
      .getByText("Background E2E Resume", { exact: true })
      .filter({ visible: true }),
  ).toHaveCount(1);
});

test("real compiler failure surfaces an error and a corrected profile can retry", async ({
  page,
  request,
  worker,
}) => {
  await worker.start();
  await page.goto("/dashboard/profile");
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page
    .getByLabel("Professional summary", { exact: true })
    .fill("Unsupported resume character: 🦄");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.goto("/dashboard/resumes/generate");
  await page
    .getByLabel("Resume title", { exact: true })
    .fill("Retry E2E Resume");
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await expect
    .poll(async () => (await latestJob(request))?.status, { timeout: 60_000 })
    .toBe("failed");
  const failed = await latestJob(request);
  if (!failed?.error) throw new Error("Missing compiler error.");
  await expect(
    page.getByRole("main").getByText(failed.error, { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Preview", exact: true }),
  ).toBeEnabled();
  await page.goto("/dashboard/profile");
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page
    .getByLabel("Professional summary", { exact: true })
    .fill("Software engineer building reliable applications.");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.goto("/dashboard/resumes/generate");
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  const succeeded = await expectCompleted(request);
  expect(succeeded.id).not.toBe(failed.id);
  await expect(page.getByTitle("Resume PDF preview")).toHaveAttribute(
    "src",
    /^blob:/,
  );
  const raw: unknown = await (
    await request.get(`/api/resume-generation/jobs/${failed.id}`)
  ).json();
  expect(generationJobResponseSchema.parse(raw).status).toBe("failed");
});

const GENERATE_PAGE = "/dashboard/resumes/generate";
const JOBS = "/api/resume-generation/jobs";
const VALIDATE = "/api/resume-generation";
const EMPTY_HINT =
  "Select Preview to compile your resume and check how it fits the page.";

function resumeTitle(page: Page) {
  return page.getByLabel("Resume title", { exact: true });
}

function previewButton(page: Page) {
  return page.getByRole("button", { name: "Preview", exact: true });
}

function downloadButton(page: Page) {
  return page.getByRole("button", { name: "Download PDF", exact: true });
}

/** Opens the generator once its latest-job check has settled. */
async function openGenerator(page: Page, title?: string) {
  await page.goto(GENERATE_PAGE);
  await expect(page.getByText(EMPTY_HINT, { exact: true })).toBeVisible();
  if (title) await resumeTitle(page).fill(title);
}

function availability(page: Page, label: string) {
  return page
    .getByRole("group", { name: "Sections to include" })
    .getByRole("listitem")
    .filter({ has: page.getByText(label, { exact: true }) });
}

async function jobCount(database: Database, userId: string) {
  const rows = await database
    .select({ id: resumeGenerationJobs.id })
    .from(resumeGenerationJobs)
    .where(eq(resumeGenerationJobs.userId, userId));
  return rows.length;
}

test.describe(
  "Generate a resume from the profile: Preview",
  { tag: "@generate-profile-preview" },
  () => {
    test("each section shows what the profile holds for it", async ({
      page,
    }) => {
      await openGenerator(page);
      for (const [label, value] of [
        ["Personal information", "Added"],
        ["Professional summary", "Added"],
        ["Work experience", "1"],
        ["Education", "1"],
        ["Skills", "1"],
        ["Projects", "None yet"],
        ["Certifications", "None yet"],
        ["Achievements", "None yet"],
      ] as const)
        await expect(availability(page, label)).toContainText(value);
      await expect(
        page.getByRole("radio", { name: "1 page", exact: true }),
      ).toBeChecked();
    });

    test("a two-page target without education is previewed", async ({
      page,
      request,
      worker,
    }) => {
      await worker.start();
      await openGenerator(page, "Two Page E2E");
      await page.getByText("2 pages", { exact: true }).click();
      await page.getByLabel("Education", { exact: true }).uncheck();
      await previewButton(page).click();
      await expect(previewButton(page)).toBeDisabled();
      await expect(
        page.getByText("Preview ready", { exact: true }),
      ).toBeVisible({
        timeout: 60_000,
      });
      await expect(page.getByLabel("Page fit")).toHaveText(
        /Pages\s*1\s*Target\s*2\s*Revisions\s*0/,
      );
      await expect(
        page.getByText("Fits 1 page", { exact: true }),
      ).toBeVisible();
      const job = await latestJob(request);
      expect(job?.payload).toMatchObject({
        kind: "profile",
        intent: "preview",
        request: {
          title: "Two Page E2E",
          targetPages: 2,
          contentSelection: { includeEducation: false },
        },
      });
    });

    test("an empty or over-long title is refused without a job", async ({
      page,
    }) => {
      const jobs = recordRequests(page, call("POST", JOBS));
      await openGenerator(page);
      await previewButton(page).click();
      await expect(
        page.getByText("Resume title is required", { exact: true }),
      ).toBeVisible();
      await resumeTitle(page).fill("t".repeat(301));
      await previewButton(page).click();
      await expect(
        page.getByText("Keep this under 300 characters", { exact: true }),
      ).toBeVisible();
      expect(jobs).toHaveLength(0);
    });

    test("a profile too empty to generate from says so and blocks both actions", async ({
      page,
      database,
      candidate,
    }) => {
      await database
        .delete(workExperiences)
        .where(eq(workExperiences.userId, candidate.id));
      await database
        .delete(education)
        .where(eq(education.userId, candidate.id));
      await database.delete(skills).where(eq(skills.userId, candidate.id));
      await page.goto(GENERATE_PAGE);
      await expect(
        page.getByText("Your profile is too empty to generate from", {
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Open your profile", exact: true }),
      ).toHaveAttribute("href", "/dashboard/profile");
      await expect(previewButton(page)).toBeDisabled();
      await expect(downloadButton(page)).toBeDisabled();
      for (const label of ["Work experience", "Education", "Skills"])
        await expect(availability(page, label)).toContainText("None yet");
    });

    test("a checked section with nothing in it is named, and unchecking it lets the job through", async ({
      page,
      database,
      candidate,
    }) => {
      await database
        .delete(education)
        .where(eq(education.userId, candidate.id));
      await openGenerator(page, "No Education E2E");
      await expect(availability(page, "Education")).toContainText("None yet");
      const refused = responseTo(page, "POST", JOBS);
      await previewButton(page).click();
      expect((await refused).status()).toBe(400);
      const message =
        "No education found. Add education or disable it in content selection";
      await expect(
        page.getByRole("main").getByText(message, { exact: true }),
      ).toBeVisible();
      await page.getByLabel("Education", { exact: true }).uncheck();
      const accepted = responseTo(page, "POST", JOBS);
      await previewButton(page).click();
      expect((await accepted).status()).toBe(202);
    });

    test("profile data that fails to load replaces the generator", async ({
      page,
    }) => {
      await page.route(
        (url) => url.pathname === VALIDATE,
        (route) =>
          route.request().method() === "GET"
            ? route.fulfill({ status: 403, json: { error: "x" } })
            : route.fallback(),
      );
      await page.goto(GENERATE_PAGE);
      await expect(
        page.getByRole("heading", { name: "Generate resume", level: 1 }),
      ).toBeVisible();
      const notice = page.getByRole("main").getByRole("alert");
      await expect(notice).toContainText("Your profile didn't load");
      await expect(notice).toContainText(
        "Reload the page to try again. If it keeps failing, check that your profile opens.",
      );
    });

    test("without the worker the preview waits in the queue", async ({
      page,
      request,
    }) => {
      await openGenerator(page, "Queued E2E");
      await previewButton(page).click();
      await expect(
        page.getByText("Your resume is queued.", { exact: true }),
      ).toBeVisible();
      await expect(previewButton(page)).toBeDisabled();
      await expect(downloadButton(page)).toBeDisabled();
      expect((await latestJob(request))?.status).toBe("queued");
    });

    test("a failed enqueue is reported and the buttons come back", async ({
      page,
    }) => {
      await page.route(`**${JOBS}`, (route) =>
        route.request().method() === "POST"
          ? route.fulfill({ status: 500, json: { error: "Queue down" } })
          : route.fallback(),
      );
      await openGenerator(page, "Failing E2E");
      await previewButton(page).click();
      await expect(
        page.getByRole("main").getByText("Queue down", { exact: true }),
      ).toBeVisible();
      await expect(previewButton(page)).toBeEnabled();
      await expect(downloadButton(page)).toBeEnabled();
    });

    test("a dropped connection gets the page's own message", async ({
      page,
    }) => {
      let aborted = false;
      await page.route(`**${JOBS}`, (route) => {
        if (route.request().method() !== "POST") return route.fallback();
        aborted = true;
        return route.abort("internetdisconnected");
      });
      await openGenerator(page, "Offline E2E");
      await previewButton(page).click();
      await expect(
        page.getByText("Failed to fetch", { exact: true }).first(),
      ).toBeVisible();
      expect(aborted).toBe(true);
      expectedFail(
        "src/app/dashboard/resumes/generate/page.tsx:144: the browser's TypeError message is shown, because the error is always an Error, so the page's fallback never applies",
      );
      await expect(
        page.getByText("Couldn't generate the preview. Try again.", {
          exact: true,
        }),
      ).toBeVisible({ timeout: 2_000 });
    });

    test("with three jobs waiting a fourth is refused", async ({
      page,
      request,
      candidate,
    }) => {
      for (let queued = 0; queued < 3; queued += 1) {
        const response = await request.post(JOBS, {
          data: {
            kind: "application",
            request: {
              applicationId: candidate.applicationId,
              title: "q",
              useAISelection: false,
            },
          },
        });
        expect(response.status()).toBe(202);
      }
      await openGenerator(page, "Fourth E2E");
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

    test("a double click queues one job", async ({
      page,
      database,
      candidate,
    }) => {
      await openGenerator(page, "Double E2E");
      const posts = recordRequests(page, call("POST", JOBS));
      await previewButton(page).dblclick();
      await expect(
        page.getByText("Your resume is queued.", { exact: true }),
      ).toBeVisible();
      // Two requests prove the second click got through.
      await expect.poll(() => posts.length).toBe(2);
      expectedFail(
        "src/app/dashboard/resumes/generate/page.tsx:139: handlePreview awaits form.trigger() before the job request is pending, so a second click starts a second job",
      );
      expect(await jobCount(database, candidate.id)).toBe(1);
    });

    test("a session revoked on the page is refused", async ({
      page,
      database,
      candidate,
    }) => {
      await openGenerator(page, "Revoked E2E");
      await revokeSessions(database, candidate.id);
      const refused = responseTo(page, "POST", JOBS);
      await previewButton(page).click();
      expect((await refused).status()).toBe(401);
      await expect(
        page.getByRole("main").getByText("Unauthorized", { exact: true }),
      ).toBeVisible();
    });

    test("content too long for one page is reported, and two pages fit it", async ({
      page,
      request,
      database,
      candidate,
      worker,
    }) => {
      const long = Array.from(
        { length: 12 },
        (_, line) =>
          `Delivered a measurable improvement to platform reliability and team throughput, item ${String(line + 1)}.`,
      ).join("\n");
      await database.insert(workExperiences).values(
        Array.from({ length: 5 }, (_, index) => ({
          userId: candidate.id,
          jobTitle: `Engineer ${String(index + 1)}`,
          company: `Company ${String(index + 1)}`,
          startDate: `20${String(10 + index)}-01`,
          endDate: `20${String(11 + index)}-01`,
          description: long,
        })),
      );
      await worker.start();
      await openGenerator(page, "Long E2E");
      await previewButton(page).click();
      // The unscripted model refuses every fitting attempt, so the draft stays long.
      await expect(page.getByLabel("Page fit")).toBeVisible({
        timeout: 60_000,
      });
      await expect(
        page.getByText(
          "The draft did not meet the 1-page layout target. Select less content or increase the page target and retry.",
          { exact: true },
        ),
      ).toBeVisible();
      await expect(
        page.getByText(/^Over (by \d+ pages?|target)$/),
      ).toBeVisible();

      await page.getByText("2 pages", { exact: true }).click();
      await previewButton(page).click();
      await expect
        .poll(
          async () => (await latestJob(request))?.payload.request.targetPages,
          {
            timeout: 60_000,
          },
        )
        .toBe(2);
      await expect
        .poll(async () => (await latestJob(request))?.status, {
          timeout: 60_000,
        })
        .toBe("completed");
      await expect(
        page.getByText("Fits 2 pages", { exact: true }),
      ).toBeVisible();
    });
  },
);

test.describe(
  "Generate a resume from the profile: Download PDF",
  { tag: "@generate-profile-download" },
  () => {
    test("a download needs no preview, and a changed title makes a new job", async ({
      page,
      request,
      worker,
      inspectPDF,
    }) => {
      await worker.start();
      await openGenerator(page, "Download E2E");
      const validated = responseTo(page, "POST", VALIDATE);
      const downloadPromise = page.waitForEvent("download", {
        timeout: 60_000,
      });
      await downloadButton(page).click();
      expect((await validated).status()).toBe(200);
      // The name is not checked: the object URL is revoked as soon as the
      // link is clicked, so Chromium sometimes names the file by its blob id.
      await inspectPDF(await downloadPromise);
      await expect(
        page.getByText("PDF downloaded", { exact: true }),
      ).toBeVisible();
      await expect(page.getByLabel("Page fit")).toBeVisible();
      const first = await latestJob(request);
      expect(first?.payload.intent).toBe("download");

      await resumeTitle(page).fill("Download E2E v2");
      const second = page.waitForEvent("download", { timeout: 60_000 });
      await downloadButton(page).click();
      await inspectPDF(await second);
      expect((await latestJob(request))?.id).not.toBe(first?.id);
    });

    test("a section the server finds empty is explained and nothing is queued", async ({
      page,
      database,
      candidate,
    }) => {
      await database.delete(skills).where(eq(skills.userId, candidate.id));
      const jobs = recordRequests(page, call("POST", JOBS));
      await openGenerator(page, "No Skills E2E");
      await downloadButton(page).click();
      await expect(
        page.getByText(
          "This resume can't be generated: No skills found. Add skills or disable them in content selection",
          { exact: true },
        ),
      ).toBeVisible();
      expect(jobs).toHaveLength(0);
      expect(await jobCount(database, candidate.id)).toBe(0);
    });

    test("a validation request that fails shows its message, or the fallback", async ({
      page,
    }) => {
      let attempt = 0;
      await page.route(
        (url) => url.pathname === VALIDATE,
        (route) => {
          if (route.request().method() !== "POST") return route.fallback();
          attempt += 1;
          return attempt === 1
            ? route.fulfill({ status: 500, json: { error: "Validator down" } })
            : route.fulfill({ status: 500, body: "" });
        },
      );
      const jobs = recordRequests(page, call("POST", JOBS));
      await openGenerator(page, "Validator E2E");
      await downloadButton(page).click();
      await expect(
        page.getByText("Validator down", { exact: true }),
      ).toBeVisible();
      await downloadButton(page).click();
      await expect(
        page.getByText("Failed to validate resume", { exact: true }),
      ).toBeVisible();
      expect(jobs).toHaveLength(0);
    });

    test("an empty title stops the download before any request", async ({
      page,
    }) => {
      const sent = recordRequests(
        page,
        (request) =>
          request.method() === "POST" &&
          new URL(request.url()).pathname.startsWith(VALIDATE),
      );
      await openGenerator(page);
      await downloadButton(page).click();
      await expect(
        page.getByText("Resume title is required", { exact: true }),
      ).toBeVisible();
      expect(sent).toHaveLength(0);
    });

    test("a download the compiler rejects is reported without a file", async ({
      page,
      request,
      database,
      candidate,
      worker,
    }) => {
      await database
        .update(userProfiles)
        .set({ professionalSummary: "Unsupported resume character: 🦄" })
        .where(eq(userProfiles.userId, candidate.id));
      await worker.start();
      let downloads = 0;
      page.on("download", () => {
        downloads += 1;
      });
      await openGenerator(page, "Broken Download E2E");
      await downloadButton(page).click();
      await expect
        .poll(async () => (await latestJob(request))?.status, {
          timeout: 60_000,
        })
        .toBe("failed");
      const failed = await latestJob(request);
      if (!failed?.error) throw new Error("Missing compiler error.");
      await expect(
        page.getByRole("main").getByText(failed.error, { exact: true }),
      ).toBeVisible();
      expect(downloads).toBe(0);
    });

    test("the validation API checks its body and the ids it is given", async ({
      request,
    }) => {
      const empty = await request.post(VALIDATE, { data: { title: "" } });
      expect(empty.status()).toBe(400);
      expect((await errorBody(empty)).error).toBe("Invalid request data");
      const malformed = await request.post(VALIDATE, MALFORMED_JSON);
      expect(malformed.status()).toBe(400);
      expect(await malformed.json()).toEqual({
        error: "Request body must be valid JSON",
      });
      const unknown = await request.post(VALIDATE, {
        data: {
          title: "x",
          contentSelection: { workExperienceIds: [999_999] },
        },
      });
      expect(unknown.status()).toBe(200);
      expect(await unknown.json()).toMatchObject({
        valid: false,
        errors: ["Work experience IDs not found: 999999"],
      });
    });
  },
);

test.describe(
  "LaTeX special characters and other scripts",
  { tag: "@GAP-latex-unicode-filenames" },
  () => {
    test("special characters and accents come through into the PDF", async ({
      page,
      database,
      candidate,
      worker,
      inspectPDF,
    }) => {
      await database
        .update(userProfiles)
        .set({
          professionalSummary:
            "R&D lead: cut costs 50% for C# and F# teams, $2M budget, file_name {braces} — José Müller, naïve café",
        })
        .where(eq(userProfiles.userId, candidate.id));
      await worker.start();
      await openGenerator(page, "Special Characters E2E");
      const downloadPromise = page.waitForEvent("download", {
        timeout: 60_000,
      });
      await downloadButton(page).click();
      const { text } = await inspectPDF(await downloadPromise);
      const normalized = text.normalize("NFC");
      for (const fragment of [
        "R&D",
        "50%",
        "C#",
        "$2M",
        "file_name",
        "{braces}",
        "José Müller",
      ])
        expect(normalized).toContain(fragment);
    });

    test("Chinese characters fail with the compiler's message", async ({
      page,
      request,
      database,
      candidate,
      worker,
    }) => {
      await database
        .update(userProfiles)
        .set({ professionalSummary: "Based in 東京" })
        .where(eq(userProfiles.userId, candidate.id));
      await worker.start();
      await openGenerator(page, "CJK E2E");
      await previewButton(page).click();
      await expect
        .poll(async () => (await latestJob(request))?.status, {
          timeout: 60_000,
        })
        .toBe("failed");
      const failed = await latestJob(request);
      if (!failed?.error) throw new Error("Missing compiler error.");
      await expect(
        page.getByRole("main").getByText(failed.error, { exact: true }),
      ).toBeVisible();
      await expect(previewButton(page)).toBeEnabled();
    });
  },
);
