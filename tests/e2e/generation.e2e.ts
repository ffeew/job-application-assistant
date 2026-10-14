import { test, expect } from "./support/fixtures";
import {
  generationJobResponseSchema,
  latestGenerationJobSchema,
} from "../../src/app/api/resume-generation/jobs/validators";
import { resumeJsonResponseSchema } from "../../src/app/api/resumes/validators";
import { parseGeneratedResume } from "../../src/lib/resume-document";
import type { APIRequestContext, Page } from "@playwright/test";
import { eq } from "drizzle-orm";
import { resumes } from "../../src/lib/db/schema";
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
  await page.getByLabel("Resume title", { exact: true }).fill(title);
  await page.getByLabel("Match content to the job description", { exact: true }).uncheck();
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
