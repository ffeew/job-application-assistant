import { test, expect } from "./support/fixtures";
import {
  generationJobResponseSchema,
  latestGenerationJobSchema,
} from "../../src/app/api/resume-generation/jobs/validators";
import { resumeJsonResponseSchema } from "../../src/app/api/resumes/validators";
import { parseGeneratedResume } from "../../src/lib/resume-document";
import type { APIRequestContext, Page } from "@playwright/test";
import { BASE_URL } from "./support/runtime";

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
  await page.getByLabel("Resume Title", { exact: true }).fill(title);
  await page.getByLabel("AI Content Optimization", { exact: true }).uncheck();
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
    .getByLabel("Resume Title", { exact: true })
    .fill("Profile E2E Resume");
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  const job = await expectCompleted(request);
  await expect(
    page.getByText("1 page · Target: 1 · 0 revisions", { exact: true }),
  ).toBeVisible();
  await expect(page.getByTitle("Resume PDF preview")).toHaveAttribute(
    "src",
    /^blob:/,
  );
  const downloadPromise = page.waitForEvent("download", { timeout: 60_000 });
  await page.getByRole("button", { name: "Generate PDF", exact: true }).click();
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
}) => {
  await worker.start();
  await openApplicationGenerator(
    page,
    candidate.applicationId,
    "Tailored E2E Resume",
  );
  const downloadPromise = page.waitForEvent("download", { timeout: 60_000 });
  await page
    .getByRole("button", { name: "Generate & Save PDF", exact: true })
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
  await page.goto("/dashboard/resumes");
  await expect(
    page
      .getByText("Tailored E2E Resume", { exact: true })
      .filter({ visible: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Edit", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Tailored E2E Resume", exact: true }),
  ).toBeVisible();
  await expect(page.getByTitle("Resume PDF preview")).toHaveAttribute(
    "src",
    /^blob:/,
    { timeout: 30_000 },
  );
  await expect(
    page.getByText("1 page · Target: 1 · 0 revisions", { exact: true }),
  ).toBeVisible();

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
    .getByRole("button", { name: "Generate & Save PDF", exact: true })
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
  await expect(page.getByLabel("Resume Title", { exact: true })).toHaveValue(
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
    .getByLabel("Professional Summary", { exact: true })
    .fill("Unsupported resume character: 🦄");
  await page.getByRole("button", { name: "Save Changes", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.goto("/dashboard/resumes/generate");
  await page
    .getByLabel("Resume Title", { exact: true })
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
    .getByLabel("Professional Summary", { exact: true })
    .fill("Software engineer building reliable applications.");
  await page.getByRole("button", { name: "Save Changes", exact: true }).click();
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
