import { readFile } from "node:fs/promises";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { resumeUploads, skills } from "../../src/lib/db/schema";
import { test, expect } from "./support/fixtures";
import {
  expectedFail,
  listGet,
  revokeSessions,
  sectionButton,
  sectionIndex,
} from "./support/helpers";
import { resumeUploadsResponseSchema } from "../../src/app/api/profile/resume-uploads/validators";

test("seeded personal information populates inputs and edits survive reload", async ({
  page,
}) => {
  await page.goto("/dashboard/profile");
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  const form = page.getByRole("dialog", { name: "Edit profile" });
  await expect(form.getByLabel("First name", { exact: true })).toHaveValue(
    "Alex",
  );
  await expect(form.getByLabel("Email", { exact: true })).toHaveValue(
    "alex@example.test",
  );
  await form.getByLabel("First name", { exact: true }).fill("Taylor");
  await form
    .getByLabel("Professional summary", { exact: true })
    .fill("Engineer building dependable software.");
  await form.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(form).not.toBeVisible();
  await expect(page.getByText("Taylor Example", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await expect(form.getByLabel("First name", { exact: true })).toHaveValue(
    "Taylor",
  );
  await expect(
    form.getByLabel("Professional summary", { exact: true }),
  ).toHaveValue("Engineer building dependable software.");
});

test("create, edit, and delete a skill", async ({ page }) => {
  await page.goto("/dashboard/profile");
  await page.getByRole("button", { name: /^Skills/ }).click();
  await page.getByRole("button", { name: "Add skill", exact: true }).click();
  await page.getByLabel("Skill name *", { exact: true }).fill("PostgreSQL");
  await page.getByLabel("Category *", { exact: true }).click();
  await page.getByRole("option", { name: "Technical", exact: true }).click();
  await page.getByLabel("Years of experience").fill("3");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByText("PostgreSQL", { exact: true })).toBeVisible();
  await page.getByText("PostgreSQL", { exact: true }).hover();
  await page
    .getByRole("button", { name: "Edit PostgreSQL", exact: true })
    .click();
  await expect(page.getByLabel("Skill name *", { exact: true })).toHaveValue(
    "PostgreSQL",
  );
  await page.getByLabel("Skill name *", { exact: true }).fill("PostgreSQL 18");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: /^Skills/ }).click();
  await expect(page.getByText("PostgreSQL 18", { exact: true })).toBeVisible();
  await page.getByText("PostgreSQL 18", { exact: true }).hover();
  await page
    .getByRole("button", { name: "Delete PostgreSQL 18", exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await expect(
    page.getByText("PostgreSQL 18", { exact: true }),
  ).not.toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: /^Skills/ }).click();
  await expect(
    page.getByText("PostgreSQL 18", { exact: true }),
  ).not.toBeVisible();
});

test("imported entries show their details before saving", async ({ page }) => {
  // Stubbed in the browser so the review UI is covered without Groq or OCR.
  await page.route("**/api/profile/resume-import", (route) =>
    route.fulfill({
      json: {
        profile: {
          firstName: "Alex",
          lastName: "Example",
          email: "alex@example.test",
          phone: null,
          address: null,
          city: null,
          state: null,
          zipCode: null,
          country: null,
          linkedinUrl: null,
          githubUrl: null,
          portfolioUrl: null,
          professionalSummary: null,
        },
        workExperiences: [
          {
            jobTitle: "Staff Engineer",
            company: "Imported Labs",
            location: "Remote",
            startDate: "2021-03",
            endDate: "2023-06",
            isCurrent: false,
            description:
              "Led the billing platform rewrite.\nCut invoice latency by 40%.\nMentored four engineers.\nRan the on-call rotation.",
            technologies: ["Go", "Kafka"],
          },
        ],
        education: [
          {
            degree: "MSc Data Science",
            fieldOfStudy: null,
            institution: "Imported University",
            location: "London",
            startDate: "2018-08",
            endDate: "2020-05",
            gpa: "3.9/4.0",
            honors: "Distinction",
            relevantCoursework: ["Machine Learning", "Statistics"],
          },
        ],
        skills: [],
        projects: [],
        certifications: [],
        achievements: [],
        references: [],
        markdown: null,
        warnings: [],
      },
    }),
  );

  await page.goto("/dashboard/profile");
  await page.locator('input[type="file"]').setInputFiles({
    name: "resume.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Synthetic resume"),
  });
  const pending = page
    .locator("section")
    .filter({ hasText: "from your imported resume" });

  await page.getByRole("button", { name: /^Work experience/ }).click();
  await expect(
    pending.getByRole("heading", { name: "Staff Engineer", level: 4 }),
  ).toBeVisible();
  await expect(
    pending.getByText("Imported Labs", { exact: true }),
  ).toBeVisible();
  await expect(
    pending.getByText("Mar 2021 to Jun 2023", { exact: true }),
  ).toBeVisible();
  await expect(pending.getByText("Remote", { exact: true })).toBeVisible();
  const description = pending.getByText("Ran the on-call rotation.");
  await expect(description).toBeVisible();
  await expect(description).toContainText("Led the billing platform rewrite.");
  // Saved rows clamp long descriptions; the review must not.
  await expect(description).not.toHaveClass(/line-clamp/);
  await expect(pending.getByText("Go", { exact: true })).toBeVisible();
  await expect(pending.getByText("Kafka", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: /^Education/ }).click();
  await expect(
    pending.getByRole("heading", { name: "MSc Data Science", level: 4 }),
  ).toBeVisible();
  await expect(
    pending.getByText("Imported University", { exact: true }),
  ).toBeVisible();
  await expect(
    pending.getByText("Aug 2018 to May 2020", { exact: true }),
  ).toBeVisible();
  await expect(pending.getByText("London", { exact: true })).toBeVisible();
  await expect(pending.getByText("GPA 3.9/4.0", { exact: true })).toBeVisible();
  await expect(pending.getByText("Distinction", { exact: true })).toBeVisible();
  await expect(
    pending.getByText("Coursework: Machine Learning, Statistics", {
      exact: true,
    }),
  ).toBeVisible();

  await pending.getByRole("button", { name: "Save", exact: true }).click();
  await expect(pending).not.toBeVisible();
  await expect(
    page.getByRole("heading", { name: "MSc Data Science", level: 3 }),
  ).toBeVisible();
});

test("an imported file is kept in storage and can be downloaded and deleted", async ({
  page,
  request,
  candidate,
  database,
  createCandidate,
  browser,
  extraHTTPHeaders,
  baseURL,
}) => {
  const original = Buffer.from(
    "Alex Example\nalex@example.test\nSoftware Engineer at Example Co\n",
  );
  const listed = async () => {
    const response = await request.get("/api/profile/resume-uploads");
    expect(response.status()).toBe(200);
    const raw: unknown = await response.json();
    return resumeUploadsResponseSchema.parse(raw);
  };
  expect(await listed()).toEqual({ available: true, files: [] });

  // This import reaches the real route. The AI provider is out of reach here,
  // so the details come from basic extraction; the file is kept either way.
  await page.goto("/dashboard/profile");
  await page.locator('input[type="file"]').setInputFiles({
    name: "Alex résumé.txt",
    mimeType: "text/plain",
    buffer: original,
  });
  await expect(
    page.getByText("Resume imported. Review each section before saving."),
  ).toBeVisible({ timeout: 30_000 });

  await page.getByRole("button", { name: /^Imported files/ }).click();
  await expect(
    page.getByRole("heading", { name: "Alex résumé.txt", level: 3 }),
  ).toBeVisible();
  const [file] = (await listed()).files;
  expect(file).toMatchObject({
    fileName: "Alex résumé.txt",
    mimeType: "text/plain",
    sizeBytes: original.byteLength,
  });

  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download Alex résumé.txt", exact: true })
    .click();
  const download = await downloadPromise;
  // The name is not checked: the object URL is revoked as soon as the link is
  // clicked, so Chromium sometimes names the file by its blob id.
  expect((await readFile(await download.path())).equals(original)).toBe(true);

  const other = await createCandidate();
  const context = await browser.newContext({
    baseURL,
    storageState: other.storageState,
    extraHTTPHeaders,
  });
  try {
    const path = `/api/profile/resume-uploads/${file?.id ?? ""}`;
    expect((await context.request.get(path)).status()).toBe(404);
    expect((await context.request.delete(path)).status()).toBe(404);
  } finally {
    await context.close();
  }

  // A record whose file has gone says so at once. This is the request that
  // gets "not found" from the storage server itself; reading that answer the
  // wrong way once held the response until the storage timeout.
  const fileId = file?.id ?? "";
  const storageKey = `users/${candidate.id}/uploads/${fileId}`;
  await database
    .update(resumeUploads)
    .set({ storageKey: `${storageKey}-gone` })
    .where(eq(resumeUploads.id, fileId));
  const gone = await request.get(`/api/profile/resume-uploads/${fileId}`, {
    timeout: 5_000,
  });
  expect(gone.status()).toBe(404);
  expect(await gone.json()).toEqual({
    error:
      "This file is no longer in storage. Delete it from the list and import it again.",
  });
  await database
    .update(resumeUploads)
    .set({ storageKey })
    .where(eq(resumeUploads.id, fileId));

  await page
    .getByRole("button", { name: "Delete Alex résumé.txt", exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await expect(page.getByText("File deleted", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "No imported files yet" }),
  ).toBeVisible();
  expect((await listed()).files).toEqual([]);
  expect(
    (
      await request.get(`/api/profile/resume-uploads/${file?.id ?? ""}`)
    ).status(),
  ).toBe(404);
});

const INVALID_RESPONSE =
  "Received an invalid server response. Please try again.";

test.describe(
  "Profile page shell: sections, persistence and load errors",
  { tag: "@profile-shell" },
  () => {
    test("the index switches sections, counts entries and keeps the choice across a reload", async ({
      page,
    }) => {
      await page.goto("/dashboard/profile");
      const main = page.getByRole("main");
      await expect(
        main.getByRole("heading", { name: "Profile", level: 1 }),
      ).toBeVisible();
      await expect(
        main.getByText(
          "Everything you might put on a resume, kept in one place. Each resume draws from it.",
          { exact: true },
        ),
      ).toBeVisible();
      const personal = sectionIndex(page).getByRole("button", {
        name: "Personal information",
        exact: true,
      });
      await expect(personal).toHaveAttribute("aria-current", "true");
      await expect(
        main.getByRole("heading", {
          name: "Personal information",
          level: 2,
          exact: true,
        }),
      ).toBeVisible();
      await expect(sectionButton(page, "Work experience")).toHaveText(
        /^Work experience\s*1$/,
      );
      await expect(sectionButton(page, "Education")).toHaveText(
        /^Education\s*1$/,
      );
      await expect(sectionButton(page, "Skills")).toHaveText(/^Skills\s*1$/);

      await sectionButton(page, "Work experience").click();
      await expect(sectionButton(page, "Work experience")).toHaveAttribute(
        "aria-current",
        "true",
      );
      await expect(personal).not.toHaveAttribute("aria-current");
      await expect(
        main.getByRole("heading", {
          name: "Work experience",
          level: 2,
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        main.getByRole("heading", { name: "Software Engineer", level: 3 }),
      ).toBeVisible();

      await sectionButton(page, "Education").click();
      await expect(
        main.getByRole("heading", { name: "Education", level: 2, exact: true }),
      ).toBeVisible();
      await sectionButton(page, "Skills").click();
      await expect(sectionButton(page, "Skills")).toHaveAttribute(
        "aria-current",
        "true",
      );
      await expect(
        main.getByRole("heading", { name: "Skills", level: 2, exact: true }),
      ).toBeVisible();

      // An open sheet is not part of the stored state, so a reload closes it.
      await page
        .getByRole("button", { name: "Add skill", exact: true })
        .click();
      await expect(
        page.getByRole("dialog", { name: "Add skill" }),
      ).toBeVisible();
      await page.reload();
      await expect(
        main.getByRole("heading", { name: "Skills", level: 2, exact: true }),
      ).toBeVisible();
      await expect(sectionButton(page, "Skills")).toHaveAttribute(
        "aria-current",
        "true",
      );
      await expect(page.getByRole("dialog")).toHaveCount(0);
    });

    test("Generate resume opens the profile generator", async ({ page }) => {
      await page.goto("/dashboard/profile");
      await page
        .getByRole("main")
        .getByRole("link", { name: "Generate resume", exact: true })
        .click();
      await expect(page).toHaveURL(/\/dashboard\/resumes\/generate$/);
    });

    test("a rejected list request replaces the page with the error, and Try again recovers", async ({
      page,
    }) => {
      const skillsList = listGet("/api/profile/skills");
      await page.route(skillsList, (route) =>
        route.request().method() === "GET"
          ? route.fulfill({
              status: 403,
              json: { error: "Stubbed skills failure" },
            })
          : route.fallback(),
      );
      await page.goto("/dashboard/profile");
      const main = page.getByRole("main");
      const notice = main.getByRole("alert");
      await expect(notice).toContainText("Your profile didn't load");
      await expect(notice).toContainText("Stubbed skills failure");
      await expect(
        main.getByRole("heading", { name: "Profile", level: 1 }),
      ).toBeVisible();
      await expect(sectionIndex(page)).toHaveCount(0);

      await page.unroute(skillsList);
      await notice
        .getByRole("button", { name: "Try again", exact: true })
        .click();
      await expect(sectionIndex(page)).toBeVisible();
      await expect(
        main.getByRole("heading", {
          name: "Personal information",
          level: 2,
          exact: true,
        }),
      ).toBeVisible();
      await expect(notice).toHaveCount(0);
    });

    test("a failed profile request shows its message instead of the page", async ({
      page,
    }) => {
      await page.route(listGet("/api/profile"), (route) =>
        route.request().method() === "GET"
          ? route.fulfill({
              status: 400,
              json: { error: "Profile unavailable" },
            })
          : route.fallback(),
      );
      await page.goto("/dashboard/profile");
      const notice = page.getByRole("main").getByRole("alert");
      await expect(notice).toContainText("Your profile didn't load");
      await expect(notice).toContainText("Profile unavailable");
      await expect(sectionIndex(page)).toHaveCount(0);
    });

    test("a malformed list response is reported at once", async ({ page }) => {
      await page.route(listGet("/api/profile/education"), (route) =>
        route.request().method() === "GET"
          ? route.fulfill({ json: [{ foo: 1 }] })
          : route.fallback(),
      );
      await page.goto("/dashboard/profile");
      const notice = page.getByRole("main").getByRole("alert");
      await expect(notice).toContainText("Your profile didn't load");
      await expect(notice).toContainText(INVALID_RESPONSE);
    });

    test("a server error is retried before the error is shown", async ({
      page,
    }) => {
      let attempts = 0;
      await page.route(listGet("/api/profile/work-experiences"), (route) => {
        if (route.request().method() !== "GET") return route.fallback();
        attempts += 1;
        return route.fulfill({ status: 500 });
      });
      await page.goto("/dashboard/profile");
      const notice = page.getByRole("main").getByRole("alert");
      // An empty 500 has no message of its own, so the query's fallback shows.
      await expect(notice).toContainText("Failed to fetch work experiences", {
        timeout: 20_000,
      });
      expect(attempts).toBe(4);
    });

    test("a stored skill category the form does not offer still lets the page load", async ({
      page,
      database,
      candidate,
    }) => {
      // The column has no CHECK constraint, so older or imported rows can hold this.
      await database
        .update(skills)
        .set({ category: sql`'hobby'` })
        .where(eq(skills.userId, candidate.id));
      const listed = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === "/api/profile/skills" &&
          response.request().method() === "GET",
      );
      await page.goto("/dashboard/profile");
      const response = await listed;
      expect(response.status()).toBe(200);
      const raw: unknown = await response.json();
      expect(
        z
          .array(z.object({ category: z.string() }))
          .parse(raw)
          .map((skill) => skill.category),
      ).toEqual(["hobby"]);
      expectedFail(
        'src/app/api/profile/validators.ts:261: the client parses skills with the form\'s category enum, so one stored "hobby" fails the skills query and the whole page shows "Your profile didn\'t load"',
      );
      await expect(sectionIndex(page)).toBeVisible({ timeout: 5_000 });
      await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
    });

    test("a session revoked elsewhere sends the next visit to sign in", async ({
      page,
      request,
      database,
      candidate,
    }) => {
      await page.goto("/dashboard/profile");
      await expect(sectionIndex(page)).toBeVisible();
      await revokeSessions(database, candidate.id);
      await page.reload();
      await expect(page).toHaveURL(/\/sign-in$/);
      const response = await request.get("/api/profile");
      expect(response.status()).toBe(401);
      expect(await response.json()).toEqual({ error: "Unauthorized" });
    });
  },
);
