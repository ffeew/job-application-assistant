import type { Page } from "@playwright/test";
import { eq } from "drizzle-orm";
import { resumes } from "../../src/lib/db/schema";
import { resumeUploadsResponseSchema } from "../../src/app/api/profile/resume-uploads/validators";
import { latestGenerationJobSchema } from "../../src/app/api/resume-generation/jobs/validators";
import { test, expect } from "./support/fixtures";
import {
  importReply,
  importResume,
  sectionButton,
  seedGeneratedResume,
} from "./support/helpers";

// Each test waits out a storage (15 s) or compiler (25 s) deadline.
test.slow();

const IMPORTED = "Resume imported. Review each section before saving.";
const NOT_KEPT =
  "The original file couldn't be kept, so it is not listed under imported files. Everything read from it is still here.";
const RESUME = {
  name: "resume.txt",
  mimeType: "text/plain",
  buffer: Buffer.from("Alex Example\nalex@example.test\n+65 6123 4567\n"),
};

function toast(page: Page, text: string) {
  return page
    .getByRole("region", { name: /^Notifications/ })
    .getByText(text, { exact: true });
}

test.describe("File storage is down", { tag: "@outages" }, () => {
  test(
    "an import still fills the review and says the original wasn't kept",
    { tag: "@resume-import-real" },
    async ({ page, request, ai, outage }) => {
      ai.reply(importReply());
      await page.goto("/dashboard/profile");
      await outage.pause("storage");
      await importResume(page, RESUME);
      await expect(toast(page, IMPORTED)).toBeVisible({ timeout: 30_000 });
      await expect(
        page.getByRole("main").getByText(NOT_KEPT, { exact: true }),
      ).toBeVisible();
      const listed = await request.get("/api/profile/resume-uploads");
      const raw: unknown = await listed.json();
      expect(resumeUploadsResponseSchema.parse(raw).files).toEqual([]);
    },
  );

  test(
    "downloading and deleting a kept file say storage is unavailable",
    { tag: "@imported-files" },
    async ({ page, ai, outage }) => {
      ai.reply(importReply());
      await page.goto("/dashboard/profile");
      await importResume(page, RESUME);
      await expect(toast(page, IMPORTED)).toBeVisible({ timeout: 30_000 });
      await sectionButton(page, "Imported files").click();
      const main = page.getByRole("main");
      await expect(
        main.getByRole("heading", { name: "resume.txt", level: 3 }),
      ).toBeVisible();

      await outage.pause("storage");
      await page
        .getByRole("button", { name: "Download resume.txt", exact: true })
        .click();
      await expect(
        toast(page, "File storage is unavailable. Try again in a moment."),
      ).toBeVisible({ timeout: 25_000 });
      await page
        .getByRole("button", { name: "Delete resume.txt", exact: true })
        .click();
      await page
        .getByRole("alertdialog")
        .getByRole("button", { name: "Delete", exact: true })
        .click();
      await expect(
        toast(
          page,
          "The stored file couldn't be deleted. Try again in a moment.",
        ),
      ).toBeVisible({ timeout: 25_000 });
      await expect(
        main.getByRole("heading", { name: "resume.txt", level: 3 }),
      ).toBeVisible();
    },
  );

  test(
    "a saved resume is still shown, compiled again, when its PDF can't be stored",
    { tag: "@resume-stored-view" },
    async ({ page, request, database, outage }) => {
      const resume = await seedGeneratedResume(request, {
        title: "Unstored E2E",
      });
      await outage.pause("storage");
      await page.goto(`/dashboard/resumes/${resume.id}`);
      await expect(page.getByTitle("Resume PDF preview")).toHaveAttribute(
        "src",
        /^blob:/,
        { timeout: 45_000 },
      );
      const [row] = await database
        .select({ pdfKey: resumes.pdfKey })
        .from(resumes)
        .where(eq(resumes.id, resume.id));
      expect(row?.pdfKey).toBeNull();
    },
  );
});

test.describe("The LaTeX compiler is down", { tag: "@outages" }, () => {
  test(
    "a preview fails with the compiler's outage message",
    { tag: "@generation-job-lifecycle" },
    async ({ page, request, worker, outage }) => {
      await worker.start();
      await outage.pause("compiler");
      await page.goto("/dashboard/resumes/generate");
      await page
        .getByLabel("Resume title", { exact: true })
        .fill("Compiler Down E2E");
      await page.getByRole("button", { name: "Preview", exact: true }).click();
      const message =
        "The LaTeX compiler is unavailable or took too long. Please retry.";
      await expect(
        page.getByRole("main").getByText(message, { exact: true }),
      ).toBeVisible({ timeout: 45_000 });
      const response = await request.get("/api/resume-generation/jobs");
      const raw: unknown = await response.json();
      expect(latestGenerationJobSchema.parse(raw)).toMatchObject({
        status: "failed",
        error: message,
      });
      await expect(
        page.getByRole("button", { name: "Preview", exact: true }),
      ).toBeEnabled();
    },
  );
});
