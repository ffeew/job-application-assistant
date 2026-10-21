import type { APIRequestContext, Page } from "@playwright/test";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  coverLetters,
  jobApplications,
  resumes,
} from "../../src/lib/db/schema";
import {
  applicationJsonResponseSchema,
  type CreateApplicationRequest,
} from "../../src/app/api/applications/validators";
import { test, expect } from "./support/fixtures";
import {
  call,
  expectedFail,
  hold,
  recordRequests,
  responseTo,
  seedGeneratedResume,
} from "./support/helpers";
import { BASE_URL } from "./support/runtime";

test("create, edit, and delete an application and refresh dashboard counts", async ({
  page,
}) => {
  await page.goto("/dashboard/applications/new");
  await page
    .getByRole("button", { name: "Save application", exact: true })
    .click();
  await expect(
    page.getByText("Company is required", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Position is required", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Company *", { exact: true }).fill("Browser Test Co");
  await page
    .getByLabel("Position *", { exact: true })
    .fill("Platform Engineer");
  await page
    .getByRole("button", { name: "Save application", exact: true })
    .click();
  await expect(page).toHaveURL(/\/dashboard\/applications$/);
  await expect(
    page
      .getByText("Browser Test Co", { exact: true })
      .filter({ visible: true }),
  ).toBeVisible();
  await page.goto("/dashboard");
  const pipeline = page.getByRole("region", { name: "Applications" });
  await expect(
    pipeline.getByText("2 applications", { exact: true }),
  ).toBeVisible();
  await page.goto("/dashboard/applications");
  const row = page
    .getByRole("listitem")
    .filter({ has: page.getByText("Browser Test Co", { exact: true }) });
  await row.getByRole("link", { name: "Edit", exact: true }).click();
  await expect(page.getByLabel("Company *", { exact: true })).toHaveValue(
    "Browser Test Co",
  );
  await page.getByLabel("Status", { exact: true }).click();
  await page.getByRole("option", { name: "Interviewing", exact: true }).click();
  await page
    .getByLabel("Notes", { exact: true })
    .fill("Technical interview scheduled.");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/applications$/);
  await row.getByRole("link", { name: "Edit", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/applications\/[a-f\d-]+$/);
  await page.reload();
  await expect(page.getByLabel("Status", { exact: true })).toHaveText(
    "Interviewing",
  );
  await expect(page.getByLabel("Notes", { exact: true })).toHaveValue(
    "Technical interview scheduled.",
  );
  await page.goto("/dashboard/applications");
  await page
    .getByRole("button", {
      name: "Delete application at Browser Test Co",
      exact: true,
    })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await expect(
    page
      .getByText("Browser Test Co", { exact: true })
      .filter({ visible: true }),
  ).not.toBeVisible();
  await page.goto("/dashboard");
  await expect(
    pipeline.getByText("1 application", { exact: true }),
  ).toBeVisible();
});

test("another candidate cannot see or retrieve an application", async ({
  page,
  candidate,
  createCandidate,
  browser,
  extraHTTPHeaders,
}) => {
  const other = await createCandidate();
  const context = await browser.newContext({
    baseURL: BASE_URL,
    storageState: other.storageState,
    extraHTTPHeaders,
  });
  try {
    const owned = await context.request.get(
      `/api/applications/${other.applicationId}`,
    );
    expect(owned.status()).toBe(200);
    const raw: unknown = await owned.json();
    expect(applicationJsonResponseSchema.parse(raw).userId).toBe(other.id);
    expect(
      (
        await context.request.get(
          `/api/applications/${candidate.applicationId}`,
        )
      ).status(),
    ).toBe(404);
    const otherPage = await context.newPage();
    await otherPage.goto(
      `/dashboard/applications/${candidate.applicationId}/resume`,
    );
    await expect(
      otherPage.getByText("This application didn't load", { exact: true }),
    ).toBeVisible();
    await expect(
      otherPage.getByRole("button", {
        name: "Save and download PDF",
        exact: true,
      }),
    ).not.toBeVisible();
  } finally {
    await context.close();
  }
  await page.goto("/dashboard/applications");
  await expect(
    page
      .getByText("Example Industries", { exact: true })
      .filter({ visible: true }),
  ).toBeVisible();
});

const LIST = "/api/applications";
const TOO_LONG = "Keep this under 300 characters";
const BAD_LINK = "Enter a link starting with https://";
const DELETE_FAILED = "Couldn't delete the application. Try again.";
const SAVE_FAILED = "Couldn't save the application. Try again.";
const CHANGES_FAILED = "Couldn't save the changes. Try again.";
const NOT_LOADED = "This application didn't load";

async function seedApplication(
  request: APIRequestContext,
  data: Partial<CreateApplicationRequest> &
    Pick<CreateApplicationRequest, "company" | "position">,
) {
  const response = await request.post(LIST, { data });
  expect(response.status()).toBe(201);
  const raw: unknown = await response.json();
  return applicationJsonResponseSchema.parse(raw);
}

async function storedApplication(request: APIRequestContext, id: string) {
  const response = await request.get(`${LIST}/${id}`);
  expect(response.status()).toBe(200);
  const raw: unknown = await response.json();
  return applicationJsonResponseSchema.parse(raw);
}

function row(page: Page, company: string) {
  return page
    .getByRole("main")
    .getByRole("listitem")
    .filter({ has: page.getByText(company, { exact: true }) });
}

function filters(page: Page) {
  return page.getByRole("group", { name: "Filter by status" });
}

function filterButton(page: Page, label: string) {
  return filters(page).getByRole("button", { name: new RegExp(`^${label}`) });
}

function toast(page: Page, text: string) {
  return page.getByText(text, { exact: true });
}

function deleteButton(page: Page, company: string) {
  return page.getByRole("button", {
    name: `Delete application at ${company}`,
    exact: true,
  });
}

async function chooseStatus(page: Page, label: string) {
  await page.getByLabel("Status", { exact: true }).click();
  await page.getByRole("option", { name: label, exact: true }).click();
}

function saveApplication(page: Page) {
  return page.getByRole("button", { name: "Save application", exact: true });
}

function saveChanges(page: Page) {
  return page.getByRole("button", { name: "Save changes", exact: true });
}

/** Opens an edit page and waits until the form holds the stored values. */
async function openEdit(page: Page, id: string, company: string) {
  await page.goto(`/dashboard/applications/${id}`);
  await expect(page.getByLabel("Company *", { exact: true })).toHaveValue(
    company,
  );
}

test.describe(
  "Applications list: rows, status filter and load errors",
  { tag: "@applications-list-filter" },
  () => {
    test("rows are newest first with counts per status, and a filter shows only its rows", async ({
      page,
      request,
    }) => {
      await seedApplication(request, {
        company: "Remote Co",
        position: "Platform Engineer",
        location: "Remote",
        jobUrl: "https://jobs.example.test/1",
        status: "interviewing",
        appliedAt: "2026-01-15",
      });
      await seedApplication(request, {
        company: "Offer Co",
        position: "Staff Engineer",
        status: "offer",
      });
      await page.goto("/dashboard/applications");
      const main = page.getByRole("main");
      await expect(
        main.getByText(
          "Every job you are applying to, with its status and the resume you tailored for it.",
          { exact: true },
        ),
      ).toBeVisible();
      const rows = main.getByRole("listitem");
      await expect(rows).toHaveCount(3);
      await expect(rows.nth(0)).toContainText("Offer Co");
      await expect(rows.nth(1)).toContainText("Remote Co");
      await expect(rows.nth(2)).toContainText("Example Industries");
      for (const [label, count] of [
        ["All", 3],
        ["Applied", 1],
        ["Interviewing", 1],
        ["Offer", 1],
        ["Rejected", 0],
        ["Withdrawn", 0],
      ] as const)
        await expect(filterButton(page, label)).toHaveText(
          new RegExp(`^${label}\\s*${count}$`),
        );
      await expect(filterButton(page, "All")).toHaveAttribute(
        "aria-pressed",
        "true",
      );

      const remote = row(page, "Remote Co");
      await expect(remote).toContainText("Platform Engineer");
      await expect(remote.getByText("Remote", { exact: true })).toBeVisible();
      await expect(
        remote.getByText("Interviewing", { exact: true }),
      ).toBeVisible();
      await expect(remote).toContainText("Jan 15, 2026");
      const listing = remote.getByRole("link", {
        name: "Open the listing at Remote Co",
        exact: true,
      });
      await expect(listing).toHaveAttribute(
        "href",
        "https://jobs.example.test/1",
      );
      await expect(listing).toHaveAttribute("target", "_blank");
      await expect(
        remote.getByRole("link", { name: "Tailor resume", exact: true }),
      ).toHaveAttribute("href", /\/dashboard\/applications\/[\w-]+\/resume$/);

      await filterButton(page, "Interviewing").click();
      await expect(filterButton(page, "Interviewing")).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await expect(filterButton(page, "All")).toHaveAttribute(
        "aria-pressed",
        "false",
      );
      await expect(rows).toHaveCount(1);
      await expect(remote).toBeVisible();

      await filterButton(page, "All").click();
      await expect(rows).toHaveCount(3);
    });

    test("a filter with no matches says so, and the choice resets on reload", async ({
      page,
    }) => {
      await page.goto("/dashboard/applications");
      await filterButton(page, "Withdrawn").click();
      await expect(
        page.getByText("No applications with this status.", { exact: true }),
      ).toBeVisible();
      await expect(row(page, "Example Industries")).toHaveCount(0);
      await page.reload();
      await expect(filterButton(page, "All")).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await expect(row(page, "Example Industries")).toBeVisible();
    });

    test("an account with no applications sees the empty state", async ({
      page,
      request,
      candidate,
    }) => {
      expect(
        (await request.delete(`${LIST}/${candidate.applicationId}`)).status(),
      ).toBe(200);
      await page.goto("/dashboard/applications");
      const main = page.getByRole("main");
      await expect(
        main.getByRole("heading", { name: "No applications yet", level: 2 }),
      ).toBeVisible();
      await expect(
        main.getByText(
          "Add the first job you want to apply to. Paste in its listing and you can tailor a resume to it.",
          { exact: true },
        ),
      ).toBeVisible();
      await expect(filters(page)).toHaveCount(0);
      // The header and the empty state both offer the same action.
      await expect(
        main.getByRole("link", { name: "Add application", exact: true }),
      ).toHaveCount(2);
      await main
        .getByRole("link", { name: "Add application", exact: true })
        .first()
        .click();
      await expect(page).toHaveURL(/\/dashboard\/applications\/new$/);
    });

    test("another account's applications are not listed", async ({
      page,
      createCandidate,
      database,
    }) => {
      const other = await createCandidate();
      await database
        .update(jobApplications)
        .set({ company: "Other Account Co" })
        .where(eq(jobApplications.userId, other.id));
      await page.goto("/dashboard/applications");
      await expect(row(page, "Example Industries")).toBeVisible();
      await expect(filterButton(page, "All")).toHaveText(/^All\s*1$/);
      await expect(page.getByText("Other Account Co")).toHaveCount(0);
    });

    test("blank optional fields leave no location or listing link", async ({
      page,
      request,
    }) => {
      await seedApplication(request, {
        company: "Blank Co",
        position: "Engineer",
        location: "",
        jobUrl: "",
      });
      await page.goto("/dashboard/applications");
      const blank = row(page, "Blank Co");
      await expect(blank).toBeVisible();
      await expect(
        blank.getByRole("link", { name: "Open the listing at Blank Co" }),
      ).toHaveCount(0);
      await expect(blank.getByText("Remote", { exact: true })).toHaveCount(0);
    });

    test("a rejected list shows its message, and Try again recovers", async ({
      page,
    }) => {
      const matcher = (url: URL) => url.pathname === LIST;
      await page.route(matcher, (route) =>
        route.request().method() === "GET"
          ? route.fulfill({ status: 403, json: { error: "List exploded" } })
          : route.fallback(),
      );
      await page.goto("/dashboard/applications");
      const main = page.getByRole("main");
      const notice = main.getByRole("alert");
      await expect(
        main.getByRole("heading", { name: "Applications", level: 1 }),
      ).toBeVisible();
      await expect(notice).toContainText("Your applications didn't load");
      await expect(notice).toContainText("List exploded");
      await expect(filters(page)).toHaveCount(0);
      await page.unroute(matcher);
      await notice
        .getByRole("button", { name: "Try again", exact: true })
        .click();
      await expect(row(page, "Example Industries")).toBeVisible();
      await expect(notice).toHaveCount(0);
    });

    test("a malformed list response is reported at once", async ({ page }) => {
      await page.route(
        (url) => url.pathname === LIST,
        (route) =>
          route.request().method() === "GET"
            ? route.fulfill({ json: [{}] })
            : route.fallback(),
      );
      await page.goto("/dashboard/applications");
      await expect(page.getByRole("main").getByRole("alert")).toContainText(
        "Received an invalid server response. Please try again.",
      );
    });

    test("a server error is retried before the error shows", async ({
      page,
    }) => {
      let attempts = 0;
      await page.route(
        (url) => url.pathname === LIST,
        (route) => {
          if (route.request().method() !== "GET") return route.fallback();
          attempts += 1;
          return route.fulfill({
            status: 500,
            json: { error: "Internal server error" },
          });
        },
      );
      await page.goto("/dashboard/applications");
      await expect(page.getByRole("main").getByRole("alert")).toContainText(
        "Internal server error",
        { timeout: 20_000 },
      );
      expect(attempts).toBe(4);
    });
  },
);

test.describe("Add application form", { tag: "@create-application" }, () => {
  test("every field is saved, and the new application is listed first", async ({
    page,
    request,
  }) => {
    await page.goto("/dashboard/applications/new");
    // The browser and the test both run in UTC.
    await expect(page.getByLabel("Date applied", { exact: true })).toHaveValue(
      new Date().toISOString().slice(0, 10),
    );
    await expect(page.getByLabel("Status", { exact: true })).toHaveText(
      "Applied",
    );
    await page.getByLabel("Company *", { exact: true }).fill("Northwind");
    await page.getByLabel("Position *", { exact: true }).fill("Data Engineer");
    await page.getByLabel("Location", { exact: true }).fill("Berlin");
    await page.getByLabel("Salary range", { exact: true }).fill("€80k to €95k");
    await page
      .getByLabel("Listing URL", { exact: true })
      .fill("http://jobs.example.test/northwind");
    await page
      .getByLabel("Job description", { exact: true })
      .fill("Build data pipelines.");
    await chooseStatus(page, "Offer");
    await page.getByLabel("Date applied", { exact: true }).fill("2026-02-03");
    await page.getByLabel("Notes", { exact: true }).fill("Referred by Sam.");
    await page.getByLabel("Contact name", { exact: true }).fill("Robin Ng");
    await page
      .getByLabel("Contact email", { exact: true })
      .fill("robin@northwind.test");
    await page.getByLabel("Recruiter", { exact: true }).fill("Talent team");
    const created = responseTo(page, "POST", LIST);
    await saveApplication(page).click();
    const response = await created;
    expect(response.status()).toBe(201);
    await expect(toast(page, "Application saved")).toBeVisible();
    await expect(page).toHaveURL(/\/dashboard\/applications$/);
    await expect(
      page.getByRole("main").getByRole("listitem").first(),
    ).toContainText("Northwind");

    const raw: unknown = await response.json();
    const { id } = applicationJsonResponseSchema.parse(raw);
    expect(await storedApplication(request, id)).toMatchObject({
      company: "Northwind",
      position: "Data Engineer",
      location: "Berlin",
      salaryRange: "€80k to €95k",
      jobUrl: "http://jobs.example.test/northwind",
      jobDescription: "Build data pipelines.",
      status: "offer",
      appliedAt: "2026-02-03T00:00:00.000Z",
      notes: "Referred by Sam.",
      contactName: "Robin Ng",
      contactEmail: "robin@northwind.test",
      recruiterId: "Talent team",
    });
  });

  test("empty required fields are named and nothing is sent", async ({
    page,
  }) => {
    const posts = recordRequests(page, call("POST", LIST));
    await page.goto("/dashboard/applications/new");
    await saveApplication(page).click();
    await expect(
      page.getByText("Company is required", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Position is required", { exact: true }),
    ).toBeVisible();
    const company = page.getByLabel("Company *", { exact: true });
    await expect(company).toHaveAttribute("aria-invalid", "true");
    await expect(
      page.getByLabel("Position *", { exact: true }),
    ).toHaveAttribute("aria-invalid", "true");
    await expect(company).toBeFocused();
    expect(posts).toHaveLength(0);
  });

  test("a company and position of only spaces are refused like empty ones", async ({
    page,
    database,
    candidate,
  }) => {
    await page.goto("/dashboard/applications/new");
    await page.getByLabel("Company *", { exact: true }).fill("   ");
    await page.getByLabel("Position *", { exact: true }).fill("   ");
    const created = responseTo(page, "POST", LIST);
    await saveApplication(page).click();
    expect((await created).status()).toBe(201);
    expectedFail(
      'src/app/api/applications/validators.ts:11: company and position are min(1) without a trim, so "   " is saved as a blank application',
    );
    expect(
      await database
        .select({ id: jobApplications.id })
        .from(jobApplications)
        .where(eq(jobApplications.userId, candidate.id)),
    ).toHaveLength(1);
  });

  test("over-long fields are refused field by field without a request", async ({
    page,
  }) => {
    const posts = recordRequests(page, call("POST", LIST));
    await page.goto("/dashboard/applications/new");
    const short = [
      "Company *",
      "Position *",
      "Location",
      "Salary range",
      "Contact name",
      "Recruiter",
    ];
    for (const label of short)
      await page.getByLabel(label, { exact: true }).fill("a".repeat(301));
    await page
      .getByLabel("Job description", { exact: true })
      .fill("j".repeat(50_001));
    await page.getByLabel("Notes", { exact: true }).fill("n".repeat(20_001));
    await saveApplication(page).click();
    await expect(page.getByText(TOO_LONG, { exact: true })).toHaveCount(
      short.length,
    );
    await expect(
      page.getByText("Keep this under 50,000 characters", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Keep this under 20,000 characters", { exact: true }),
    ).toBeVisible();
    expect(posts).toHaveLength(0);
  });

  test("a listing link must start with http or https", async ({ page }) => {
    const posts = recordRequests(page, call("POST", LIST));
    await page.goto("/dashboard/applications/new");
    await page.getByLabel("Company *", { exact: true }).fill("Northwind");
    await page.getByLabel("Position *", { exact: true }).fill("Data Engineer");
    const link = page.getByLabel("Listing URL", { exact: true });
    // The form turns off the browser's checks, so each reaches the schema.
    for (const value of [
      "example.com",
      "ftp://example.com",
      "javascript:alert(1)",
    ]) {
      await link.fill(value);
      await saveApplication(page).click();
      await expect(page.getByText(BAD_LINK, { exact: true })).toBeVisible();
      await expect(link).toHaveAttribute("aria-invalid", "true");
    }
    expect(posts).toHaveLength(0);
  });

  test("an over-long listing link gets the house message", async ({ page }) => {
    const posts = recordRequests(page, call("POST", LIST));
    await page.goto("/dashboard/applications/new");
    await page.getByLabel("Company *", { exact: true }).fill("Northwind");
    await page.getByLabel("Position *", { exact: true }).fill("Data Engineer");
    await page
      .getByLabel("Listing URL", { exact: true })
      .fill(`https://example.com/${"a".repeat(1990)}`);
    await saveApplication(page).click();
    await expect(page.getByText(BAD_LINK, { exact: true })).toBeVisible();
    expect(posts).toHaveLength(0);
    expectedFail(
      'src/app/api/applications/validators.ts:15: .max(2000) on httpUrl reuses its custom message, so a valid but over-long https link reads "Enter a link starting with https://"',
    );
    await expect(
      page.getByText("Keep this under 2,000 characters", { exact: true }),
    ).toBeVisible({ timeout: 2_000 });
  });

  test("an invalid contact email is refused", async ({ page }) => {
    const posts = recordRequests(page, call("POST", LIST));
    await page.goto("/dashboard/applications/new");
    await page.getByLabel("Company *", { exact: true }).fill("Northwind");
    await page.getByLabel("Position *", { exact: true }).fill("Data Engineer");
    const email = page.getByLabel("Contact email", { exact: true });
    await email.fill("not-an-email");
    await saveApplication(page).click();
    await expect(
      page.getByText("Invalid email", { exact: true }),
    ).toBeVisible();
    await expect(email).toHaveAttribute("aria-invalid", "true");
    expect(posts).toHaveLength(0);
  });

  test("a cleared date applied is saved as no date", async ({
    page,
    request,
  }) => {
    await page.goto("/dashboard/applications/new");
    await page.getByLabel("Company *", { exact: true }).fill("Northwind");
    await page.getByLabel("Position *", { exact: true }).fill("Data Engineer");
    await page.getByLabel("Date applied", { exact: true }).fill("");
    const created = responseTo(page, "POST", LIST);
    await saveApplication(page).click();
    const response = await created;
    expect(response.status()).toBe(201);
    const raw: unknown = await response.json();
    const stored = await storedApplication(
      request,
      applicationJsonResponseSchema.parse(raw).id,
    );
    expect(stored.appliedAt).toBeUndefined();
    // Without a date applied the row falls back to when it was added.
    await expect(row(page, "Northwind")).toContainText(
      new Intl.DateTimeFormat("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date()),
    );
  });

  test("a server error keeps the form and its values", async ({ page }) => {
    let posts = 0;
    await page.route(`**${LIST}`, (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      posts += 1;
      return route.fulfill({ status: 500, json: { error: "Bad" } });
    });
    await page.goto("/dashboard/applications/new");
    await page.getByLabel("Company *", { exact: true }).fill("Northwind");
    await page.getByLabel("Position *", { exact: true }).fill("Data Engineer");
    await saveApplication(page).click();
    await expect(toast(page, SAVE_FAILED)).toBeVisible();
    await expect(page).toHaveURL(/\/dashboard\/applications\/new$/);
    await expect(page.getByLabel("Company *", { exact: true })).toHaveValue(
      "Northwind",
    );
    await expect(saveApplication(page)).toBeEnabled();
    expect(posts).toBe(1);
  });

  test("Save is disabled while saving and sends one request", async ({
    page,
  }) => {
    const pending = await hold(page, `**${LIST}`);
    await page.goto("/dashboard/applications/new");
    await page.getByLabel("Company *", { exact: true }).fill("Northwind");
    await page.getByLabel("Position *", { exact: true }).fill("Data Engineer");
    await saveApplication(page).click();
    await expect(
      page.getByRole("button", { name: "Saving…", exact: true }),
    ).toBeDisabled();
    await page.getByLabel("Company *", { exact: true }).press("Enter");
    expect(pending.requests).toHaveLength(1);
    pending.release();
    await expect(toast(page, "Application saved")).toBeVisible();
    expect(pending.requests).toHaveLength(1);
  });

  test("Cancel goes back to the list without saving", async ({ page }) => {
    const posts = recordRequests(page, call("POST", LIST));
    await page.goto("/dashboard/applications/new");
    await page.getByLabel("Company *", { exact: true }).fill("Northwind");
    await page.getByRole("link", { name: "Cancel", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard\/applications$/);
    await expect(row(page, "Example Industries")).toBeVisible();
    await expect(row(page, "Northwind")).toHaveCount(0);
    expect(posts).toHaveLength(0);
  });
});

test.describe("Edit application", { tag: "@edit-application" }, () => {
  test("the form opens with the stored values and saves the changes", async ({
    page,
    request,
    candidate,
  }) => {
    const id = candidate.applicationId;
    await openEdit(page, id, "Example Industries");
    await expect(
      page.getByText("Software Engineer at Example Industries", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByLabel("Position *", { exact: true })).toHaveValue(
      "Software Engineer",
    );
    await expect(
      page.getByLabel("Job description", { exact: true }),
    ).toHaveValue("Build reliable web applications using TypeScript.");
    await expect(page.getByLabel("Status", { exact: true })).toHaveText(
      "Applied",
    );
    await expect(page.getByLabel("Date applied", { exact: true })).toHaveValue(
      "",
    );

    await page.getByLabel("Location", { exact: true }).fill("Remote");
    await chooseStatus(page, "Offer");
    await page.getByLabel("Date applied", { exact: true }).fill("2026-03-01");
    await page.getByLabel("Contact email", { exact: true }).fill("a@b.test");
    await page.getByLabel("Notes", { exact: true }).fill("Offer call booked.");
    await saveChanges(page).click();
    await expect(toast(page, "Changes saved")).toBeVisible();
    await expect(page).toHaveURL(/\/dashboard\/applications$/);
    const listed = row(page, "Example Industries");
    await expect(listed.getByText("Offer", { exact: true })).toBeVisible();
    await expect(listed.getByText("Remote", { exact: true })).toBeVisible();
    expect(await storedApplication(request, id)).toMatchObject({
      location: "Remote",
      status: "offer",
      appliedAt: "2026-03-01T00:00:00.000Z",
      contactEmail: "a@b.test",
      notes: "Offer call booked.",
    });

    await openEdit(page, id, "Example Industries");
    await expect(page.getByLabel("Status", { exact: true })).toHaveText(
      "Offer",
    );
    await expect(page.getByLabel("Date applied", { exact: true })).toHaveValue(
      "2026-03-01",
    );
    await page.getByLabel("Date applied", { exact: true }).fill("");
    await saveChanges(page).click();
    await expect(page).toHaveURL(/\/dashboard\/applications$/);
    await expect
      .poll(async () => (await storedApplication(request, id)).appliedAt)
      .toBeUndefined();
  });

  test("an unknown id or another account's application does not load", async ({
    page,
    createCandidate,
  }) => {
    const other = await createCandidate();
    for (const id of ["does-not-exist", other.applicationId]) {
      await page.goto(`/dashboard/applications/${id}`);
      await expect(
        page.getByRole("heading", { name: "Edit application", level: 1 }),
      ).toBeVisible();
      await expect(page.getByRole("main").getByRole("alert")).toContainText(
        NOT_LOADED,
      );
      await expect(page.getByLabel("Company *", { exact: true })).toHaveCount(
        0,
      );
    }
  });

  test("a rejected detail request shows the same notice", async ({
    page,
    candidate,
  }) => {
    const id = candidate.applicationId;
    await page.route(`**${LIST}/${id}`, (route) =>
      route.request().method() === "GET"
        ? route.fulfill({ status: 403, json: { error: "Nope" } })
        : route.fallback(),
    );
    await page.goto(`/dashboard/applications/${id}`);
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      NOT_LOADED,
    );
  });

  test("a cleared company or a bad value is refused without a request", async ({
    page,
    candidate,
  }) => {
    const puts = recordRequests(
      page,
      call("PUT", `${LIST}/${candidate.applicationId}`),
    );
    await openEdit(page, candidate.applicationId, "Example Industries");
    await page.getByLabel("Company *", { exact: true }).fill("");
    await page.getByLabel("Position *", { exact: true }).fill("p".repeat(301));
    await page.getByLabel("Listing URL", { exact: true }).fill("example.com");
    await page
      .getByLabel("Contact email", { exact: true })
      .fill("not-an-email");
    await saveChanges(page).click();
    for (const message of [
      "Company is required",
      TOO_LONG,
      BAD_LINK,
      "Invalid email",
    ])
      await expect(page.getByText(message, { exact: true })).toBeVisible();
    expect(puts).toHaveLength(0);
  });

  test(
    "saving an application deleted elsewhere fails and keeps the edits",
    { tag: "@GAP-two-tab-concurrency" },
    async ({ page, request, candidate }) => {
      const id = candidate.applicationId;
      await openEdit(page, id, "Example Industries");
      expect((await request.delete(`${LIST}/${id}`)).status()).toBe(200);
      await page.getByLabel("Notes", { exact: true }).fill("Too late");
      const updated = responseTo(page, "PUT", `${LIST}/${id}`);
      await saveChanges(page).click();
      const response = await updated;
      expect(response.status()).toBe(404);
      expect(await response.json()).toEqual({
        error: "Application not found",
      });
      await expect(toast(page, CHANGES_FAILED)).toBeVisible();
      await expect(page).toHaveURL(`/dashboard/applications/${id}`);
      await expect(page.getByLabel("Notes", { exact: true })).toHaveValue(
        "Too late",
      );
    },
  );

  test("a server error is reported once and the edits stay", async ({
    page,
    candidate,
  }) => {
    const id = candidate.applicationId;
    let puts = 0;
    await page.route(`**${LIST}/${id}`, (route) => {
      if (route.request().method() !== "PUT") return route.fallback();
      puts += 1;
      return route.fulfill({ status: 500, json: { error: "Bad" } });
    });
    await openEdit(page, id, "Example Industries");
    await page.getByLabel("Notes", { exact: true }).fill("Kept");
    await saveChanges(page).click();
    await expect(toast(page, CHANGES_FAILED)).toBeVisible();
    await expect(page.getByLabel("Notes", { exact: true })).toHaveValue("Kept");
    expect(puts).toBe(1);
  });

  test("Save is disabled while saving and sends one request", async ({
    page,
    candidate,
  }) => {
    const id = candidate.applicationId;
    const pending = await hold(page, `**${LIST}/${id}`, "PUT");
    await openEdit(page, id, "Example Industries");
    await page.getByLabel("Notes", { exact: true }).fill("Pending");
    await saveChanges(page).click();
    await expect(
      page.getByRole("button", { name: "Saving…", exact: true }),
    ).toBeDisabled();
    expect(pending.requests).toHaveLength(1);
    pending.release();
    await expect(toast(page, "Changes saved")).toBeVisible();
  });

  test("Cancel discards the edits", async ({ page, candidate }) => {
    const id = candidate.applicationId;
    const puts = recordRequests(page, call("PUT", `${LIST}/${id}`));
    await openEdit(page, id, "Example Industries");
    await page.getByLabel("Notes", { exact: true }).fill("Discarded");
    await page.getByRole("link", { name: "Cancel", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard\/applications$/);
    await openEdit(page, id, "Example Industries");
    await expect(page.getByLabel("Notes", { exact: true })).toHaveValue("");
    expect(puts).toHaveLength(0);
  });

  test("Tailor resume opens the tailor page for this application", async ({
    page,
    candidate,
  }) => {
    const id = candidate.applicationId;
    await openEdit(page, id, "Example Industries");
    await page
      .getByRole("main")
      .getByRole("link", { name: "Tailor resume", exact: true })
      .click();
    await expect(page).toHaveURL(`/dashboard/applications/${id}/resume`);
    await expect(
      page.getByRole("heading", { name: "Tailor resume", level: 1 }),
    ).toBeVisible();
  });
});

const coverLetterIdSchema = z.object({ id: z.string() });

test.describe(
  "Delete application with confirmation",
  { tag: ["@delete-application", "@GAP-delete-application-side-effects"] },
  () => {
    test("the confirmation names what goes with it; its letters are deleted and its resumes kept", async ({
      page,
      request,
      database,
      candidate,
    }) => {
      const id = candidate.applicationId;
      const letter = await request.post("/api/cover-letters", {
        data: {
          title: "Linked letter",
          content: "Dear team",
          jobApplicationId: id,
        },
      });
      expect(letter.status()).toBe(201);
      const letterRaw: unknown = await letter.json();
      const letterId = coverLetterIdSchema.parse(letterRaw).id;
      const resume = await seedGeneratedResume(request, {
        title: "Linked resume",
        jobApplicationId: id,
      });

      await page.goto("/dashboard/applications");
      await deleteButton(page, "Example Industries").click();
      const dialog = page.getByRole("alertdialog", {
        name: "Delete this application?",
      });
      await expect(dialog).toContainText(
        "Software Engineer at Example Industries will be removed from your tracker, along with cover letters written for it and any resume still being tailored for it. Saved resumes are kept. This can't be undone.",
      );
      const deleted = responseTo(page, "DELETE", `${LIST}/${id}`);
      await dialog.getByRole("button", { name: "Delete", exact: true }).click();
      expect((await deleted).status()).toBe(200);
      await expect(dialog).toBeHidden();
      await expect(toast(page, "Application deleted")).toBeVisible();
      await expect(
        page
          .getByRole("main")
          .getByRole("heading", { name: "No applications yet", level: 2 }),
      ).toBeVisible();

      expect((await request.get(`${LIST}/${id}`)).status()).toBe(404);
      expect(
        await database
          .select({ id: coverLetters.id })
          .from(coverLetters)
          .where(eq(coverLetters.id, letterId)),
      ).toEqual([]);
      expect(
        await database
          .select({ jobApplicationId: resumes.jobApplicationId })
          .from(resumes)
          .where(eq(resumes.id, resume.id)),
      ).toEqual([{ jobApplicationId: null }]);

      await page
        .getByRole("navigation", { name: "Main" })
        .getByRole("link", { name: "Cover letters", exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: "No cover letters yet" }),
      ).toBeVisible();
    });

    test("the edit page of a deleted application says it didn't load", async ({
      page,
      candidate,
    }) => {
      const id = candidate.applicationId;
      await page.goto("/dashboard/applications");
      await deleteButton(page, "Example Industries").click();
      await page
        .getByRole("alertdialog")
        .getByRole("button", { name: "Delete", exact: true })
        .click();
      await expect(toast(page, "Application deleted")).toBeVisible();
      await page.goto(`/dashboard/applications/${id}`);
      await expect(page.getByRole("main").getByRole("alert")).toContainText(
        NOT_LOADED,
      );
    });

    test("Cancel and Escape keep the application", async ({
      page,
      database,
      candidate,
    }) => {
      const deletes = recordRequests(
        page,
        call("DELETE", `${LIST}/${candidate.applicationId}`),
      );
      await page.goto("/dashboard/applications");
      const dialog = page.getByRole("alertdialog");
      await deleteButton(page, "Example Industries").click();
      await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
      await expect(dialog).toBeHidden();
      await deleteButton(page, "Example Industries").click();
      await expect(dialog).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      await expect(row(page, "Example Industries")).toBeVisible();
      expect(deletes).toHaveLength(0);
      expect(
        await database
          .select({ id: jobApplications.id })
          .from(jobApplications)
          .where(eq(jobApplications.id, candidate.applicationId)),
      ).toHaveLength(1);
    });

    test("a server error keeps the application and says so", async ({
      page,
      database,
      candidate,
    }) => {
      const id = candidate.applicationId;
      await page.route(`**${LIST}/${id}`, (route) =>
        route.request().method() === "DELETE"
          ? route.fulfill({ status: 500, json: { error: "Bad" } })
          : route.fallback(),
      );
      await page.goto("/dashboard/applications");
      await deleteButton(page, "Example Industries").click();
      await page
        .getByRole("alertdialog")
        .getByRole("button", { name: "Delete", exact: true })
        .click();
      await expect(page.getByRole("alertdialog")).toBeHidden();
      await expect(toast(page, DELETE_FAILED)).toBeVisible();
      await expect(row(page, "Example Industries")).toBeVisible();
      expect(
        await database
          .select({ id: jobApplications.id })
          .from(jobApplications)
          .where(eq(jobApplications.id, id)),
      ).toHaveLength(1);
    });

    test(
      "an application already deleted elsewhere leaves the list",
      { tag: "@GAP-two-tab-concurrency" },
      async ({ page, request, candidate }) => {
        const id = candidate.applicationId;
        await page.goto("/dashboard/applications");
        await expect(row(page, "Example Industries")).toBeVisible();
        expect((await request.delete(`${LIST}/${id}`)).status()).toBe(200);
        const deleted = responseTo(page, "DELETE", `${LIST}/${id}`);
        await deleteButton(page, "Example Industries").click();
        await page
          .getByRole("alertdialog")
          .getByRole("button", { name: "Delete", exact: true })
          .click();
        expect((await deleted).status()).toBe(404);
        await expect(page.getByRole("alertdialog")).toBeHidden();
        await expect(toast(page, DELETE_FAILED)).toBeVisible();
        expectedFail(
          "src/app/dashboard/applications/mutations/use-delete-application.ts:25: only onSuccess refreshes the list, so after a 404 the deleted application stays listed",
        );
        await expect(
          page
            .getByRole("main")
            .getByRole("heading", { name: "No applications yet", level: 2 }),
        ).toBeVisible({ timeout: 2_000 });
      },
    );

    test("every delete button is disabled while one delete is pending", async ({
      page,
      request,
      candidate,
    }) => {
      await seedApplication(request, {
        company: "Second Co",
        position: "Engineer",
      });
      const pending = await hold(
        page,
        `**${LIST}/${candidate.applicationId}`,
        "DELETE",
      );
      await page.goto("/dashboard/applications");
      await deleteButton(page, "Example Industries").click();
      await page
        .getByRole("alertdialog")
        .getByRole("button", { name: "Delete", exact: true })
        .click();
      await expect(page.getByRole("alertdialog")).toBeHidden();
      await expect(deleteButton(page, "Example Industries")).toBeDisabled();
      await expect(deleteButton(page, "Second Co")).toBeDisabled();
      expect(pending.requests).toHaveLength(1);
      pending.release();
      await expect(toast(page, "Application deleted")).toBeVisible();
      await expect(deleteButton(page, "Second Co")).toBeEnabled();
      await expect(row(page, "Example Industries")).toHaveCount(0);
    });
  },
);

test.describe(
  "Tailor resume page states without generating",
  { tag: "@tailor-resume-page-states" },
  () => {
    function resumeTitle(page: Page) {
      return page.getByLabel("Resume title", { exact: true });
    }

    test("the form suggests a title and matching, and links back to the application", async ({
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
      await expect(resumeTitle(page)).toHaveValue(
        "Software Engineer Resume - Example Industries",
      );
      await expect(
        page.getByRole("radio", { name: "1 page", exact: true }),
      ).toBeChecked();
      await expect(
        page.getByLabel("Match content to the job description", {
          exact: true,
        }),
      ).toBeChecked();
      const limits = page.getByRole("group", { name: "Include at most" });
      for (const [label, value] of [
        ["Work experiences", "4"],
        ["Projects", "3"],
        ["Skills", "12"],
      ] as const)
        await expect(limits.getByLabel(new RegExp(`^${label}`))).toHaveValue(
          value,
        );
      await expect(
        page.getByText(
          "Select Preview to compile this resume and check how it fits the page.",
          { exact: true },
        ),
      ).toBeVisible();
      await expect(
        page.getByText(
          "A resume is already saved for this application. Saving again replaces it.",
        ),
      ).toHaveCount(0);

      await page
        .getByRole("main")
        .getByRole("link", { name: "Application", exact: true })
        .click();
      await expect(page).toHaveURL(`/dashboard/applications/${id}`);
      await expect(
        page.getByRole("heading", { name: "Edit application", level: 1 }),
      ).toBeVisible();
    });

    test("an unknown, deleted or unreadable application shows the notice", async ({
      page,
      request,
      candidate,
    }) => {
      await page.goto("/dashboard/applications/does-not-exist/resume");
      const notice = page.getByRole("main").getByRole("alert");
      await expect(notice).toContainText(NOT_LOADED);
      await expect(
        page.getByRole("button", { name: "Save and download PDF" }),
      ).toHaveCount(0);

      const second = await seedApplication(request, {
        company: "Gone Co",
        position: "Engineer",
      });
      expect((await request.delete(`${LIST}/${second.id}`)).status()).toBe(200);
      await page.goto(`/dashboard/applications/${second.id}/resume`);
      await expect(notice).toContainText(NOT_LOADED);

      const id = candidate.applicationId;
      await page.route(`**${LIST}/${id}/resume`, (route) =>
        route.request().method() === "GET"
          ? route.fulfill({ status: 403, json: { error: "Nope" } })
          : route.fallback(),
      );
      await page.goto(`/dashboard/applications/${id}/resume`);
      await expect(notice).toContainText(NOT_LOADED);
    });

    test("without a job description matching is replaced by a prompt to add one", async ({
      page,
      database,
      candidate,
    }) => {
      const id = candidate.applicationId;
      await database
        .update(jobApplications)
        .set({ jobDescription: null })
        .where(eq(jobApplications.id, id));
      await page.goto(`/dashboard/applications/${id}/resume`);
      const notice = page.getByRole("main").getByText("No job description", {
        exact: true,
      });
      await expect(notice).toBeVisible();
      await expect(
        page.getByRole("link", {
          name: "Add the job description",
          exact: true,
        }),
      ).toHaveAttribute("href", `/dashboard/applications/${id}`);
      await expect(
        page.getByLabel("Match content to the job description"),
      ).toHaveCount(0);
      await expect(resumeTitle(page)).toHaveValue(
        "Software Engineer Resume - Example Industries",
      );
    });

    test("an application with a saved resume says saving again replaces it", async ({
      page,
      request,
      candidate,
    }) => {
      await seedGeneratedResume(request, {
        title: "Old tailored",
        jobApplicationId: candidate.applicationId,
      });
      await page.goto(
        `/dashboard/applications/${candidate.applicationId}/resume`,
      );
      await expect(
        page.getByText(
          "A resume is already saved for this application. Saving again replaces it.",
          { exact: true },
        ),
      ).toBeVisible();
    });

    test("a cleared title is not refilled and blocks both actions", async ({
      page,
      candidate,
    }) => {
      const jobs = recordRequests(
        page,
        call("POST", "/api/resume-generation/jobs"),
      );
      await page.goto(
        `/dashboard/applications/${candidate.applicationId}/resume`,
      );
      await expect(resumeTitle(page)).toHaveValue(
        "Software Engineer Resume - Example Industries",
      );
      await resumeTitle(page).fill("");
      await page.getByRole("button", { name: "Preview", exact: true }).click();
      await expect(
        page.getByText("Resume title is required", { exact: true }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Save and download PDF", exact: true })
        .click();
      await expect(resumeTitle(page)).toHaveValue("");
      await resumeTitle(page).fill("t".repeat(301));
      await page.getByRole("button", { name: "Preview", exact: true }).click();
      await expect(page.getByText(TOO_LONG, { exact: true })).toBeVisible();
      expect(jobs).toHaveLength(0);
    });

    test("turning matching off hides its limits, and the location is shown", async ({
      page,
      request,
      candidate,
    }) => {
      const id = candidate.applicationId;
      expect(
        (
          await request.put(`${LIST}/${id}`, { data: { location: "Remote" } })
        ).status(),
      ).toBe(200);
      await page.goto(`/dashboard/applications/${id}/resume`);
      await expect(
        page.getByText("Software Engineer at Example Industries, Remote", {
          exact: true,
        }),
      ).toBeVisible();
      const limits = page.getByRole("group", { name: "Include at most" });
      await expect(limits).toBeVisible();
      await page
        .getByLabel("Match content to the job description", { exact: true })
        .uncheck();
      await expect(limits).toHaveCount(0);
    });
  },
);
