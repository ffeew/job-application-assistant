import type { Page } from "@playwright/test";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { jobApplications } from "../../src/lib/db/schema";
import { test, expect } from "./support/fixtures";
import {
  expectedFail,
  responseTo,
  sectionButton,
  seedGeneratedResume,
} from "./support/helpers";

function nav(page: Page) {
  return page.getByRole("navigation", { name: "Main" });
}

function navTo(page: Page, name: string) {
  return nav(page).getByRole("link", { name, exact: true }).click();
}

function row(page: Page, text: string) {
  return page
    .getByRole("main")
    .getByRole("listitem")
    .filter({ has: page.getByText(text, { exact: true }) });
}

function toast(page: Page, text: string) {
  return page
    .getByRole("region", { name: /^Notifications/ })
    .getByText(text, { exact: true });
}

const idSchema = z.object({ id: z.string() });

test.describe(
  "Cached data across client-side navigation",
  { tag: "@GAP-cross-page-cache-staleness" },
  () => {
    test("adding a job description is seen by the tailor page", async ({
      page,
      request,
    }) => {
      const created = await request.post("/api/applications", {
        data: { company: "No JD Co", position: "Analyst" },
      });
      expect(created.status()).toBe(201);
      await page.goto("/dashboard/applications");
      await row(page, "No JD Co")
        .getByRole("link", { name: "Tailor resume", exact: true })
        .click();
      await expect(
        page.getByRole("main").getByText("No job description", { exact: true }),
      ).toBeVisible();
      await page
        .getByRole("link", { name: "Add the job description", exact: true })
        .click();
      await page
        .getByLabel("Job description", { exact: true })
        .fill("Analyse product data.");
      await page
        .getByRole("button", { name: "Save changes", exact: true })
        .click();
      await expect(toast(page, "Changes saved")).toBeVisible();
      await row(page, "No JD Co")
        .getByRole("link", { name: "Tailor resume", exact: true })
        .click();
      // The stale notice proves the cached info was served.
      await expect(
        page.getByRole("main").getByText("No job description", { exact: true }),
      ).toBeVisible();
      expectedFail(
        "src/app/dashboard/applications/mutations/use-update-application.ts:43: an update never invalidates the tailor page's application info, so the cached 'no job description' is reused for five minutes",
      );
      await expect(
        page.getByLabel("Match content to the job description", {
          exact: true,
        }),
      ).toBeVisible({ timeout: 2_000 });
    });

    test("a renamed position is shown on the tailor page", async ({
      page,
      candidate,
    }) => {
      const id = candidate.applicationId;
      await page.goto(`/dashboard/applications/${id}/resume`);
      await expect(
        page.getByText("Software Engineer at Example Industries", {
          exact: true,
        }),
      ).toBeVisible();
      await page
        .getByRole("main")
        .getByRole("link", { name: "Application", exact: true })
        .click();
      await page
        .getByLabel("Position *", { exact: true })
        .fill("Staff Engineer");
      await page
        .getByRole("button", { name: "Save changes", exact: true })
        .click();
      await expect(toast(page, "Changes saved")).toBeVisible();
      await row(page, "Example Industries")
        .getByRole("link", { name: "Tailor resume", exact: true })
        .click();
      await expect(
        page.getByText("Software Engineer at Example Industries", {
          exact: true,
        }),
      ).toBeVisible();
      expectedFail(
        "src/app/dashboard/applications/mutations/use-update-application.ts:43: an update never invalidates the tailor page's application info, so the old position stays in its header",
      );
      await expect(
        page.getByText("Staff Engineer at Example Industries", { exact: true }),
      ).toBeVisible({ timeout: 2_000 });
    });

    test("a skill added in the profile is counted by the generator", async ({
      page,
    }) => {
      await page.goto("/dashboard/resumes/generate");
      const skillsRow = page
        .getByRole("group", { name: "Sections to include" })
        .getByRole("listitem")
        .filter({ has: page.getByText("Skills", { exact: true }) });
      await expect(skillsRow).toContainText("1");
      await navTo(page, "Profile");
      await sectionButton(page, "Skills").click();
      await page
        .getByRole("main")
        .getByRole("button", { name: "Add skill", exact: true })
        .click();
      await page.getByLabel("Skill name *", { exact: true }).fill("Go");
      await page.getByLabel("Category *", { exact: true }).click();
      await page
        .getByRole("option", { name: "Technical", exact: true })
        .click();
      await page
        .getByRole("dialog", { name: "Add skill" })
        .getByRole("button", { name: "Save", exact: true })
        .click();
      await expect(toast(page, "Skill saved")).toBeVisible();
      await page
        .getByRole("main")
        .getByRole("link", { name: "Generate resume", exact: true })
        .click();
      await expect(skillsRow).toContainText("1");
      expectedFail(
        "src/app/dashboard/resumes/queries/use-resume-data.ts:25: no profile mutation invalidates the generator's resume data, so its counts stay as they were for five minutes",
      );
      await expect(skillsRow).toContainText("2", { timeout: 2_000 });
    });

    test("a deleted tailored resume no longer counts as saved for its application", async ({
      page,
      request,
      candidate,
    }) => {
      const id = candidate.applicationId;
      await seedGeneratedResume(request, {
        title: "Seeded tailored",
        jobApplicationId: id,
      });
      const notice =
        "A resume is already saved for this application. Saving again replaces it.";
      await page.goto(`/dashboard/applications/${id}/resume`);
      await expect(page.getByText(notice, { exact: true })).toBeVisible();
      await navTo(page, "Resumes");
      await page
        .getByRole("button", { name: "Delete Seeded tailored", exact: true })
        .click();
      await page
        .getByRole("alertdialog")
        .getByRole("button", { name: "Delete", exact: true })
        .click();
      await expect(toast(page, "Resume deleted")).toBeVisible();
      await navTo(page, "Applications");
      await row(page, "Example Industries")
        .getByRole("link", { name: "Tailor resume", exact: true })
        .click();
      await expect(page.getByText(notice, { exact: true })).toBeVisible();
      expectedFail(
        "src/app/dashboard/resumes/mutations/use-delete-resume.ts:24: deleting a resume does not invalidate the tailor page's application info, so its 'already saved' notice stays",
      );
      await expect(page.getByText(notice, { exact: true })).toHaveCount(0, {
        timeout: 2_000,
      });
      await expect(
        page.getByLabel("Resume title", { exact: true }),
      ).toBeVisible();
    });

    test("a renamed profile reaches the conversation starters page", async ({
      page,
    }) => {
      await page.goto("/dashboard/conversation-starters");
      await expect(
        page.getByText(
          "Your saved profile (Alex Example) is used to introduce you.",
        ),
      ).toBeVisible();
      await navTo(page, "Profile");
      await page.getByRole("button", { name: "Edit", exact: true }).click();
      await page.getByLabel("First name", { exact: true }).fill("Jordan");
      await page
        .getByRole("button", { name: "Save changes", exact: true })
        .click();
      await expect(toast(page, "Changes saved")).toBeVisible();
      await navTo(page, "Conversation starters");
      await expect(
        page.getByText(
          "Your saved profile (Jordan Example) is used to introduce you.",
        ),
      ).toBeVisible();
    });

    test("a new application can be picked for a cover letter", async ({
      page,
    }) => {
      await page.goto("/dashboard/cover-letters/new");
      await expect(page.getByLabel("Company *", { exact: true })).toBeVisible();
      await navTo(page, "Applications");
      await page
        .getByRole("main")
        .getByRole("link", { name: "Add application", exact: true })
        .click();
      await page.getByLabel("Company *", { exact: true }).fill("Northwind");
      await page
        .getByLabel("Position *", { exact: true })
        .fill("Data Engineer");
      await page
        .getByRole("button", { name: "Save application", exact: true })
        .click();
      await expect(toast(page, "Application saved")).toBeVisible();
      await navTo(page, "Cover letters");
      await page
        .getByRole("main")
        .getByRole("link", { name: "Write cover letter" })
        .first()
        .click();
      await page.getByLabel("Application", { exact: true }).click();
      await expect(
        page.getByRole("option", {
          name: "Data Engineer at Northwind",
          exact: true,
        }),
      ).toBeVisible();
    });
  },
);

test.describe(
  "Back and Forward after changes",
  { tag: "@GAP-back-forward-history" },
  () => {
    test("Back to a deleted letter says it didn't load, and Forward lists without it", async ({
      page,
      request,
    }) => {
      const letter = await request.post("/api/cover-letters", {
        data: { title: "Back Test Letter", content: "Dear team" },
      });
      expect(letter.status()).toBe(201);
      const letterRaw: unknown = await letter.json();
      const id = idSchema.parse(letterRaw).id;
      await page.goto("/dashboard/cover-letters");
      await row(page, "Back Test Letter")
        .getByRole("link", { name: "Open", exact: true })
        .click();
      await expect(page).toHaveURL(`/dashboard/cover-letters/${id}`);
      await page.getByRole("button", { name: "Delete", exact: true }).click();
      await page
        .getByRole("alertdialog")
        .getByRole("button", { name: "Delete", exact: true })
        .click();
      await expect(toast(page, "Cover letter deleted")).toBeVisible();
      await expect(page).toHaveURL(/\/dashboard\/cover-letters$/);
      await page.goBack();
      await expect(page).toHaveURL(`/dashboard/cover-letters/${id}`);
      await expect(page.getByRole("main").getByRole("alert")).toContainText(
        "This cover letter didn't load",
      );
      await page.goForward();
      await expect(page).toHaveURL(/\/dashboard\/cover-letters$/);
      await expect(
        page.getByRole("heading", { name: "No cover letters yet" }),
      ).toBeVisible();
    });

    test("Back after creating an application shows a blank form and sends nothing", async ({
      page,
      database,
    }) => {
      await page.goto("/dashboard/applications/new");
      await page.getByLabel("Company *", { exact: true }).fill("Northwind");
      await page
        .getByLabel("Position *", { exact: true })
        .fill("Data Engineer");
      await page
        .getByRole("button", { name: "Save application", exact: true })
        .click();
      await expect(toast(page, "Application saved")).toBeVisible();
      await page.goBack();
      await expect(page).toHaveURL(/\/dashboard\/applications\/new$/);
      await expect(page.getByLabel("Company *", { exact: true })).toHaveValue(
        "",
      );
      await expect(
        page.getByLabel("Date applied", { exact: true }),
      ).toHaveValue(new Date().toISOString().slice(0, 10));
      expect(
        await database
          .select({ id: jobApplications.id })
          .from(jobApplications)
          .where(eq(jobApplications.company, "Northwind")),
      ).toHaveLength(1);
    });

    test("Back after an edit shows the saved values", async ({
      page,
      candidate,
    }) => {
      await page.goto(`/dashboard/applications/${candidate.applicationId}`);
      await expect(page.getByLabel("Company *", { exact: true })).toHaveValue(
        "Example Industries",
      );
      await page.getByLabel("Status", { exact: true }).click();
      await page
        .getByRole("option", { name: "Interviewing", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Save changes", exact: true })
        .click();
      await expect(page).toHaveURL(/\/dashboard\/applications$/);
      await page.goBack();
      await expect(page.getByLabel("Status", { exact: true })).toHaveText(
        "Interviewing",
      );
    });

    test("Back to a deleted application's edit page says it didn't load", async ({
      page,
      candidate,
    }) => {
      await page.goto(`/dashboard/applications/${candidate.applicationId}`);
      await expect(page.getByLabel("Company *", { exact: true })).toHaveValue(
        "Example Industries",
      );
      await page
        .getByRole("main")
        .getByRole("link", { name: "Applications", exact: true })
        .click();
      await page
        .getByRole("button", {
          name: "Delete application at Example Industries",
          exact: true,
        })
        .click();
      await page
        .getByRole("alertdialog")
        .getByRole("button", { name: "Delete", exact: true })
        .click();
      await expect(toast(page, "Application deleted")).toBeVisible();
      await page.goBack();
      await expect(page.getByRole("main").getByRole("alert")).toContainText(
        "This application didn't load",
      );
    });

    test(
      "Back to a deleted application's tailor page says it didn't load",
      { tag: "@GAP-delete-application-side-effects" },
      async ({ page, candidate }) => {
        await page.goto(
          `/dashboard/applications/${candidate.applicationId}/resume`,
        );
        await expect(
          page.getByRole("heading", { name: "Tailor resume", level: 1 }),
        ).toBeVisible();
        await navTo(page, "Applications");
        await page
          .getByRole("button", {
            name: "Delete application at Example Industries",
            exact: true,
          })
          .click();
        await page
          .getByRole("alertdialog")
          .getByRole("button", { name: "Delete", exact: true })
          .click();
        await expect(toast(page, "Application deleted")).toBeVisible();
        await page.goBack();
        await expect(
          page.getByText("Software Engineer at Example Industries", {
            exact: true,
          }),
        ).toBeVisible();
        expectedFail(
          "src/app/dashboard/applications/mutations/use-delete-application.ts:25: deleting an application does not remove its cached tailor info, so Back shows the full form",
        );
        await expect(page.getByRole("main").getByRole("alert")).toContainText(
          "This application didn't load",
          { timeout: 2_000 },
        );
      },
    );

    test(
      "a saved resume whose application was deleted offers the profile generator",
      { tag: "@GAP-delete-application-side-effects" },
      async ({ page, request, candidate }) => {
        const resume = await seedGeneratedResume(request, {
          title: "Linked Resume",
          jobApplicationId: candidate.applicationId,
        });
        await page.goto(`/dashboard/resumes/${resume.id}`);
        const again = page.getByRole("link", {
          name: "Generate again",
          exact: true,
        });
        await expect(again).toHaveAttribute(
          "href",
          `/dashboard/applications/${candidate.applicationId}/resume`,
        );
        await navTo(page, "Applications");
        await page
          .getByRole("button", {
            name: "Delete application at Example Industries",
            exact: true,
          })
          .click();
        await page
          .getByRole("alertdialog")
          .getByRole("button", { name: "Delete", exact: true })
          .click();
        await expect(toast(page, "Application deleted")).toBeVisible();
        await navTo(page, "Resumes");
        await row(page, "Linked Resume")
          .getByRole("link", { name: "Open", exact: true })
          .click();
        await expect(
          page.getByRole("heading", { name: "Linked Resume", level: 1 }),
        ).toBeVisible();
        expectedFail(
          "src/app/dashboard/applications/mutations/use-delete-application.ts:25: deleting an application leaves its resumes' cached details, so Generate again still points at the deleted application",
        );
        await expect(again).toHaveAttribute(
          "href",
          "/dashboard/resumes/generate",
          { timeout: 2_000 },
        );
      },
    );

    test("the profile section is not part of the address but comes back on return", async ({
      page,
    }) => {
      await page.goto("/dashboard");
      await navTo(page, "Profile");
      await sectionButton(page, "Skills").click();
      await sectionButton(page, "Projects").click();
      await page.goBack();
      await expect(page).toHaveURL(/\/dashboard$/);
      await page.goForward();
      await expect(sectionButton(page, "Projects")).toHaveAttribute(
        "aria-current",
        "true",
      );
    });
  },
);

test.describe(
  "Losing and regaining the network",
  { tag: "@GAP-offline-reconnect" },
  () => {
    test("a list that failed offline loads by itself when the network returns", async ({
      page,
      context,
    }) => {
      const matcher = (url: URL) => url.pathname === "/api/applications";
      await page.route(matcher, (route) => route.abort("internetdisconnected"));
      await page.goto("/dashboard/applications");
      // A dropped connection is retried, so the error appears after the backoff.
      await expect(page.getByRole("main").getByRole("alert")).toContainText(
        "Your applications didn't load",
        { timeout: 20_000 },
      );
      await page.unroute(matcher);
      await context.setOffline(true);
      await context.setOffline(false);
      await expect(row(page, "Example Industries")).toBeVisible();
    });

    test("a delete made offline waits and is sent on reconnect", async ({
      page,
      context,
    }) => {
      await page.goto("/dashboard/applications");
      await expect(row(page, "Example Industries")).toBeVisible();
      await context.setOffline(true);
      const trash = page.getByRole("button", {
        name: "Delete application at Example Industries",
        exact: true,
      });
      await trash.click();
      await page
        .getByRole("alertdialog")
        .getByRole("button", { name: "Delete", exact: true })
        .click();
      await expect(page.getByRole("alertdialog")).toBeHidden();
      await expect(trash).toBeDisabled();
      await expect(row(page, "Example Industries")).toBeVisible();
      await expect(toast(page, "Application deleted")).toHaveCount(0);
      const deleted = responseTo(page, "DELETE", /\/api\/applications\/.+/);
      await context.setOffline(false);
      expect((await deleted).status()).toBe(200);
      await expect(toast(page, "Application deleted")).toBeVisible();
      await expect(row(page, "Example Industries")).toHaveCount(0);
    });
  },
);

test.describe("Dates in another time zone", { tag: "@GAP-time-locale" }, () => {
  test.use({ timezoneId: "America/Los_Angeles", locale: "en-US" });

  test("a date applied stays the day that was picked", async ({
    page,
    request,
  }) => {
    await page.goto("/dashboard/applications/new");
    await page.getByLabel("Company *", { exact: true }).fill("Pacific Co");
    await page.getByLabel("Position *", { exact: true }).fill("Engineer");
    await page.getByLabel("Date applied", { exact: true }).fill("2026-03-01");
    const created = responseTo(page, "POST", "/api/applications");
    await page
      .getByRole("button", { name: "Save application", exact: true })
      .click();
    const raw: unknown = await (await created).json();
    const id = idSchema.parse(raw).id;
    await expect(row(page, "Pacific Co")).toContainText("Mar 1, 2026");
    const stored = await request.get(`/api/applications/${id}`);
    const storedRaw: unknown = await stored.json();
    expect(z.object({ appliedAt: z.string() }).parse(storedRaw).appliedAt).toBe(
      "2026-03-01T00:00:00.000Z",
    );
    await row(page, "Pacific Co")
      .getByRole("link", { name: "Edit", exact: true })
      .click();
    await expect(page.getByLabel("Date applied", { exact: true })).toHaveValue(
      "2026-03-01",
    );
  });

  test("the default date applied is the viewer's own day", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-03-01T03:00:00Z"));
    await page.goto("/dashboard/applications/new");
    await expect(page.getByLabel("Date applied", { exact: true })).toHaveValue(
      "2026-02-28",
    );
  });
});

test.describe(
  "Rows older or stranger than today's forms",
  { tag: "@GAP-legacy-db-rows" },
  () => {
    test("an application with a status the app no longer offers still lists", async ({
      page,
      database,
      candidate,
    }) => {
      // The column has no CHECK constraint, so older rows can hold this.
      await database
        .update(jobApplications)
        .set({ status: sql`'pending'` })
        .where(eq(jobApplications.id, candidate.applicationId));
      const listed = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === "/api/applications" &&
          response.request().method() === "GET",
      );
      await page.goto("/dashboard/applications");
      expect((await listed).status()).toBe(200);
      expectedFail(
        "src/app/api/applications/validators.ts:62: the client parses the list with the status enum, though line 52 says stored values are checked for shape only, so one 'pending' row fails the whole list",
      );
      await expect(row(page, "Example Industries")).toBeVisible({
        timeout: 2_000,
      });
    });
  },
);

test.describe(
  "Pages at phone width",
  { tag: "@GAP-narrow-viewport-content" },
  () => {
    test.use({ viewport: { width: 390, height: 844 } });

    async function noHorizontalScroll(page: Page) {
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    }

    test("lists, the profile index and the tailor page fit the screen", async ({
      page,
      candidate,
    }) => {
      await page.goto("/dashboard/applications");
      const listed = row(page, "Example Industries");
      await expect(listed).toContainText("Applied");
      await expect(
        listed.getByRole("link", { name: "Tailor resume", exact: true }),
      ).toBeVisible();
      await expect(
        listed.getByRole("link", { name: "Edit", exact: true }),
      ).toBeVisible();
      await noHorizontalScroll(page);
      await expect(
        page.getByRole("banner").getByText(candidate.email),
      ).toBeHidden();

      await page.goto("/dashboard/profile");
      const references = sectionButton(page, "References");
      await references.scrollIntoViewIfNeeded();
      await references.click();
      await expect(references).toHaveAttribute("aria-current", "true");
      await noHorizontalScroll(page);

      await page.goto(
        `/dashboard/applications/${candidate.applicationId}/resume`,
      );
      const preview = page.getByRole("button", {
        name: "Preview",
        exact: true,
      });
      await preview.scrollIntoViewIfNeeded();
      await expect(preview).toBeInViewport({ ratio: 1 });
      await noHorizontalScroll(page);
    });

    test("a very long company name wraps without widening the page", async ({
      page,
      request,
    }) => {
      const created = await request.post("/api/applications", {
        data: { company: "W".repeat(300), position: "Engineer" },
      });
      expect(created.status()).toBe(201);
      await page.goto("/dashboard/applications");
      await expect(
        page.getByRole("button", {
          name: `Delete application at ${"W".repeat(300)}`,
        }),
      ).toBeVisible();
      expectedFail(
        "src/app/dashboard/applications/page.tsx:172: the company span has no word break, so one 300-character word widens the row past the screen",
      );
      await noHorizontalScroll(page);
    });
  },
);

test.describe(
  "The same account in two places",
  { tag: "@GAP-two-tab-concurrency" },
  () => {
    test("saving details of a resume deleted elsewhere names the problem", async ({
      page,
      request,
    }) => {
      const resume = await seedGeneratedResume(request, {
        title: "Shared Resume",
      });
      await page.goto(`/dashboard/resumes/${resume.id}`);
      await expect(
        page.getByLabel("Resume title", { exact: true }),
      ).toHaveValue("Shared Resume");
      expect((await request.delete(`/api/resumes/${resume.id}`)).status()).toBe(
        200,
      );
      await page
        .getByRole("button", { name: "Save details", exact: true })
        .click();
      await expect(toast(page, "Resume not found")).toBeVisible();
    });
  },
);
