import type { APIRequestContext, Page } from "@playwright/test";
import { and, eq } from "drizzle-orm";
import { coverLetters, jobApplications } from "../../src/lib/db/schema";
import { coverLetterJsonResponseSchema } from "../../src/app/api/cover-letters/validators";
import { test, expect } from "./support/fixtures";
import {
  completion,
  providerError,
  userPrompt,
  type FakeAI,
} from "./support/fake-ai";
import {
  anonymousRequest,
  errorBody,
  expectedFail,
  MALFORMED_JSON,
  hold,
  recordRequests,
  seedGeneratedResume,
} from "./support/helpers";
import { BASE_URL } from "./support/runtime";

const LETTER = "Dear Example Industries team,\n\nI build reliable web apps.";
const RATE_LIMITED =
  "You're sending requests too quickly. Wait a minute, then try again.";

async function seedLetter(
  request: APIRequestContext,
  data: {
    title: string;
    content?: string;
    isAiGenerated?: boolean;
    jobApplicationId?: string;
  },
) {
  const response = await request.post("/api/cover-letters", {
    data: { content: "Dear team,\n\nThank you.", ...data },
  });
  expect(response.status()).toBe(201);
  const raw: unknown = await response.json();
  return coverLetterJsonResponseSchema.parse(raw);
}

async function chooseApplication(page: Page, name: string) {
  await page.getByLabel("Application", { exact: true }).click();
  await page.getByRole("option", { name, exact: true }).click();
}

/** Drafts a letter through the fake model for the seeded application. */
async function draftForSeededApplication(page: Page, ai: FakeAI) {
  ai.reply(completion(LETTER));
  await page.goto("/dashboard/cover-letters/new");
  await chooseApplication(page, "Software Engineer at Example Industries");
  await page
    .getByRole("button", { name: "Write cover letter", exact: true })
    .click();
  await expect(page.getByLabel("Cover letter text")).toHaveValue(LETTER);
}

function row(page: Page, title: string) {
  return page
    .getByRole("main")
    .getByRole("listitem")
    .filter({ has: page.getByText(title, { exact: true }) });
}

test.describe("Cover letters list: empty state", { tag: "@CL-1" }, () => {
  test("an account with no letters sees the empty state and both write links", async ({
    page,
  }) => {
    await page.goto("/dashboard/cover-letters");
    await expect(
      page.getByRole("heading", { name: "No cover letters yet" }),
    ).toBeVisible();
    const write = page.getByRole("link", { name: "Write cover letter" });
    await expect(write).toHaveCount(2);
    await write.last().click();
    await expect(page).toHaveURL(/\/dashboard\/cover-letters\/new$/);
    await expect(
      page.getByRole("heading", { name: "Write cover letter", level: 1 }),
    ).toBeVisible();
  });
});

test.describe(
  "Cover letters list: rows and load failures",
  { tag: "@CL-2" },
  () => {
    test("lists only this account's letters, newest first, marking AI drafts", async ({
      page,
      request,
      database,
      createCandidate,
      playwright,
      extraHTTPHeaders,
    }) => {
      const older = await seedLetter(request, {
        title: "Older manual letter",
        isAiGenerated: false,
      });
      await database
        .update(coverLetters)
        .set({ createdAt: new Date(Date.now() - 60 * 60_000) })
        .where(eq(coverLetters.id, older.id));
      await seedLetter(request, {
        title: "Newer AI letter",
        isAiGenerated: true,
      });
      const other = await createCandidate();
      const otherRequest = await playwright.request.newContext({
        baseURL: BASE_URL,
        storageState: other.storageState,
        extraHTTPHeaders,
      });
      try {
        await seedLetter(otherRequest, { title: "Other account letter" });
      } finally {
        await otherRequest.dispose();
      }

      await page.goto("/dashboard/cover-letters");
      const rows = page.getByRole("main").getByRole("listitem");
      await expect(rows).toHaveCount(2);
      await expect(rows.first()).toContainText("Newer AI letter");
      await expect(rows.last()).toContainText("Older manual letter");
      await expect(
        row(page, "Newer AI letter").getByText("Drafted with AI", {
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        row(page, "Older manual letter").getByText("Drafted with AI"),
      ).toHaveCount(0);
      await expect(page.getByText("Other account letter")).toHaveCount(0);
    });

    test("a rejected list request shows the error, and Try again recovers", async ({
      page,
      request,
    }) => {
      await seedLetter(request, { title: "Recovered letter" });
      await page.route("**/api/cover-letters", (route) =>
        route.request().method() === "GET"
          ? route.fulfill({ status: 403, json: { error: "List unavailable" } })
          : route.fallback(),
      );
      await page.goto("/dashboard/cover-letters");
      await expect(
        page.getByText("Your cover letters didn't load", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText("List unavailable", { exact: true }),
      ).toBeVisible();
      await page.unroute("**/api/cover-letters");
      await page
        .getByRole("button", { name: "Try again", exact: true })
        .click();
      await expect(row(page, "Recovered letter")).toBeVisible();
    });

    test("a malformed list response is reported at once", async ({ page }) => {
      await page.route("**/api/cover-letters", (route) =>
        route.fulfill({ json: [{ id: 1 }] }),
      );
      await page.goto("/dashboard/cover-letters");
      await expect(
        page.getByText(
          "Received an invalid server response. Please try again.",
          {
            exact: true,
          },
        ),
      ).toBeVisible();
    });

    test("a server error is retried before the error is shown", async ({
      page,
    }) => {
      let attempts = 0;
      await page.route("**/api/cover-letters", (route) => {
        attempts += 1;
        return route.fulfill({
          status: 500,
          json: { error: "Database unavailable" },
        });
      });
      await page.goto("/dashboard/cover-letters");
      await expect(
        page.getByText("Database unavailable", { exact: true }),
      ).toBeVisible({ timeout: 20_000 });
      expect(attempts).toBe(4);
    });
  },
);

test.describe("Delete a cover letter from the list", { tag: "@CL-3" }, () => {
  test("cancel and Escape keep the letter; confirming deletes it", async ({
    page,
    request,
    database,
    candidate,
  }) => {
    await seedLetter(request, { title: "Delete me" });
    await page.goto("/dashboard/cover-letters");
    const deleteButton = page.getByRole("button", {
      name: "Delete Delete me",
      exact: true,
    });
    await deleteButton.click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toContainText(
      '"Delete me" will be removed. This can\'t be undone.',
    );
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(dialog).toBeHidden();
    await deleteButton.click();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(row(page, "Delete me")).toBeVisible();

    await deleteButton.click();
    await dialog.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(
      page.getByText("Cover letter deleted", { exact: true }),
    ).toBeVisible();
    await expect(dialog).toBeHidden();
    await expect(row(page, "Delete me")).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "No cover letters yet" }),
    ).toBeVisible();
    expect(
      await database
        .select()
        .from(coverLetters)
        .where(eq(coverLetters.userId, candidate.id)),
    ).toEqual([]);
  });

  test("every delete button is disabled while one delete is pending", async ({
    page,
    request,
  }) => {
    await seedLetter(request, { title: "First letter" });
    await seedLetter(request, { title: "Second letter" });
    const pending = await hold(page, "**/api/cover-letters/*", "DELETE");
    await page.goto("/dashboard/cover-letters");
    await page
      .getByRole("button", { name: "Delete First letter", exact: true })
      .click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Delete Second letter", exact: true }),
    ).toBeDisabled();
    expect(pending.requests).toHaveLength(1);
    pending.release();
    await expect(
      page.getByText("Cover letter deleted", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Delete Second letter", exact: true }),
    ).toBeEnabled();
  });

  test("a failed delete keeps the letter and says so", async ({
    page,
    request,
    database,
  }) => {
    const letter = await seedLetter(request, { title: "Kept letter" });
    await page.route("**/api/cover-letters/*", (route) =>
      route.request().method() === "DELETE"
        ? route.fulfill({ status: 500, json: { error: "Delete failed" } })
        : route.fallback(),
    );
    await page.goto("/dashboard/cover-letters");
    await page
      .getByRole("button", { name: "Delete Kept letter", exact: true })
      .click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await expect(
      page.getByText("Couldn't delete the cover letter. Try again.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(row(page, "Kept letter")).toBeVisible();
    expect(
      await database
        .select({ id: coverLetters.id })
        .from(coverLetters)
        .where(eq(coverLetters.id, letter.id)),
    ).toHaveLength(1);
  });

  test("a letter already deleted elsewhere leaves the list", async ({
    page,
    request,
  }) => {
    const letter = await seedLetter(request, { title: "Deleted elsewhere" });
    await page.goto("/dashboard/cover-letters");
    await expect(row(page, "Deleted elsewhere")).toBeVisible();
    expect(
      (await request.delete(`/api/cover-letters/${letter.id}`)).status(),
    ).toBe(200);
    const deleted = page.waitForResponse(
      (response) =>
        response.url().endsWith(`/api/cover-letters/${letter.id}`) &&
        response.request().method() === "DELETE",
    );
    await page
      .getByRole("button", { name: "Delete Deleted elsewhere", exact: true })
      .click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    expect((await deleted).status()).toBe(404);
    // Role queries skip the page while the dialog hides it, so a missing row
    // proves nothing until the dialog has gone.
    await expect(page.getByRole("alertdialog")).toBeHidden();
    await expect(
      page.getByText("Couldn't delete the cover letter. Try again.", {
        exact: true,
      }),
    ).toBeVisible();
    expectedFail(
      "src/app/dashboard/cover-letters/mutations/use-delete-cover-letter.ts:24: only onSuccess updates the list, so after a 404 the deleted letter stays listed",
    );
    await expect(row(page, "Deleted elsewhere")).toHaveCount(0, {
      timeout: 2_000,
    });
  });
});

test.describe(
  "Write a cover letter from a saved application",
  { tag: "@CL-4" },
  () => {
    test("drafts from the application through the model, then saves the edited letter", async ({
      page,
      ai,
      database,
      candidate,
    }) => {
      ai.reply(completion(LETTER));
      await page.goto("/dashboard/cover-letters/new");
      await chooseApplication(page, "Software Engineer at Example Industries");
      await expect(page.getByLabel("Company *", { exact: true })).toHaveValue(
        "Example Industries",
      );
      await expect(page.getByLabel("Position *", { exact: true })).toHaveValue(
        "Software Engineer",
      );
      await expect(
        page.getByLabel("Job description", { exact: true }),
      ).toHaveValue("Build reliable web applications using TypeScript.");
      await page.getByLabel("Your name", { exact: true }).fill("Alex Example");
      await page
        .getByRole("button", { name: "Write cover letter", exact: true })
        .click();

      await expect(page.getByLabel("Cover letter text")).toHaveValue(LETTER);
      await expect(page.getByLabel("Title", { exact: true })).toHaveValue(
        "Cover letter for Software Engineer at Example Industries",
      );
      const [request] = ai.requests();
      const prompt = request ? userPrompt(request) : undefined;
      expect(prompt).toContain("Company: Example Industries");
      expect(prompt).toContain("Position: Software Engineer");
      expect(prompt).toContain("Applicant Name: Alex Example");
      expect(prompt).toContain(
        "Build reliable web applications using TypeScript.",
      );
      // With no resume saved, the letter is written from the job alone.
      expect(prompt).not.toContain("Resume/Background Information");

      await page.getByLabel("Title", { exact: true }).fill("My Example letter");
      await page
        .getByLabel("Cover letter text")
        .fill(`${LETTER}\n\nKind regards,\nAlex`);
      await page
        .getByRole("button", { name: "Save cover letter", exact: true })
        .click();
      await expect(
        page.getByText("Cover letter saved", { exact: true }),
      ).toBeVisible();
      await expect(page).toHaveURL(/\/dashboard\/cover-letters$/);
      await expect(
        row(page, "My Example letter").getByText("Drafted with AI", {
          exact: true,
        }),
      ).toBeVisible();
      const [saved] = await database
        .select()
        .from(coverLetters)
        .where(eq(coverLetters.userId, candidate.id));
      expect(saved).toMatchObject({
        title: "My Example letter",
        content: `${LETTER}\n\nKind regards,\nAlex`,
        isAiGenerated: true,
        jobApplicationId: candidate.applicationId,
        resumeId: null,
      });
      // Saving clears the draft.
      await page.goto("/dashboard/cover-letters/new");
      await expect(page.getByLabel("Company *", { exact: true })).toHaveValue(
        "",
      );
    });

    test("shows that it is writing and blocks a second request", async ({
      page,
      ai,
    }) => {
      ai.reply(completion(LETTER));
      const pending = await hold(page, "**/api/cover-letters/generate");
      await page.goto("/dashboard/cover-letters/new");
      await page.getByLabel("Company *", { exact: true }).fill("Manual Co");
      await page
        .getByLabel("Position *", { exact: true })
        .fill("Backend Engineer");
      await page
        .getByRole("button", { name: "Write cover letter", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "Writing…", exact: true }),
      ).toBeDisabled();
      await expect(page.getByRole("status")).toContainText(
        "Writing your letter. This usually takes a few seconds.",
      );
      expect(pending.requests).toHaveLength(1);
      pending.release();
      await expect(page.getByLabel("Cover letter text")).toHaveValue(LETTER);
    });

    test("choosing to type the job in saves the letter unlinked", async ({
      page,
      ai,
      database,
      candidate,
    }) => {
      await draftForSeededApplication(page, ai);
      await chooseApplication(page, "None, I will type the job in");
      await page
        .getByRole("button", { name: "Save cover letter", exact: true })
        .click();
      await expect(
        page.getByText("Cover letter saved", { exact: true }),
      ).toBeVisible();
      const [saved] = await database
        .select({ jobApplicationId: coverLetters.jobApplicationId })
        .from(coverLetters)
        .where(eq(coverLetters.userId, candidate.id));
      expect(saved?.jobApplicationId).toBeNull();
    });

    test("without saved applications the job is typed in by hand", async ({
      page,
      ai,
      request,
      candidate,
      database,
    }) => {
      expect(
        (
          await request.delete(`/api/applications/${candidate.applicationId}`)
        ).status(),
      ).toBe(200);
      ai.reply(completion("Dear Manual Co,\n\nHello."));
      await page.goto("/dashboard/cover-letters/new");
      await expect(page.getByLabel("Company *", { exact: true })).toBeVisible();
      await expect(page.getByLabel("Application", { exact: true })).toHaveCount(
        0,
      );
      await page.getByLabel("Company *", { exact: true }).fill("Manual Co");
      await page
        .getByLabel("Position *", { exact: true })
        .fill("Backend Engineer");
      await page
        .getByRole("button", { name: "Write cover letter", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Save cover letter", exact: true })
        .click();
      await expect(
        page.getByText("Cover letter saved", { exact: true }),
      ).toBeVisible();
      const [saved] = await database
        .select()
        .from(coverLetters)
        .where(eq(coverLetters.userId, candidate.id));
      expect(saved).toMatchObject({
        title: "Cover letter for Backend Engineer at Manual Co",
        jobApplicationId: null,
      });
    });
  },
);

test.describe(
  "Write a cover letter: validation and failures",
  { tag: "@CL-5" },
  () => {
    test("Write stays disabled until both company and position are filled", async ({
      page,
    }) => {
      await page.goto("/dashboard/cover-letters/new");
      const write = page.getByRole("button", {
        name: "Write cover letter",
        exact: true,
      });
      await expect(write).toBeDisabled();
      await page.getByLabel("Company *", { exact: true }).fill("Manual Co");
      await expect(write).toBeDisabled();
      await page.getByLabel("Company *", { exact: true }).fill("");
      await page
        .getByLabel("Position *", { exact: true })
        .fill("Backend Engineer");
      await expect(write).toBeDisabled();
      await page.getByLabel("Company *", { exact: true }).fill("Manual Co");
      await expect(write).toBeEnabled();
    });

    test("blank company and position do not count as filled", async ({
      page,
    }) => {
      await page.goto("/dashboard/cover-letters/new");
      await page.getByLabel("Company *", { exact: true }).fill("   ");
      await page.getByLabel("Position *", { exact: true }).fill("   ");
      await expect(page.getByLabel("Company *", { exact: true })).toHaveValue(
        "   ",
      );
      expectedFail(
        "src/app/dashboard/cover-letters/new/page.tsx:160: canWrite tests the raw strings, and the server's min(1) does not trim, so whitespace passes both",
      );
      await expect(
        page.getByRole("button", { name: "Write cover letter", exact: true }),
      ).toBeDisabled({ timeout: 2_000 });
    });

    test("an over-long company is rejected by the server before the model is called", async ({
      page,
      ai,
    }) => {
      await page.goto("/dashboard/cover-letters/new");
      await page.getByLabel("Company *", { exact: true }).fill("C".repeat(301));
      await page
        .getByLabel("Position *", { exact: true })
        .fill("Backend Engineer");
      const rejected = page.waitForResponse("**/api/cover-letters/generate");
      await page
        .getByRole("button", { name: "Write cover letter", exact: true })
        .click();
      expect((await rejected).status()).toBe(400);
      await expect(
        page.getByText("Invalid request data", { exact: true }),
      ).toBeVisible();
      await expect(page.getByLabel("Cover letter text")).toHaveCount(0);
      expect(ai.requests()).toHaveLength(0);
    });

    test("a model failure is reported and nothing is drafted", async ({
      page,
      ai,
    }) => {
      // Unscripted, the fake provider rejects the call, as a provider outage would.
      await page.goto("/dashboard/cover-letters/new");
      await page.getByLabel("Company *", { exact: true }).fill("Manual Co");
      await page
        .getByLabel("Position *", { exact: true })
        .fill("Backend Engineer");
      await page
        .getByRole("button", { name: "Write cover letter", exact: true })
        .click();
      await expect(
        page.getByText("Failed to generate cover letter. Please try again.", {
          exact: true,
        }),
      ).toBeVisible();
      await expect(page.getByLabel("Cover letter text")).toHaveCount(0);
      expect(ai.requests()).toHaveLength(1);
    });

    test("a provider outage is retried, and a later success is used", async ({
      page,
      ai,
    }) => {
      ai.reply(providerError(503));
      ai.reply(completion(LETTER));
      await page.goto("/dashboard/cover-letters/new");
      await page.getByLabel("Company *", { exact: true }).fill("Manual Co");
      await page
        .getByLabel("Position *", { exact: true })
        .fill("Backend Engineer");
      await page
        .getByRole("button", { name: "Write cover letter", exact: true })
        .click();
      await expect(page.getByLabel("Cover letter text")).toHaveValue(LETTER);
      expect(ai.requests()).toHaveLength(2);
    });

    test("a provider that stays down fails after three attempts", async ({
      page,
      ai,
    }) => {
      for (let attempt = 0; attempt < 3; attempt += 1)
        ai.reply(providerError(503));
      await page.goto("/dashboard/cover-letters/new");
      await page.getByLabel("Company *", { exact: true }).fill("Manual Co");
      await page
        .getByLabel("Position *", { exact: true })
        .fill("Backend Engineer");
      await page
        .getByRole("button", { name: "Write cover letter", exact: true })
        .click();
      await expect(
        page.getByText("Failed to generate cover letter. Please try again.", {
          exact: true,
        }),
      ).toBeVisible();
      expect(ai.requests()).toHaveLength(3);
    });

    test("the per-account limit stops a burst before the model is called", async ({
      page,
      request,
      ai,
    }) => {
      // Rejected requests still count, and the limit is 10 a minute.
      for (let sent = 0; sent < 10; sent += 1)
        expect(
          (
            await request.post("/api/cover-letters/generate", { data: {} })
          ).status(),
        ).toBe(400);
      await page.goto("/dashboard/cover-letters/new");
      await page.getByLabel("Company *", { exact: true }).fill("Manual Co");
      await page
        .getByLabel("Position *", { exact: true })
        .fill("Backend Engineer");
      await page
        .getByRole("button", { name: "Write cover letter", exact: true })
        .click();
      await expect(page.getByText(RATE_LIMITED, { exact: true })).toBeVisible();
      expect(ai.requests()).toHaveLength(0);
    });

    test("a dropped connection gets the page's own message", async ({
      page,
    }) => {
      let aborted = false;
      await page.route("**/api/cover-letters/generate", (route) => {
        aborted = true;
        return route.abort("internetdisconnected");
      });
      await page.goto("/dashboard/cover-letters/new");
      await page.getByLabel("Company *", { exact: true }).fill("Manual Co");
      await page
        .getByLabel("Position *", { exact: true })
        .fill("Backend Engineer");
      await page
        .getByRole("button", { name: "Write cover letter", exact: true })
        .click();
      await expect(
        page.getByText("Failed to fetch", { exact: true }),
      ).toBeVisible();
      expect(aborted).toBe(true);
      expectedFail(
        "src/app/dashboard/cover-letters/new/page.tsx:126: the browser's TypeError message is shown, because error.message is never empty, so the page's fallback never applies",
      );
      await expect(
        page.getByText("Couldn't write the cover letter. Try again.", {
          exact: true,
        }),
      ).toBeVisible({ timeout: 2_000 });
    });
  },
);

test.describe("Resume to draw on", { tag: "@CL-6" }, () => {
  test("with no resumes the page says so and links to the generator", async ({
    page,
  }) => {
    await page.goto("/dashboard/cover-letters/new");
    await expect(
      page.getByText(
        "You have no resumes yet, so the letter will be written from the job alone.",
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Generate a resume", exact: true }),
    ).toHaveAttribute("href", "/dashboard/resumes/generate");
  });

  test("the default resume is used until a tailored one is picked by its application", async ({
    page,
    request,
    ai,
    candidate,
    database,
  }) => {
    const defaultResume = await request.post("/api/resumes", {
      data: {
        title: "Default Resume",
        content: JSON.stringify({ summary: "Default summary text" }),
        isDefault: true,
      },
    });
    expect(defaultResume.status()).toBe(201);
    const tailored = await seedGeneratedResume(request, {
      title: "Tailored Resume",
      jobApplicationId: candidate.applicationId,
      document: { summary: "Tailored summary text" },
    });
    ai.reply(completion(LETTER));
    await page.goto("/dashboard/cover-letters/new");
    await expect(page.getByLabel("Resume to draw on")).toHaveText(
      "Default Resume",
    );
    await chooseApplication(page, "Software Engineer at Example Industries");
    await expect(page.getByLabel("Resume to draw on")).toHaveText(
      "Tailored Resume",
    );
    await page
      .getByRole("button", { name: "Write cover letter", exact: true })
      .click();
    await expect(page.getByLabel("Cover letter text")).toHaveValue(LETTER);
    const [sent] = ai.requests();
    const prompt = sent ? userPrompt(sent) : undefined;
    expect(prompt).toContain("Tailored summary text");
    expect(prompt).not.toContain("Default summary text");
    await page
      .getByRole("button", { name: "Save cover letter", exact: true })
      .click();
    await expect(
      page.getByText("Cover letter saved", { exact: true }),
    ).toBeVisible();
    const [saved] = await database
      .select({ resumeId: coverLetters.resumeId })
      .from(coverLetters)
      .where(eq(coverLetters.userId, candidate.id));
    expect(saved?.resumeId).toBe(tailored.id);
  });

  test("an unreadable resume is left out and the letter is still written", async ({
    page,
    request,
    ai,
  }) => {
    expect(
      (
        await request.post("/api/resumes", {
          data: { title: "Plain text resume", content: "Not JSON at all" },
        })
      ).status(),
    ).toBe(201);
    ai.reply(completion(LETTER));
    await page.goto("/dashboard/cover-letters/new");
    await page.getByLabel("Company *", { exact: true }).fill("Manual Co");
    await page
      .getByLabel("Position *", { exact: true })
      .fill("Backend Engineer");
    await page
      .getByRole("button", { name: "Write cover letter", exact: true })
      .click();
    await expect(page.getByLabel("Cover letter text")).toHaveValue(LETTER);
    const [sent] = ai.requests();
    expect(sent ? userPrompt(sent) : undefined).not.toContain(
      "Resume/Background Information",
    );
  });
});

test.describe("Cover letter draft persistence", { tag: "@CL-7" }, () => {
  test("typed details and a drafted letter survive a reload and can be saved", async ({
    page,
    ai,
    database,
    candidate,
  }) => {
    await draftForSeededApplication(page, ai);
    await page.getByLabel("Your name", { exact: true }).fill("Alex");
    await page.reload();
    await expect(page.getByLabel("Company *", { exact: true })).toHaveValue(
      "Example Industries",
    );
    await expect(page.getByLabel("Your name", { exact: true })).toHaveValue(
      "Alex",
    );
    await expect(page.getByLabel("Cover letter text")).toHaveValue(LETTER);
    // The link to the application is not part of the saved draft.
    await expect(page.getByLabel("Application", { exact: true })).toHaveText(
      "Choose an application",
    );
    await page
      .getByRole("button", { name: "Save cover letter", exact: true })
      .click();
    await expect(
      page.getByText("Cover letter saved", { exact: true }),
    ).toBeVisible();
    const [saved] = await database
      .select({ jobApplicationId: coverLetters.jobApplicationId })
      .from(coverLetters)
      .where(eq(coverLetters.userId, candidate.id));
    expect(saved?.jobApplicationId).toBeNull();
  });

  test("signing out clears the draft", async ({ page, candidate }) => {
    await page.goto("/dashboard/cover-letters/new");
    await page.getByLabel("Company *", { exact: true }).fill("Draft Co");
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/sign-in$/);
    await page.getByLabel("Email", { exact: true }).fill(candidate.email);
    await page.getByLabel("Password", { exact: true }).fill(candidate.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto("/dashboard/cover-letters/new");
    await expect(page.getByLabel("Company *", { exact: true })).toHaveValue("");
  });

  test("a draft left by another account on this browser is discarded", async ({
    page,
    candidate,
  }) => {
    const draft = (ownerId: string, company: string) =>
      JSON.stringify({
        state: {
          manualCompany: company,
          manualPosition: "Seed Role",
          jobDescription: "",
          applicantName: "",
          title: "",
          generatedContent: "",
          ownerId,
        },
        version: 0,
      });
    await page.goto("/dashboard/cover-letters/new");
    await page.evaluate(
      (value) => localStorage.setItem("cover-letter-draft", value),
      draft("another-account", "Other Co"),
    );
    await page.reload();
    await expect(page.getByLabel("Company *", { exact: true })).toHaveValue("");

    await page.evaluate(
      (value) => localStorage.setItem("cover-letter-draft", value),
      draft(candidate.id, "Own Co"),
    );
    await page.reload();
    await expect(page.getByLabel("Company *", { exact: true })).toHaveValue(
      "Own Co",
    );
  });
});

test.describe("Save a drafted cover letter: failures", { tag: "@CL-8" }, () => {
  test("an empty title is refused without a request", async ({ page, ai }) => {
    await draftForSeededApplication(page, ai);
    const posts = recordRequests(
      page,
      (request) =>
        request.method() === "POST" &&
        new URL(request.url()).pathname === "/api/cover-letters",
    );
    await page.getByLabel("Title", { exact: true }).fill("");
    await page
      .getByRole("button", { name: "Save cover letter", exact: true })
      .click();
    await expect(
      page.getByText("Write the cover letter and give it a title first.", {
        exact: true,
      }),
    ).toBeVisible();
    expect(posts).toHaveLength(0);
  });

  test("a blank title is refused like an empty one", async ({
    page,
    ai,
    database,
    candidate,
  }) => {
    await draftForSeededApplication(page, ai);
    await page.getByLabel("Title", { exact: true }).fill("   ");
    const saved = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/api/cover-letters" &&
        response.request().method() === "POST",
    );
    await page
      .getByRole("button", { name: "Save cover letter", exact: true })
      .click();
    expect((await saved).status()).toBe(201);
    expectedFail(
      "src/app/dashboard/cover-letters/new/page.tsx:134: the check is !title and the server's min(1) does not trim, so a blank title is saved",
    );
    expect(
      await database
        .select()
        .from(coverLetters)
        .where(eq(coverLetters.userId, candidate.id)),
    ).toEqual([]);
  });

  test("a server rejection keeps the draft on the page", async ({
    page,
    ai,
  }) => {
    await draftForSeededApplication(page, ai);
    await page.getByLabel("Title", { exact: true }).fill("T".repeat(301));
    const rejected = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/api/cover-letters" &&
        response.request().method() === "POST",
    );
    await page
      .getByRole("button", { name: "Save cover letter", exact: true })
      .click();
    expect((await rejected).status()).toBe(400);
    await expect(
      page.getByText("Couldn't save the cover letter. Try again.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/dashboard\/cover-letters\/new$/);
    await expect(page.getByLabel("Cover letter text")).toHaveValue(LETTER);
  });

  test("an application deleted before saving is named in the error", async ({
    page,
    ai,
    candidate,
    database,
  }) => {
    await draftForSeededApplication(page, ai);
    await database
      .delete(jobApplications)
      .where(eq(jobApplications.id, candidate.applicationId));
    const rejected = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/api/cover-letters" &&
        response.request().method() === "POST",
    );
    await page
      .getByRole("button", { name: "Save cover letter", exact: true })
      .click();
    const response = await rejected;
    expect(response.status()).toBe(400);
    expect(await response.json()).toEqual({
      error:
        "The linked application was not found. Choose another one and try again.",
    });
    await expect(
      page.getByText("Couldn't save the cover letter. Try again.", {
        exact: true,
      }),
    ).toBeVisible();
    expectedFail(
      "src/app/dashboard/cover-letters/new/page.tsx:154: onError ignores the server's message and always shows the generic toast",
    );
    await expect(
      page.getByText(
        "The linked application was not found. Choose another one and try again.",
        { exact: true },
      ),
    ).toBeVisible({ timeout: 2_000 });
  });

  test("Save is disabled while saving and sends one request", async ({
    page,
    ai,
    database,
    candidate,
  }) => {
    await draftForSeededApplication(page, ai);
    const pending = await hold(page, "**/api/cover-letters");
    await page
      .getByRole("button", { name: "Save cover letter", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Saving…", exact: true }),
    ).toBeDisabled();
    expect(pending.requests).toHaveLength(1);
    pending.release();
    await expect(
      page.getByText("Cover letter saved", { exact: true }),
    ).toBeVisible();
    expect(
      await database
        .select()
        .from(coverLetters)
        .where(eq(coverLetters.userId, candidate.id)),
    ).toHaveLength(1);
  });
});

test.describe("Open and edit a cover letter", { tag: "@CL-9" }, () => {
  test("edits to the title and text are saved", async ({
    page,
    request,
    database,
  }) => {
    const letter = await seedLetter(request, {
      title: "Editable",
      content: "Original body",
      isAiGenerated: true,
    });
    await page.goto("/dashboard/cover-letters");
    await row(page, "Editable")
      .getByRole("link", { name: "Open", exact: true })
      .click();
    await expect(page).toHaveURL(`/dashboard/cover-letters/${letter.id}`);
    await expect(page.getByText(/, drafted with AI$/)).toBeVisible();
    const save = page.getByRole("button", {
      name: "Save changes",
      exact: true,
    });
    await expect(save).toBeDisabled();
    await page.getByLabel("Title", { exact: true }).fill("Edited title");
    await page.getByLabel("Cover letter text").fill("Edited body");
    await save.click();
    await expect(
      page.getByText("Changes saved", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Edited title", level: 1 }),
    ).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Cover letter text")).toHaveValue(
      "Edited body",
    );
    const [stored] = await database
      .select({ title: coverLetters.title, content: coverLetters.content })
      .from(coverLetters)
      .where(eq(coverLetters.id, letter.id));
    expect(stored).toEqual({ title: "Edited title", content: "Edited body" });
  });

  test("Save stays disabled for no change or a blank title or text", async ({
    page,
    request,
  }) => {
    const letter = await seedLetter(request, { title: "Unchanged" });
    await page.goto(`/dashboard/cover-letters/${letter.id}`);
    const save = page.getByRole("button", {
      name: "Save changes",
      exact: true,
    });
    await expect(save).toBeDisabled();
    await page.getByLabel("Title", { exact: true }).fill("   ");
    await expect(save).toBeDisabled();
    await page.getByLabel("Title", { exact: true }).fill("Unchanged");
    await page.getByLabel("Cover letter text").fill("");
    await expect(save).toBeDisabled();
  });

  test("an over-long title is rejected and the edits stay", async ({
    page,
    request,
    database,
  }) => {
    const letter = await seedLetter(request, { title: "Stored title" });
    await page.goto(`/dashboard/cover-letters/${letter.id}`);
    await page.getByLabel("Title", { exact: true }).fill("T".repeat(301));
    const rejected = page.waitForResponse(
      (response) => response.request().method() === "PUT",
    );
    await page
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    expect((await rejected).status()).toBe(400);
    await expect(
      page.getByText("Couldn't save the changes. Try again.", { exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Title", { exact: true })).toHaveValue(
      "T".repeat(301),
    );
    const [stored] = await database
      .select({ title: coverLetters.title })
      .from(coverLetters)
      .where(eq(coverLetters.id, letter.id));
    expect(stored?.title).toBe("Stored title");
    expectedFail(
      "src/app/dashboard/cover-letters/[id]/page.tsx:52: the title has no length rule and onError shows a generic toast, so the user is told to retry a save that can never succeed",
    );
    await expect(
      page.getByText("Keep this under 300 characters", { exact: true }),
    ).toBeVisible({ timeout: 2_000 });
  });

  test(
    "a title and text exactly at their limits are saved",
    { tag: "@GAP-long-input-server-only-limits" },
    async ({ page, request, database }) => {
      const letter = await seedLetter(request, { title: "Stored title" });
      await page.goto(`/dashboard/cover-letters/${letter.id}`);
      await page.getByLabel("Title", { exact: true }).fill("T".repeat(300));
      await page
        .getByLabel("Cover letter text", { exact: true })
        .fill("c".repeat(20_000));
      await page
        .getByRole("button", { name: "Save changes", exact: true })
        .click();
      await expect(
        page.getByText("Changes saved", { exact: true }),
      ).toBeVisible();
      const [stored] = await database
        .select({ title: coverLetters.title, content: coverLetters.content })
        .from(coverLetters)
        .where(eq(coverLetters.id, letter.id));
      expect(stored).toEqual({
        title: "T".repeat(300),
        content: "c".repeat(20_000),
      });
    },
  );

  test("a failed save keeps the edits", async ({ page, request }) => {
    const letter = await seedLetter(request, { title: "Stored title" });
    await page.route(`**/api/cover-letters/${letter.id}`, (route) =>
      route.request().method() === "PUT"
        ? route.fulfill({ status: 500, json: { error: "Save failed" } })
        : route.fallback(),
    );
    await page.goto(`/dashboard/cover-letters/${letter.id}`);
    await page.getByLabel("Title", { exact: true }).fill("Edited title");
    await page
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await expect(
      page.getByText("Couldn't save the changes. Try again.", { exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Title", { exact: true })).toHaveValue(
      "Edited title",
    );
  });

  test("saving a letter deleted elsewhere fails without losing the edits", async ({
    page,
    request,
  }) => {
    const letter = await seedLetter(request, { title: "Soon deleted" });
    await page.goto(`/dashboard/cover-letters/${letter.id}`);
    await page.getByLabel("Cover letter text").fill("Unsaved edit");
    expect(
      (await request.delete(`/api/cover-letters/${letter.id}`)).status(),
    ).toBe(200);
    await page
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await expect(
      page.getByText("Couldn't save the changes. Try again.", { exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Cover letter text")).toHaveValue(
      "Unsaved edit",
    );
  });

  test("Save is disabled while saving and sends one request", async ({
    page,
    request,
  }) => {
    const letter = await seedLetter(request, { title: "Pending save" });
    const pending = await hold(
      page,
      `**/api/cover-letters/${letter.id}`,
      "PUT",
    );
    await page.goto(`/dashboard/cover-letters/${letter.id}`);
    await page.getByLabel("Cover letter text").fill("New body");
    await page
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Saving…", exact: true }),
    ).toBeDisabled();
    expect(pending.requests).toHaveLength(1);
    pending.release();
    await expect(
      page.getByText("Changes saved", { exact: true }),
    ).toBeVisible();
  });
});

test.describe("Copy a cover letter", { tag: "@CL-10" }, () => {
  test.use({ permissions: ["clipboard-read", "clipboard-write"] });

  test("copies the text on screen, including unsaved edits", async ({
    page,
    request,
  }) => {
    const letter = await seedLetter(request, { title: "Copy me" });
    await page.goto(`/dashboard/cover-letters/${letter.id}`);
    await page.getByLabel("Cover letter text").fill("Unsaved draft text");
    await page
      .getByRole("button", { name: "Copy letter", exact: true })
      .click();
    await expect(
      page.getByText("Letter copied", { exact: true }),
    ).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      "Unsaved draft text",
    );
  });

  test("a refused clipboard asks the user to copy by hand", async ({
    page,
    request,
  }) => {
    const letter = await seedLetter(request, { title: "No clipboard" });
    await page.goto(`/dashboard/cover-letters/${letter.id}`);
    await page.evaluate(() => {
      Object.defineProperty(navigator.clipboard, "writeText", {
        value: () =>
          Promise.reject(new DOMException("Denied", "NotAllowedError")),
      });
    });
    await page
      .getByRole("button", { name: "Copy letter", exact: true })
      .click();
    await expect(
      page.getByText("Couldn't copy. Select the text and copy it by hand.", {
        exact: true,
      }),
    ).toBeVisible();
  });
});

test.describe("Delete a cover letter from its page", { tag: "@CL-11" }, () => {
  test("cancel keeps it; confirming deletes it and returns to the list", async ({
    page,
    request,
  }) => {
    const letter = await seedLetter(request, { title: "Detail delete" });
    await seedLetter(request, { title: "Survivor" });
    await page.goto(`/dashboard/cover-letters/${letter.id}`);
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    const dialog = page.getByRole("alertdialog");
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(dialog).toBeHidden();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await dialog.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(
      page.getByText("Cover letter deleted", { exact: true }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/dashboard\/cover-letters$/);
    await expect(row(page, "Survivor")).toBeVisible();
    await expect(row(page, "Detail delete")).toHaveCount(0);
    expect(
      (await request.get(`/api/cover-letters/${letter.id}`)).status(),
    ).toBe(404);
  });

  test("a failed delete stays on the page", async ({ page, request }) => {
    const letter = await seedLetter(request, { title: "Undeletable" });
    await page.route(`**/api/cover-letters/${letter.id}`, (route) =>
      route.request().method() === "DELETE"
        ? route.fulfill({ status: 500, json: { error: "Delete failed" } })
        : route.fallback(),
    );
    await page.goto(`/dashboard/cover-letters/${letter.id}`);
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await expect(
      page.getByText("Couldn't delete the cover letter. Try again.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(page).toHaveURL(`/dashboard/cover-letters/${letter.id}`);
    await expect(
      page.getByRole("button", { name: "Delete", exact: true }),
    ).toBeEnabled();
  });
});

test.describe(
  "Cover letter page: missing or someone else's letter",
  { tag: "@CL-12" },
  () => {
    const notLoaded = "This cover letter didn't load";

    test("an unknown or malformed id shows that the letter didn't load", async ({
      page,
    }) => {
      for (const id of ["00000000-0000-4000-8000-000000000000", "not-an-id"]) {
        await page.goto(`/dashboard/cover-letters/${id}`);
        await expect(page.getByText(notLoaded, { exact: true })).toBeVisible();
        await expect(
          page.getByRole("button", { name: "Save changes", exact: true }),
        ).toHaveCount(0);
      }
    });

    test("another account can neither open, change nor delete the letter", async ({
      request,
      createCandidate,
      browser,
      extraHTTPHeaders,
      database,
    }) => {
      const letter = await seedLetter(request, {
        title: "Private letter",
        content: "Private body",
      });
      const other = await createCandidate();
      const context = await browser.newContext({
        baseURL: BASE_URL,
        storageState: other.storageState,
        extraHTTPHeaders,
      });
      try {
        const path = `/api/cover-letters/${letter.id}`;
        for (const response of [
          await context.request.get(path),
          await context.request.put(path, { data: { title: "Taken over" } }),
          await context.request.delete(path),
        ]) {
          expect(response.status()).toBe(404);
          expect(await response.json()).toEqual({
            error: "Cover letter not found",
          });
        }
        const otherPage = await context.newPage();
        await otherPage.goto(`/dashboard/cover-letters/${letter.id}`);
        await expect(
          otherPage.getByText(notLoaded, { exact: true }),
        ).toBeVisible();
      } finally {
        await context.close();
      }
      const [stored] = await database
        .select({ title: coverLetters.title })
        .from(coverLetters)
        .where(eq(coverLetters.id, letter.id));
      expect(stored?.title).toBe("Private letter");
    });
  },
);

test.describe("Cover letters API contract", { tag: "@CL-13" }, () => {
  test("every endpoint requires a session", async ({
    playwright,
    extraHTTPHeaders,
  }) => {
    const anonymous = await anonymousRequest(playwright, extraHTTPHeaders);
    try {
      const id = "00000000-0000-4000-8000-000000000000";
      for (const response of [
        await anonymous.get("/api/cover-letters"),
        await anonymous.post("/api/cover-letters", { data: {} }),
        await anonymous.get(`/api/cover-letters/${id}`),
        await anonymous.put(`/api/cover-letters/${id}`, { data: {} }),
        await anonymous.delete(`/api/cover-letters/${id}`),
        await anonymous.post("/api/cover-letters/generate", { data: {} }),
      ]) {
        expect(response.status()).toBe(401);
        expect(await response.json()).toEqual({ error: "Unauthorized" });
      }
    } finally {
      await anonymous.dispose();
    }
  });

  test("create and update reject invalid bodies with field messages", async ({
    request,
  }) => {
    const cases: [unknown, string][] = [
      [
        { content: "Body" },
        "Invalid input: expected string, received undefined",
      ],
      [{ title: "", content: "Body" }, "Title is required"],
      [{ title: "Title", content: "" }, "Content is required"],
      [
        { title: "T".repeat(301), content: "Body" },
        "Keep this under 300 characters",
      ],
      [
        { title: "Title", content: "C".repeat(20_001) },
        "Keep this under 20,000 characters",
      ],
    ];
    for (const [data, message] of cases) {
      const response = await request.post("/api/cover-letters", { data });
      expect(response.status()).toBe(400);
      const body = await errorBody(response);
      expect(body.error).toBe("Invalid request data");
      expect(body.messages).toContain(message);
    }
    const letter = await seedLetter(request, { title: "Valid" });
    const unlink = await request.put(`/api/cover-letters/${letter.id}`, {
      data: { jobApplicationId: null },
    });
    expect(unlink.status()).toBe(400);
    for (const path of [
      "/api/cover-letters",
      `/api/cover-letters/${letter.id}`,
    ]) {
      const method = path === "/api/cover-letters" ? "post" : "put";
      const malformed = await request[method](path, MALFORMED_JSON);
      expect(malformed.status()).toBe(400);
      expect(await malformed.json()).toEqual({
        error: "Request body must be valid JSON",
      });
    }
  });

  test("ownership is checked on links and cannot be overridden", async ({
    request,
    candidate,
    createCandidate,
  }) => {
    const other = await createCandidate();
    const foreign = await request.post("/api/cover-letters", {
      data: {
        title: "Linked",
        content: "Body",
        jobApplicationId: other.applicationId,
      },
    });
    expect(foreign.status()).toBe(400);
    expect(await foreign.json()).toEqual({
      error:
        "The linked application was not found. Choose another one and try again.",
    });
    const missingResume = await request.post("/api/cover-letters", {
      data: { title: "Linked", content: "Body", resumeId: "missing" },
    });
    expect(missingResume.status()).toBe(400);
    expect(await missingResume.json()).toEqual({
      error:
        "The linked resume was not found. Choose another one and try again.",
    });
    const created = await request.post("/api/cover-letters", {
      data: {
        id: "chosen-id",
        userId: other.id,
        title: "Mine",
        content: "Body",
      },
    });
    expect(created.status()).toBe(201);
    const raw: unknown = await created.json();
    const letter = coverLetterJsonResponseSchema.parse(raw);
    expect(letter.userId).toBe(candidate.id);
    expect(letter.id).not.toBe("chosen-id");
  });

  test("the list filters and validates its query", async ({ request }) => {
    await seedLetter(request, { title: "Manual", isAiGenerated: false });
    await seedLetter(request, { title: "Drafted", isAiGenerated: true });
    const manual = await request.get(
      "/api/cover-letters?isAiGenerated=false&limit=1&offset=0",
    );
    expect(manual.status()).toBe(200);
    const raw: unknown = await manual.json();
    expect(
      coverLetterJsonResponseSchema
        .array()
        .parse(raw)
        .map((letter) => letter.title),
    ).toEqual(["Manual"]);
    for (const query of ["limit=0", "limit=101", "offset=-1", "limit=abc"]) {
      const response = await request.get(`/api/cover-letters?${query}`);
      expect(response.status()).toBe(400);
      expect((await errorBody(response)).error).toBe(
        "Invalid query parameters",
      );
    }
  });

  test("generate validates its body before calling the model", async ({
    request,
    ai,
  }) => {
    const cases: [unknown, string][] = [
      [
        { position: "Engineer" },
        "Invalid input: expected string, received undefined",
      ],
      [{ company: "", position: "Engineer" }, "Company is required"],
      [{ company: "Co", position: "" }, "Position is required"],
      [
        {
          company: "Co",
          position: "Engineer",
          jobDescription: "J".repeat(50_001),
        },
        "Keep this under 50,000 characters",
      ],
      [
        {
          company: "Co",
          position: "Engineer",
          resumeContent: { summary: "R".repeat(100_001) },
        },
        "Resume content is too long to use for a cover letter",
      ],
    ];
    for (const [data, message] of cases) {
      const response = await request.post("/api/cover-letters/generate", {
        data,
      });
      expect(response.status()).toBe(400);
      expect((await errorBody(response)).messages).toContain(message);
    }
    expect(ai.requests()).toHaveLength(0);
  });

  test("generate rejects malformed JSON as a bad request", async ({
    request,
  }) => {
    const response = await request.post(
      "/api/cover-letters/generate",
      MALFORMED_JSON,
    );
    expect(response.status()).toBe(500);
    expectedFail(
      "src/app/api/cover-letters/generate/route.ts:20: request.json() is outside routeErrorResponse, so a SyntaxError becomes a 500 with the parser's message",
    );
    expect(response.status()).toBe(400);
  });

  test("generate allows ten requests a minute per account", async ({
    request,
    createCandidate,
    playwright,
    extraHTTPHeaders,
  }) => {
    for (let sent = 0; sent < 10; sent += 1)
      expect(
        (
          await request.post("/api/cover-letters/generate", { data: {} })
        ).status(),
      ).toBe(400);
    const limited = await request.post("/api/cover-letters/generate", {
      data: {},
    });
    expect(limited.status()).toBe(429);
    expect(await limited.json()).toEqual({ error: RATE_LIMITED });
    const retryAfter = Number(limited.headers()["retry-after"]);
    expect(retryAfter).toBeGreaterThanOrEqual(1);
    expect(retryAfter).toBeLessThanOrEqual(60);

    const other = await createCandidate();
    const otherRequest = await playwright.request.newContext({
      baseURL: BASE_URL,
      storageState: other.storageState,
      extraHTTPHeaders,
    });
    try {
      expect(
        (
          await otherRequest.post("/api/cover-letters/generate", { data: {} })
        ).status(),
      ).toBe(400);
    } finally {
      await otherRequest.dispose();
    }
  });
});

test.describe(
  "Deleting an application removes its cover letters",
  { tag: "@CL-14" },
  () => {
    test("letters written for the application go with it; others stay", async ({
      page,
      request,
      candidate,
      database,
    }) => {
      await seedLetter(request, {
        title: "Linked letter",
        jobApplicationId: candidate.applicationId,
      });
      await seedLetter(request, { title: "Unlinked letter" });
      await page.goto("/dashboard/cover-letters");
      await expect(row(page, "Linked letter")).toBeVisible();
      await page
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
      await expect(
        page.getByText("Application deleted", { exact: true }),
      ).toBeVisible();
      await page
        .getByRole("link", { name: "Cover letters", exact: true })
        .click();
      await expect(row(page, "Unlinked letter")).toBeVisible();
      await expect(row(page, "Linked letter")).toHaveCount(0);
      expect(
        await database
          .select({ title: coverLetters.title })
          .from(coverLetters)
          .where(
            and(
              eq(coverLetters.userId, candidate.id),
              eq(coverLetters.title, "Linked letter"),
            ),
          ),
      ).toEqual([]);
    });
  },
);
