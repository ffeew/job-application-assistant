import { test, expect } from "./support/fixtures";

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
  await page
    .getByRole("option", { name: "Technical", exact: true })
    .click();
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
  await expect(pending.getByText("Imported Labs", { exact: true })).toBeVisible();
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
