import type { APIRequestContext, Page } from "@playwright/test";
import { and, eq } from "drizzle-orm";
import {
  coverLetters,
  jobApplications,
  resumes,
} from "../../src/lib/db/schema";
import {
  dashboardActivitySchema,
  dashboardStatsSchema,
} from "../../src/app/api/dashboard/validators";
import { test, expect } from "./support/fixtures";
import {
  anonymousRequest,
  expectedFail,
  hold,
  sectionButton,
} from "./support/helpers";

const STATS = "/api/dashboard/stats";
const ACTIVITY = "/api/dashboard/activity";
const NOTHING_YET =
  "Nothing yet. Changes to your applications, resumes and cover letters show up here.";
const NAV = [
  ["Dashboard", "/dashboard", "Dashboard"],
  ["Profile", "/dashboard/profile", "Profile"],
  ["Applications", "/dashboard/applications", "Applications"],
  ["Resumes", "/dashboard/resumes", "Resumes"],
  ["Cover letters", "/dashboard/cover-letters", "Cover letters"],
  [
    "Conversation starters",
    "/dashboard/conversation-starters",
    "Conversation starters",
  ],
  [
    "Application questions",
    "/dashboard/application-answers",
    "Application questions",
  ],
] as const;

async function addApplication(
  request: APIRequestContext,
  data: { company: string; position: string; status?: string },
) {
  const response = await request.post("/api/applications", { data });
  expect(response.status()).toBe(201);
}

function pipeline(page: Page) {
  return page.getByRole("region", { name: "Applications" });
}

function activity(page: Page) {
  return page.getByRole("region", { name: "Recent activity" });
}

function documents(page: Page) {
  return page.getByRole("region", { name: "Documents" });
}

/** The count shown above one status in the pipeline. */
function statusCount(page: Page, label: string) {
  return pipeline(page)
    .getByRole("listitem")
    .filter({ hasText: label })
    .locator("span")
    .first();
}

function documentCount(page: Page, label: string) {
  return documents(page)
    .getByRole("listitem")
    .filter({ has: page.getByRole("link", { name: label, exact: true }) });
}

function summary(page: Page) {
  return pipeline(page).getByText(/ in progress/);
}

test.describe(
  "Dashboard home: pipeline, activity and documents",
  { tag: ["@dashboard-overview", "@dashboard-home"] },
  () => {
    test("each status is counted and the summary gives the share of offers", async ({
      page,
      request,
    }) => {
      await addApplication(request, {
        company: "Interview Co",
        position: "Backend Engineer",
        status: "interviewing",
      });
      await addApplication(request, {
        company: "Offer Co",
        position: "Staff Engineer",
        status: "offer",
      });
      await page.goto("/dashboard");
      await expect(
        page.getByText(
          "Where your applications stand and what changed recently.",
          { exact: true },
        ),
      ).toBeVisible();
      for (const [label, count] of [
        ["Applied", "1"],
        ["Interviewing", "1"],
        ["Offer", "1"],
        ["Rejected", "0"],
        ["Withdrawn", "0"],
      ] as const)
        await expect(statusCount(page, label)).toHaveText(count);
      await expect(summary(page)).toHaveText(
        "3 applications. 2 in progress, 1 offer (33% of all applications).",
      );
      const items = activity(page).getByRole("listitem");
      await expect(items).toHaveCount(3);
      await expect(items.nth(0)).toContainText("Staff Engineer at Offer Co");
      await expect(items.nth(1)).toContainText(
        "Backend Engineer at Interview Co",
      );
      await expect(items.nth(2)).toContainText(
        "Software Engineer at Example Industries",
      );
      await expect(items.nth(0)).toContainText("Application added");
      await expect(items.nth(0)).toContainText("Just now");
      for (const label of ["Resumes", "Cover letters"])
        await expect(documentCount(page, label)).toContainText("0");
    });

    test("the dashboard's links go where they say", async ({ page }) => {
      for (const [name, url] of [
        ["View all applications", /\/dashboard\/applications$/],
        ["Generate resume from profile", /\/dashboard\/resumes\/generate$/],
        ["Write cover letter", /\/dashboard\/cover-letters\/new$/],
        ["Add application", /\/dashboard\/applications\/new$/],
      ] as const) {
        await page.goto("/dashboard");
        await page
          .getByRole("main")
          .getByRole("link", { name, exact: true })
          .click();
        await expect(page).toHaveURL(url);
      }
      for (const [name, url] of [
        ["Resumes", /\/dashboard\/resumes$/],
        ["Cover letters", /\/dashboard\/cover-letters$/],
      ] as const) {
        await page.goto("/dashboard");
        await documents(page).getByRole("link", { name, exact: true }).click();
        await expect(page).toHaveURL(url);
      }
    });

    test("recent activity says how long ago each change was", async ({
      page,
      request,
      database,
      candidate,
    }) => {
      const now = Date.now();
      const ages = [
        ["One Minute Co", 61_000, "1 minute ago"],
        ["Five Minutes Co", 5 * 60_000, "5 minutes ago"],
        ["Two Hours Co", 2 * 3_600_000, "2 hours ago"],
        ["Three Days Co", 3 * 86_400_000, "3 days ago"],
      ] as const;
      for (const [company] of ages)
        await addApplication(request, { company, position: "Engineer" });
      for (const [company, age] of ages)
        await database
          .update(jobApplications)
          .set({ createdAt: new Date(now - age) })
          .where(
            and(
              eq(jobApplications.userId, candidate.id),
              eq(jobApplications.company, company),
            ),
          );
      const eightDays = new Date(now - 8 * 86_400_000);
      await database
        .update(jobApplications)
        .set({ createdAt: eightDays })
        .where(eq(jobApplications.id, candidate.applicationId));
      await page.goto("/dashboard");
      for (const [company, , label] of ages)
        await expect(
          activity(page)
            .getByRole("listitem")
            .filter({ hasText: `Engineer at ${company}` }),
        ).toContainText(label);
      // Older than a week, the browser's own date format is used.
      await expect(
        activity(page)
          .getByRole("listitem")
          .filter({ hasText: "Example Industries" }),
      ).toContainText(eightDays.toLocaleDateString("en-US"));
    });

    test("activity stops at the ten newest changes", async ({
      page,
      request,
    }) => {
      for (let index = 1; index <= 10; index += 1)
        await addApplication(request, {
          company: `Company ${index}`,
          position: "Engineer",
        });
      await page.goto("/dashboard");
      await expect(activity(page).getByRole("listitem")).toHaveCount(10);
      await expect(
        activity(page).getByText("Software Engineer at Example Industries"),
      ).toHaveCount(0);
      await expect(summary(page)).toContainText("11 applications");
    });

    test("resumes and cover letters appear in activity and the documents count", async ({
      page,
      database,
      candidate,
    }) => {
      await database
        .insert(resumes)
        .values({ userId: candidate.id, title: "DB Resume", content: "x" });
      await database.insert(coverLetters).values({
        userId: candidate.id,
        title: "DB Letter",
        content: "x",
        isAiGenerated: true,
      });
      await page.goto("/dashboard");
      await expect(
        activity(page).getByRole("listitem").filter({ hasText: "DB Resume" }),
      ).toContainText("Resume added");
      await expect(
        activity(page).getByRole("listitem").filter({ hasText: "DB Letter" }),
      ).toContainText("Cover letter added");
      for (const label of ["Resumes", "Cover letters"])
        await expect(documentCount(page, label)).toContainText("1");
    });

    test("with no offers the summary leaves the share out, and decided ones are not in progress", async ({
      page,
      request,
      candidate,
    }) => {
      expect(
        (
          await request.put(`/api/applications/${candidate.applicationId}`, {
            data: { status: "rejected" },
          })
        ).status(),
      ).toBe(200);
      await addApplication(request, {
        company: "Withdrawn Co",
        position: "Engineer",
        status: "withdrawn",
      });
      await page.goto("/dashboard");
      await expect(summary(page)).toHaveText("2 applications. 0 in progress.");
      await expect(statusCount(page, "Rejected")).toHaveText("1");
      await expect(statusCount(page, "Withdrawn")).toHaveText("1");
    });

    test("another account's records are not counted", async ({
      page,
      createCandidate,
    }) => {
      await createCandidate();
      await page.goto("/dashboard");
      await expect(summary(page)).toHaveText("1 application. 1 in progress.");
      await expect(activity(page).getByRole("listitem")).toHaveCount(1);
    });
  },
);

test.describe(
  "Dashboard with no applications",
  { tag: ["@dashboard-empty-state", "@dashboard-home"] },
  () => {
    test("the empty state points to the first steps", async ({
      page,
      request,
      candidate,
    }) => {
      expect(
        (
          await request.delete(`/api/applications/${candidate.applicationId}`)
        ).status(),
      ).toBe(200);
      await page.goto("/dashboard");
      const main = page.getByRole("main");
      await expect(
        main.getByRole("heading", { name: "No applications yet", level: 2 }),
      ).toBeVisible();
      await expect(pipeline(page)).toHaveCount(0);
      await expect(activity(page).getByText(NOTHING_YET)).toBeVisible();
      for (const label of ["Resumes", "Cover letters"])
        await expect(documentCount(page, label)).toContainText("0");
      // The header and the empty state offer the same action.
      const add = main.getByRole("link", {
        name: "Add application",
        exact: true,
      });
      await expect(add).toHaveCount(2);
      await main
        .getByRole("link", { name: "Open your profile", exact: true })
        .click();
      await expect(page).toHaveURL(/\/dashboard\/profile$/);
      await page.goBack();
      await add.last().click();
      await expect(page).toHaveURL(/\/dashboard\/applications\/new$/);
    });

    test("other documents still show without applications", async ({
      page,
      request,
      database,
      candidate,
    }) => {
      expect(
        (
          await request.delete(`/api/applications/${candidate.applicationId}`)
        ).status(),
      ).toBe(200);
      await database
        .insert(resumes)
        .values({ userId: candidate.id, title: "DB Resume", content: "x" });
      await page.goto("/dashboard");
      await expect(
        page
          .getByRole("main")
          .getByRole("heading", { name: "No applications yet", level: 2 }),
      ).toBeVisible();
      await expect(
        activity(page).getByRole("listitem").filter({ hasText: "DB Resume" }),
      ).toContainText("Resume added");
      await expect(documentCount(page, "Resumes")).toContainText("1");
    });
  },
);

test.describe(
  "Dashboard load errors",
  { tag: ["@dashboard-load-errors", "@dashboard-home"] },
  () => {
    function notice(page: Page) {
      return page.getByRole("main").getByRole("alert");
    }

    test("a rejected stats request shows its message, and Try again recovers", async ({
      page,
    }) => {
      await page.route(`**${STATS}`, (route) =>
        route.fulfill({ status: 403, json: { error: "Stats exploded" } }),
      );
      await page.goto("/dashboard");
      await expect(
        page.getByRole("heading", { name: "Dashboard", level: 1 }),
      ).toBeVisible();
      await expect(notice(page)).toContainText("The dashboard didn't load");
      await expect(notice(page)).toContainText("Stats exploded");
      await page.unroute(`**${STATS}`);
      await notice(page)
        .getByRole("button", { name: "Try again", exact: true })
        .click();
      await expect(summary(page)).toHaveText("1 application. 1 in progress.");
      await expect(notice(page)).toHaveCount(0);
    });

    test("a failed activity request replaces the whole dashboard", async ({
      page,
    }) => {
      await page.route(`**${ACTIVITY}*`, (route) =>
        route.fulfill({ status: 400, json: { error: "Activity exploded" } }),
      );
      await page.goto("/dashboard");
      await expect(notice(page)).toContainText("Activity exploded");
      await expect(pipeline(page)).toHaveCount(0);
    });

    test("an error without a message gets the stats fallback", async ({
      page,
    }) => {
      await page.route(`**${STATS}`, (route) =>
        route.fulfill({ status: 404, json: {} }),
      );
      await page.goto("/dashboard");
      await expect(notice(page)).toContainText(
        "Failed to fetch dashboard stats",
      );
    });

    test("a malformed stats response is reported at once", async ({ page }) => {
      await page.route(`**${STATS}`, (route) =>
        route.fulfill({ json: { totalApplications: "x" } }),
      );
      await page.goto("/dashboard");
      await expect(notice(page)).toContainText(
        "Received an invalid server response. Please try again.",
      );
    });

    test("a server error is retried before the error shows", async ({
      page,
    }) => {
      let attempts = 0;
      await page.route(`**${STATS}`, (route) => {
        attempts += 1;
        return route.fulfill({
          status: 500,
          json: { error: "Internal server error" },
        });
      });
      await page.goto("/dashboard");
      await expect(notice(page)).toContainText("Internal server error", {
        timeout: 20_000,
      });
      expect(attempts).toBe(4);
    });
  },
);

test.describe("Dashboard API contract", { tag: "@dashboard-api" }, () => {
  test("stats and activity describe the account's records", async ({
    request,
  }) => {
    const stats = await request.get(STATS);
    expect(stats.status()).toBe(200);
    const statsRaw: unknown = await stats.json();
    expect(dashboardStatsSchema.parse(statsRaw)).toMatchObject({
      totalApplications: 1,
      applicationsByStatus: { applied: 1 },
      totalResumes: 0,
      totalCoverLetters: 0,
    });
    const listed = await request.get(`${ACTIVITY}?limit=10`);
    expect(listed.status()).toBe(200);
    const listedRaw: unknown = await listed.json();
    expect(dashboardActivitySchema.parse(listedRaw)).toMatchObject([
      {
        type: "application",
        action: "created",
        title: "Software Engineer at Example Industries",
        description: "Applied for Software Engineer position",
      },
    ]);
  });

  test("activity filters by type and limit", async ({
    request,
    database,
    candidate,
  }) => {
    await addApplication(request, { company: "Second Co", position: "X" });
    await database
      .insert(resumes)
      .values({ userId: candidate.id, title: "DB Resume", content: "x" });
    const one = await request.get(`${ACTIVITY}?type=application&limit=1`);
    const oneRaw: unknown = await one.json();
    expect(dashboardActivitySchema.parse(oneRaw)).toHaveLength(1);
    const onlyResumes = await request.get(`${ACTIVITY}?type=resume`);
    const resumesRaw: unknown = await onlyResumes.json();
    expect(
      dashboardActivitySchema.parse(resumesRaw).map((item) => item.type),
    ).toEqual(["resume"]);
  });

  test("invalid queries are refused", async ({ request }) => {
    for (const query of [
      "limit=0",
      "limit=51",
      "limit=abc",
      "limit=1.5",
      "type=bogus",
      "offset=-1",
    ]) {
      const response = await request.get(`${ACTIVITY}?${query}`);
      expect(response.status(), query).toBe(400);
      const raw: unknown = await response.json();
      expect(raw).toMatchObject({ error: "Invalid query parameters" });
    }
  });

  test("an offset skips the newest items", async ({ request }) => {
    await addApplication(request, { company: "Second Co", position: "X" });
    await addApplication(request, { company: "Third Co", position: "X" });
    const first = await request.get(`${ACTIVITY}?limit=1`);
    const second = await request.get(`${ACTIVITY}?limit=1&offset=1`);
    const firstRaw: unknown = await first.json();
    const secondRaw: unknown = await second.json();
    const [newest] = dashboardActivitySchema.parse(firstRaw);
    const [next] = dashboardActivitySchema.parse(secondRaw);
    expect(second.status()).toBe(200);
    expect(newest?.title).toBe("X at Third Co");
    expectedFail(
      "src/app/api/dashboard/service.ts:57: the activity query reads limit but never applies offset, so offset=1 returns the newest item again",
    );
    expect(next?.title).toBe("X at Second Co");
  });

  test("both endpoints require a session", async ({
    playwright,
    extraHTTPHeaders,
  }) => {
    const anonymous = await anonymousRequest(playwright, extraHTTPHeaders);
    try {
      for (const path of [STATS, ACTIVITY]) {
        const response = await anonymous.get(path);
        expect(response.status(), path).toBe(401);
        expect(await response.json()).toEqual({ error: "Unauthorized" });
      }
    } finally {
      await anonymous.dispose();
    }
  });
});

test.describe(
  "Dashboard shell navigation on a desktop",
  {
    tag: ["@dashboard-navigation-desktop", "@dashboard-shell-and-auth-gating"],
  },
  () => {
    test("each tab opens its page, and only that tab is marked current", async ({
      page,
      candidate,
    }) => {
      await page.goto("/dashboard");
      const header = page.getByRole("banner");
      await expect(
        header.getByText("Alex Example", { exact: true }),
      ).toBeVisible();
      await expect(
        header.getByText(candidate.email, { exact: true }),
      ).toBeVisible();
      const nav = page.getByRole("navigation", { name: "Main" });
      for (const [name, href, heading] of NAV) {
        await nav.getByRole("link", { name, exact: true }).click();
        await expect(page).toHaveURL(href);
        await expect(
          page.getByRole("heading", { name: heading, level: 1 }),
        ).toBeVisible();
        for (const [other] of NAV) {
          const link = nav.getByRole("link", { name: other, exact: true });
          if (other === name)
            await expect(link).toHaveAttribute("aria-current", "page");
          else await expect(link).not.toHaveAttribute("aria-current");
        }
      }
      await header
        .getByRole("link", { name: "Job Application Assistant", exact: true })
        .click();
      await expect(page).toHaveURL(/\/dashboard$/);
    });

    test("pages inside a section keep its tab current", async ({
      page,
      candidate,
    }) => {
      const nav = page.getByRole("navigation", { name: "Main" });
      for (const path of [
        "/dashboard/applications/new",
        `/dashboard/applications/${candidate.applicationId}`,
        `/dashboard/applications/${candidate.applicationId}/resume`,
      ]) {
        await page.goto(path);
        await expect(
          nav.getByRole("link", { name: "Applications", exact: true }),
        ).toHaveAttribute("aria-current", "page");
        await expect(
          nav.getByRole("link", { name: "Dashboard", exact: true }),
        ).not.toHaveAttribute("aria-current");
      }
    });

    test("pages wait for the session check before rendering", async ({
      page,
    }) => {
      const pending = await hold(page, "**/api/auth/get-session*", "GET");
      await page.goto("/dashboard");
      await expect.poll(() => pending.requests.length).toBeGreaterThan(0);
      await expect(
        page.getByRole("heading", { name: "Dashboard", level: 1 }),
      ).toHaveCount(0);
      pending.release();
      await expect(
        page.getByRole("heading", { name: "Dashboard", level: 1 }),
      ).toBeVisible();
    });
  },
);

test.describe(
  "Dashboard navigation sheet on a phone",
  { tag: "@dashboard-navigation-mobile" },
  () => {
    test.use({ viewport: { width: 390, height: 844 } });

    function sheet(page: Page) {
      return page.getByRole("dialog", { name: "Navigation", exact: true });
    }

    test("the sheet lists every page and closes after choosing one", async ({
      page,
      candidate,
    }) => {
      await page.goto("/dashboard");
      await expect(
        page.getByRole("banner").getByRole("button", { name: "Sign out" }),
      ).toBeHidden();
      await page
        .getByRole("button", { name: "Open navigation", exact: true })
        .click();
      const nav = sheet(page);
      await expect(nav.getByRole("link")).toHaveText(NAV.map(([name]) => name));
      await expect(
        nav.getByRole("link", { name: "Dashboard", exact: true }),
      ).toHaveAttribute("aria-current", "page");
      await expect(
        nav.getByText("Alex Example", { exact: true }),
      ).toBeVisible();
      await expect(
        nav.getByText(candidate.email, { exact: true }),
      ).toBeVisible();
      await expect(
        nav.getByRole("button", { name: "Sign out", exact: true }),
      ).toBeVisible();
      await nav
        .getByRole("link", { name: "Applications", exact: true })
        .click();
      await expect(nav).toBeHidden();
      await expect(page).toHaveURL(/\/dashboard\/applications$/);
      await expect(
        page.getByRole("heading", { name: "Applications", level: 1 }),
      ).toBeVisible();
    });

    test("Close and Escape dismiss the sheet without navigating", async ({
      page,
    }) => {
      await page.goto("/dashboard");
      const open = page.getByRole("button", {
        name: "Open navigation",
        exact: true,
      });
      await open.click();
      await sheet(page)
        .getByRole("button", { name: "Close", exact: true })
        .click();
      await expect(sheet(page)).toBeHidden();
      await open.click();
      await expect(sheet(page)).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(sheet(page)).toBeHidden();
      await expect(page).toHaveURL(/\/dashboard$/);
    });

    test("signing out from the sheet and back in arrives with it closed", async ({
      page,
      candidate,
    }) => {
      await page.goto("/dashboard");
      await page
        .getByRole("button", { name: "Open navigation", exact: true })
        .click();
      await sheet(page)
        .getByRole("button", { name: "Sign out", exact: true })
        .click();
      await expect(page).toHaveURL(/\/sign-in$/);
      await page.getByLabel("Email", { exact: true }).fill(candidate.email);
      await page
        .getByLabel("Password", { exact: true })
        .fill(candidate.password);
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      await expect(page).toHaveURL(/\/dashboard$/);
      await expect(
        page.getByRole("heading", { name: "Dashboard", level: 1 }),
      ).toBeVisible();
      expectedFail(
        "src/app/dashboard/layout.tsx:151: neither sign-out nor clearAccountState resets the store's sidebarOpen, so the sheet is open again after signing back in",
      );
      await expect(sheet(page)).toBeHidden({ timeout: 2_000 });
    });
  },
);

test.describe("Keyboard-only paths", { tag: "@GAP-keyboard-only" }, () => {
  test("the first Tab reaches Skip to content, which jumps to the page", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: "Dashboard", level: 1 }),
    ).toBeVisible();
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#main$/);
  });

  test("the theme menu works from the keyboard", async ({ page }) => {
    await page.goto("/dashboard");
    await page
      .getByRole("button", { name: "Change theme", exact: true })
      .focus();
    await page.keyboard.press("Enter");
    const dark = page.getByRole("menuitem", { name: "Dark", exact: true });
    await expect(dark).toBeVisible();
    for (let step = 0; step < 3; step += 1) {
      if (await dark.evaluate((item) => item === document.activeElement)) break;
      await page.keyboard.press("ArrowDown");
    }
    await expect(dark).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("html")).toHaveClass(/\bdark\b/);
    expect(await page.evaluate(() => localStorage.getItem("theme"))).toBe(
      "dark",
    );
  });

  test("a delete confirmation opens on Cancel and Escape returns focus", async ({
    page,
    database,
    candidate,
  }) => {
    await page.goto("/dashboard/applications");
    const trash = page.getByRole("button", {
      name: "Delete application at Example Industries",
      exact: true,
    });
    await trash.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("alertdialog", {
      name: "Delete this application?",
    });
    await expect(
      dialog.getByRole("button", { name: "Cancel", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    expect(
      await database
        .select({ id: jobApplications.id })
        .from(jobApplications)
        .where(eq(jobApplications.id, candidate.applicationId)),
    ).toHaveLength(1);
    expectedFail(
      "src/components/ui/confirm-delete-dialog.tsx:32: the dialog is opened from state rather than an AlertDialogTrigger, so on close Radix has no trigger to return focus to",
    );
    await expect(trash).toBeFocused({ timeout: 2_000 });
  });

  test("a status filter toggles with Space", async ({ page }) => {
    await page.goto("/dashboard/applications");
    const filter = page
      .getByRole("group", { name: "Filter by status" })
      .getByRole("button", { name: /^Interviewing/ });
    await filter.focus();
    await page.keyboard.press("Space");
    await expect(filter).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.getByText("No applications with this status.", { exact: true }),
    ).toBeVisible();
  });

  test("the resume length radios move with the arrow keys", async ({
    page,
  }) => {
    await page.goto("/dashboard/resumes/generate");
    const one = page.getByRole("radio", { name: "1 page", exact: true });
    await expect(one).toBeChecked();
    await one.focus();
    await page.keyboard.press("ArrowRight");
    await expect(
      page.getByRole("radio", { name: "2 pages", exact: true }),
    ).toBeChecked();
  });

  test("the profile section index works from the keyboard", async ({
    page,
  }) => {
    await page.goto("/dashboard/profile");
    const skills = sectionButton(page, "Skills");
    await skills.focus();
    await page.keyboard.press("Enter");
    await expect(skills).toHaveAttribute("aria-current", "true");
    await expect(
      page
        .getByRole("main")
        .getByRole("heading", { name: "Skills", level: 2, exact: true }),
    ).toBeVisible();
  });
});
