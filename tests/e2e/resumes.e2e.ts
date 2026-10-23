import type { APIRequestContext, Page, Route } from "@playwright/test";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { coverLetters, resumes } from "../../src/lib/db/schema";
import { resumeJsonResponseSchema } from "../../src/app/api/resumes/validators";
import { applicationResumeInfoResponseSchema } from "../../src/app/api/applications/[id]/resume/validators";
import { test, expect, type Database } from "./support/fixtures";
import {
  anonymousRequest,
  call,
  errorBody,
  expectedFail,
  hold,
  isValid,
  MALFORMED_JSON,
  recordRequests,
  responseTo,
  seedGeneratedResume,
} from "./support/helpers";
import { BASE_URL } from "./support/runtime";

const LIST = "/api/resumes";
const TOO_LONG = "Keep this under 300 characters";
const NOT_LOADED = "This resume didn't load";
const LINKED_APPLICATION =
  "The linked application was not found. Choose another one and try again.";
const LEGACY_PDF = "Regenerate this legacy resume to export a LaTeX PDF.";

const MANUAL = {
  personalInfo: {
    name: "Alex Example",
    email: "alex@example.test",
    phone: "+65 5555 0000",
    address: "1 Example Street",
  },
  summary: "Engineer who ships.",
  experience: "Software Engineer, Example Co, 2024 to now",
  education: "BSc Computer Science",
  skills: "TypeScript",
};

async function seedManual(
  request: APIRequestContext,
  {
    title,
    isDefault = false,
    content = JSON.stringify(MANUAL),
  }: { title: string; isDefault?: boolean; content?: string },
) {
  const response = await request.post(LIST, {
    data: { title, content, isDefault },
  });
  expect(response.status()).toBe(201);
  const raw: unknown = await response.json();
  return resumeJsonResponseSchema.parse(raw);
}

async function storedResume(request: APIRequestContext, id: string) {
  const response = await request.get(`${LIST}/${id}`);
  expect(response.status()).toBe(200);
  const raw: unknown = await response.json();
  return resumeJsonResponseSchema.parse(raw);
}

async function defaults(database: Database, userId: string) {
  const rows = await database
    .select({ title: resumes.title, isDefault: resumes.isDefault })
    .from(resumes)
    .where(eq(resumes.userId, userId));
  return rows
    .filter((row) => row.isDefault)
    .map((row) => row.title)
    .sort();
}

function row(page: Page, title: string) {
  return page
    .getByRole("main")
    .getByRole("listitem")
    .filter({ has: page.getByText(title, { exact: true }) });
}

/** Scoped to the toasts, because "Set as default" is also a button label. */
function toast(page: Page, text: string) {
  return page
    .getByRole("region", { name: /^Notifications/ })
    .getByText(text, { exact: true });
}

function emptyState(page: Page) {
  return page
    .getByRole("main")
    .getByRole("heading", { name: "No resumes yet", level: 2 });
}

async function confirmDelete(page: Page, title: string) {
  await page
    .getByRole("main")
    .getByRole("button", { name: `Delete ${title}`, exact: true })
    .click();
  const dialog = page.getByRole("alertdialog", { name: "Delete this resume?" });
  await expect(dialog).toContainText(
    `"${title}" will be removed. This can't be undone.`,
  );
  await dialog.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(dialog).toBeHidden();
}

function resumeTitle(page: Page) {
  return page.getByLabel("Resume title", { exact: true });
}

function useAsDefault(page: Page) {
  return page.getByLabel("Use as my default resume", { exact: true });
}

test.describe("Resume library", { tag: "@resumes-list" }, () => {
  test("rows are most recently updated first with their badges, and Open opens one", async ({
    page,
    request,
    candidate,
  }) => {
    const first = await seedManual(request, { title: "Resume A" });
    await seedManual(request, { title: "Resume B", isDefault: true });
    await seedGeneratedResume(request, {
      title: "Tailored Resume",
      jobApplicationId: candidate.applicationId,
    });
    expect(
      (
        await request.put(`${LIST}/${first.id}`, {
          data: { title: "Resume A2" },
        })
      ).status(),
    ).toBe(200);
    await page.goto("/dashboard/resumes");
    const rows = page.getByRole("main").getByRole("listitem");
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0)).toContainText("Resume A2");
    await expect(rows.nth(1)).toContainText("Tailored Resume");
    await expect(rows.nth(2)).toContainText("Resume B");

    const defaultRow = row(page, "Resume B");
    await expect(defaultRow.getByText("Default", { exact: true })).toHaveCount(
      2,
    );
    await expect(
      defaultRow.getByRole("button", { name: "Default", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    const manual = row(page, "Resume A2");
    await expect(
      manual.getByRole("button", { name: "Set as default", exact: true }),
    ).toHaveAttribute("aria-pressed", "false");
    await expect(manual.getByText("Tailored", { exact: true })).toHaveCount(0);
    await expect(
      row(page, "Tailored Resume").getByText("Tailored", { exact: true }),
    ).toBeVisible();

    await manual.getByRole("link", { name: "Open", exact: true }).click();
    await expect(page).toHaveURL(`/dashboard/resumes/${first.id}`);
    await expect(resumeTitle(page)).toHaveValue("Resume A2");
  });

  test("an empty library offers both ways to make a resume", async ({
    page,
  }) => {
    await page.goto("/dashboard/resumes");
    const main = page.getByRole("main");
    await expect(emptyState(page)).toBeVisible();
    await expect(
      main.getByText(
        "Generate one from your profile, or tailor one to a job from its application.",
        { exact: true },
      ),
    ).toBeVisible();
    // The header and the empty state offer the same two links.
    for (const name of ["Write manually", "Generate from profile"])
      await expect(main.getByRole("link", { name, exact: true })).toHaveCount(
        2,
      );
  });

  test("a rejected list shows its message, and Try again recovers", async ({
    page,
    request,
  }) => {
    await seedManual(request, { title: "Resume A" });
    const matcher = (url: URL) => url.pathname === LIST;
    await page.route(matcher, (route) =>
      route.request().method() === "GET"
        ? route.fulfill({ status: 403, json: { error: "Service down" } })
        : route.fallback(),
    );
    await page.goto("/dashboard/resumes");
    const notice = page.getByRole("main").getByRole("alert");
    await expect(notice).toContainText("Your resumes didn't load");
    await expect(notice).toContainText("Service down");
    await page.unroute(matcher);
    await notice
      .getByRole("button", { name: "Try again", exact: true })
      .click();
    await expect(row(page, "Resume A")).toBeVisible();
    await expect(notice).toHaveCount(0);
  });

  test("a rejection without a message gets the list's fallback", async ({
    page,
  }) => {
    await page.route(
      (url) => url.pathname === LIST,
      (route) =>
        route.request().method() === "GET"
          ? route.fulfill({ status: 403, body: "" })
          : route.fallback(),
    );
    await page.goto("/dashboard/resumes");
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "Failed to fetch resumes",
    );
  });

  test("a malformed list response is reported at once", async ({ page }) => {
    await page.route(
      (url) => url.pathname === LIST,
      (route) =>
        route.request().method() === "GET"
          ? route.fulfill({ json: {} })
          : route.fallback(),
    );
    await page.goto("/dashboard/resumes");
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "Received an invalid server response. Please try again.",
    );
  });

  test("a server error is retried before the error shows", async ({ page }) => {
    let attempts = 0;
    await page.route(
      (url) => url.pathname === LIST,
      (route) => {
        if (route.request().method() !== "GET") return route.fallback();
        attempts += 1;
        return route.fulfill({ status: 503, json: { error: "Service down" } });
      },
    );
    await page.goto("/dashboard/resumes");
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "Service down",
      { timeout: 20_000 },
    );
    expect(attempts).toBe(4);
  });

  test("another account's resumes are not listed", async ({
    page,
    request,
    createCandidate,
    playwright,
    extraHTTPHeaders,
  }) => {
    const other = await createCandidate();
    const otherRequest = await playwright.request.newContext({
      baseURL: BASE_URL,
      storageState: other.storageState,
      extraHTTPHeaders,
    });
    try {
      await seedManual(otherRequest, { title: "Other Account Resume" });
    } finally {
      await otherRequest.dispose();
    }
    await seedManual(request, { title: "My Resume" });
    await page.goto("/dashboard/resumes");
    await expect(row(page, "My Resume")).toBeVisible();
    await expect(page.getByText("Other Account Resume")).toHaveCount(0);
  });
});

test.describe(
  "Toggle the default resume from the library",
  { tag: "@resumes-set-default" },
  () => {
    test("one resume at a time is the default, and it can be removed", async ({
      page,
      request,
      database,
      candidate,
    }) => {
      await seedManual(request, { title: "Resume A" });
      await seedManual(request, { title: "Resume B" });
      await page.goto("/dashboard/resumes");
      const a = row(page, "Resume A");
      const b = row(page, "Resume B");

      await a
        .getByRole("button", { name: "Set as default", exact: true })
        .click();
      await expect(toast(page, "Set as default")).toBeVisible();
      await expect(
        a.getByRole("button", { name: "Default", exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      expect(await defaults(database, candidate.id)).toEqual(["Resume A"]);

      await b
        .getByRole("button", { name: "Set as default", exact: true })
        .click();
      await expect(
        b.getByRole("button", { name: "Default", exact: true }),
      ).toBeVisible();
      await expect(
        a.getByRole("button", { name: "Set as default", exact: true }),
      ).toBeVisible();
      expect(await defaults(database, candidate.id)).toEqual(["Resume B"]);

      await b.getByRole("button", { name: "Default", exact: true }).click();
      await expect(toast(page, "Default removed")).toBeVisible();
      await expect(
        b.getByRole("button", { name: "Set as default", exact: true }),
      ).toBeVisible();
      expect(await defaults(database, candidate.id)).toEqual([]);
    });

    test(
      "toggling an older resume moves it to the top",
      { tag: "@GAP-default-resume-stale-detail" },
      async ({ page, request }) => {
        await seedManual(request, { title: "Older Resume" });
        await seedManual(request, { title: "Newer Resume" });
        await page.goto("/dashboard/resumes");
        const rows = page.getByRole("main").getByRole("listitem");
        await expect(rows.nth(0)).toContainText("Newer Resume");
        await row(page, "Older Resume")
          .getByRole("button", { name: "Set as default", exact: true })
          .click();
        await expect(rows.nth(0)).toContainText("Older Resume");
      },
    );

    test("a failed update says so and keeps the badge", async ({
      page,
      request,
    }) => {
      await seedManual(request, { title: "Resume A" });
      await page.route(`**${LIST}/*`, (route) =>
        route.request().method() === "PUT"
          ? route.fulfill({ status: 500, json: { error: "boom" } })
          : route.fallback(),
      );
      await page.goto("/dashboard/resumes");
      const a = row(page, "Resume A");
      await a
        .getByRole("button", { name: "Set as default", exact: true })
        .click();
      await expect(
        toast(page, "Couldn't update the resume. Try again."),
      ).toBeVisible();
      await expect(
        a.getByRole("button", { name: "Set as default", exact: true }),
      ).toBeEnabled();
      await expect(a.getByText("Default", { exact: true })).toHaveCount(0);
    });

    test("every toggle is disabled while one update is pending", async ({
      page,
      request,
    }) => {
      await seedManual(request, { title: "Resume A" });
      await seedManual(request, { title: "Resume B" });
      const pending = await hold(page, `**${LIST}/*`, "PUT");
      await page.goto("/dashboard/resumes");
      await row(page, "Resume A")
        .getByRole("button", { name: "Set as default", exact: true })
        .click();
      await expect(
        row(page, "Resume B").getByRole("button", {
          name: "Set as default",
          exact: true,
        }),
      ).toBeDisabled();
      await expect(
        row(page, "Resume A").getByRole("button", {
          name: "Set as default",
          exact: true,
        }),
      ).toBeDisabled();
      expect(pending.requests).toHaveLength(1);
      pending.release();
      await expect(toast(page, "Set as default")).toBeVisible();
    });

    test(
      "the old default's editor knows it is no longer the default",
      { tag: "@GAP-default-resume-stale-detail" },
      async ({ page, request }) => {
        const a = await seedManual(request, {
          title: "Resume A",
          isDefault: true,
        });
        await seedManual(request, { title: "Resume B" });
        await page.goto("/dashboard/resumes");
        await row(page, "Resume A")
          .getByRole("link", { name: "Open", exact: true })
          .click();
        await expect(page).toHaveURL(`/dashboard/resumes/${a.id}`);
        await expect(useAsDefault(page)).toBeChecked();
        await page
          .getByRole("main")
          .getByRole("link", { name: "Resumes", exact: true })
          .click();
        await row(page, "Resume B")
          .getByRole("button", { name: "Set as default", exact: true })
          .click();
        await expect(toast(page, "Set as default")).toBeVisible();
        await row(page, "Resume A")
          .getByRole("link", { name: "Open", exact: true })
          .click();
        await expect(resumeTitle(page)).toHaveValue("Resume A");
        expect((await storedResume(request, a.id)).isDefault).toBe(false);
        expectedFail(
          "src/app/dashboard/resumes/mutations/use-update-resume.ts:34: only the changed resume's detail is written to the cache, so the old default's cached detail still says isDefault true",
        );
        await expect(useAsDefault(page)).not.toBeChecked({ timeout: 2_000 });
      },
    );

    test(
      "saving the old default's editor keeps the new default",
      { tag: "@GAP-default-resume-stale-detail" },
      async ({ page, request, database, candidate }) => {
        await seedManual(request, { title: "Resume A", isDefault: true });
        await seedManual(request, { title: "Resume B" });
        await page.goto("/dashboard/resumes");
        await row(page, "Resume A")
          .getByRole("link", { name: "Open", exact: true })
          .click();
        await expect(useAsDefault(page)).toBeChecked();
        await page
          .getByRole("main")
          .getByRole("link", { name: "Resumes", exact: true })
          .click();
        await row(page, "Resume B")
          .getByRole("button", { name: "Set as default", exact: true })
          .click();
        await expect(toast(page, "Set as default")).toBeVisible();
        await row(page, "Resume A")
          .getByRole("link", { name: "Open", exact: true })
          .click();
        await resumeTitle(page).fill("Resume A2");
        await page
          .getByRole("button", { name: "Save changes", exact: true })
          .click();
        await expect(toast(page, "Changes saved")).toBeVisible();
        await expect(row(page, "Resume A2")).toBeVisible();
        expectedFail(
          "src/app/dashboard/resumes/[id]/page.tsx:103: the stale form sends isDefault true, so saving the old default takes the default back",
        );
        expect(await defaults(database, candidate.id)).toEqual(["Resume B"]);
      },
    );
  },
);

test.describe("Delete a resume", { tag: "@resumes-delete" }, () => {
  test("the confirmation names the resume, and deleting removes it", async ({
    page,
    request,
    database,
  }) => {
    const resume = await seedManual(request, { title: "Delete Me" });
    await page.goto("/dashboard/resumes");
    await confirmDelete(page, "Delete Me");
    await expect(toast(page, "Resume deleted")).toBeVisible();
    await expect(emptyState(page)).toBeVisible();
    expect((await request.get(`${LIST}/${resume.id}`)).status()).toBe(404);
    expect(
      await database
        .select({ id: resumes.id })
        .from(resumes)
        .where(eq(resumes.id, resume.id)),
    ).toEqual([]);
  });

  test("Cancel and Escape keep the resume", async ({ page, request }) => {
    const resume = await seedManual(request, { title: "Keep Me" });
    const deletes = recordRequests(
      page,
      call("DELETE", `${LIST}/${resume.id}`),
    );
    await page.goto("/dashboard/resumes");
    const dialog = page.getByRole("alertdialog");
    const remove = page
      .getByRole("main")
      .getByRole("button", { name: "Delete Keep Me", exact: true });
    await remove.click();
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(dialog).toBeHidden();
    await remove.click();
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(row(page, "Keep Me")).toBeVisible();
    expect(deletes).toHaveLength(0);
  });

  test("a failed delete keeps the resume and says so", async ({
    page,
    request,
  }) => {
    await seedManual(request, { title: "Keep Me" });
    await page.route(`**${LIST}/*`, (route) =>
      route.request().method() === "DELETE"
        ? route.fulfill({
            status: 503,
            json: {
              error:
                "The stored file couldn't be deleted. Try again in a moment.",
            },
          })
        : route.fallback(),
    );
    await page.goto("/dashboard/resumes");
    await confirmDelete(page, "Keep Me");
    await expect(
      toast(page, "Couldn't delete the resume. Try again."),
    ).toBeVisible();
    await expect(row(page, "Keep Me")).toBeVisible();
    expectedFail(
      "src/app/dashboard/resumes/page.tsx:35: the catch shows a generic toast, while imported files show the server's storage message for the same failure",
    );
    await expect(
      toast(
        page,
        "The stored file couldn't be deleted. Try again in a moment.",
      ),
    ).toBeVisible({ timeout: 2_000 });
  });

  test("deleting a resume removes its stored PDF", async ({
    page,
    request,
    database,
  }) => {
    // The first PDF request compiles the snapshot with the real compiler.
    test.slow();
    const resume = await seedGeneratedResume(request, { title: "Stored PDF" });
    expect((await request.get(`${LIST}/${resume.id}/pdf`)).status()).toBe(200);
    const pdfKey = async (id: string) => {
      const [stored] = await database
        .select({ pdfKey: resumes.pdfKey })
        .from(resumes)
        .where(eq(resumes.id, id));
      return stored?.pdfKey;
    };
    const key = await pdfKey(resume.id);
    if (!key) throw new Error("The first PDF request stores the file.");
    await page.goto("/dashboard/resumes");
    await confirmDelete(page, "Stored PDF");
    await expect(toast(page, "Resume deleted")).toBeVisible();

    // A row pointing at the old file shows whether that file is still stored:
    // a stored file is served as it is, a missing one is compiled again.
    const probe = await seedGeneratedResume(request, { title: "Probe" });
    await database
      .update(resumes)
      .set({ pdfKey: key })
      .where(eq(resumes.id, probe.id));
    expect((await request.get(`${LIST}/${probe.id}/pdf`)).status()).toBe(200);
    expect(await pdfKey(probe.id)).not.toBe(key);
  });

  test("a resume already deleted elsewhere leaves the list", async ({
    page,
    request,
  }) => {
    const resume = await seedManual(request, { title: "Gone Elsewhere" });
    await page.goto("/dashboard/resumes");
    await expect(row(page, "Gone Elsewhere")).toBeVisible();
    expect((await request.delete(`${LIST}/${resume.id}`)).status()).toBe(200);
    const deleted = responseTo(page, "DELETE", `${LIST}/${resume.id}`);
    await confirmDelete(page, "Gone Elsewhere");
    expect((await deleted).status()).toBe(404);
    await expect(
      toast(page, "Couldn't delete the resume. Try again."),
    ).toBeVisible();
    expectedFail(
      "src/app/dashboard/resumes/mutations/use-delete-resume.ts:24: only onSuccess refreshes the list, so after a 404 the deleted resume stays listed",
    );
    await expect(emptyState(page)).toBeVisible({ timeout: 2_000 });
  });

  test("deleting the default leaves no default", async ({
    page,
    request,
    database,
    candidate,
  }) => {
    await seedManual(request, { title: "Default Resume", isDefault: true });
    await seedManual(request, { title: "Other Resume" });
    await page.goto("/dashboard/resumes");
    await confirmDelete(page, "Default Resume");
    await expect(toast(page, "Resume deleted")).toBeVisible();
    await expect(row(page, "Other Resume")).toBeVisible();
    expect(await defaults(database, candidate.id)).toEqual([]);
  });

  test("a deleted tailored resume frees its application and the letters that used it", async ({
    page,
    request,
    database,
    candidate,
  }) => {
    const id = candidate.applicationId;
    const resume = await seedGeneratedResume(request, {
      title: "Tailored Resume",
      jobApplicationId: id,
    });
    const letter = await request.post("/api/cover-letters", {
      data: { title: "Letter", content: "Dear team", resumeId: resume.id },
    });
    expect(letter.status()).toBe(201);
    const letterRaw: unknown = await letter.json();
    const letterId = z.object({ id: z.string() }).parse(letterRaw).id;

    await page.goto("/dashboard/resumes");
    await confirmDelete(page, "Tailored Resume");
    await expect(toast(page, "Resume deleted")).toBeVisible();

    const info = await request.get(`/api/applications/${id}/resume`);
    expect(info.status()).toBe(200);
    const infoRaw: unknown = await info.json();
    expect(
      applicationResumeInfoResponseSchema.parse(infoRaw).tailoredResume,
    ).toBeNull();
    expect(
      await database
        .select({ resumeId: coverLetters.resumeId })
        .from(coverLetters)
        .where(eq(coverLetters.id, letterId)),
    ).toEqual([{ resumeId: null }]);
    await page.goto(`/dashboard/applications/${id}/resume`);
    await expect(
      page.getByRole("heading", { name: "Tailor resume", level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "A resume is already saved for this application. Saving again replaces it.",
      ),
    ).toHaveCount(0);
  });

  test("a tailored resume outlives its deleted application", async ({
    page,
    request,
    candidate,
  }) => {
    const resume = await seedGeneratedResume(request, {
      title: "Tailored Resume",
      jobApplicationId: candidate.applicationId,
    });
    expect(
      (
        await request.delete(`/api/applications/${candidate.applicationId}`)
      ).status(),
    ).toBe(200);
    expect((await storedResume(request, resume.id)).jobApplicationId).toBe(
      null,
    );
    await page.goto("/dashboard/resumes");
    await expect(
      row(page, "Tailored Resume").getByText("Tailored", { exact: true }),
    ).toBeVisible();
    await page.goto(`/dashboard/resumes/${resume.id}`);
    await expect(
      page.getByRole("link", { name: "Generate again", exact: true }),
    ).toHaveAttribute("href", "/dashboard/resumes/generate");
  });

  test("every delete button is disabled while one delete is pending", async ({
    page,
    request,
  }) => {
    const first = await seedManual(request, { title: "Resume A" });
    await seedManual(request, { title: "Resume B" });
    const pending = await hold(page, `**${LIST}/${first.id}`, "DELETE");
    await page.goto("/dashboard/resumes");
    await confirmDelete(page, "Resume A");
    const main = page.getByRole("main");
    for (const name of ["Delete Resume A", "Delete Resume B"])
      await expect(
        main.getByRole("button", { name, exact: true }),
      ).toBeDisabled();
    expect(pending.requests).toHaveLength(1);
    pending.release();
    await expect(toast(page, "Resume deleted")).toBeVisible();
    await expect(
      main.getByRole("button", { name: "Delete Resume B", exact: true }),
    ).toBeEnabled();
  });
});

test.describe(
  "Write a resume by hand",
  { tag: "@resume-manual-create" },
  () => {
    async function fillResume(page: Page, title: string) {
      await resumeTitle(page).fill(title);
      await page.getByLabel("Full name", { exact: true }).fill("Alex Example");
      await page.getByLabel("Email", { exact: true }).fill("alex@example.test");
      await page.getByLabel("Phone", { exact: true }).fill("+65 5555 0000");
      await page
        .getByLabel("Address", { exact: true })
        .fill("1 Example Street");
      await page
        .getByLabel("Professional summary", { exact: true })
        .fill("Engineer who ships.");
      await page
        .getByLabel("Work experience", { exact: true })
        .fill("Software Engineer, Example Co, 2024 to now");
      await page
        .getByLabel("Education", { exact: true })
        .fill("BSc Computer Science");
      await page.getByLabel("Skills", { exact: true }).fill("TypeScript");
    }

    function saveResume(page: Page) {
      return page.getByRole("button", { name: "Save resume", exact: true });
    }

    test("a typed resume is saved as the default, with no PDF to export", async ({
      page,
      request,
    }) => {
      await page.goto("/dashboard/resumes/new");
      await expect(
        page.getByText(
          "Type a resume by hand. It is kept as text for cover letters and is not compiled into a PDF.",
          { exact: true },
        ),
      ).toBeVisible();
      await fillResume(page, "Manual E2E");
      await useAsDefault(page).check();
      const created = responseTo(page, "POST", LIST);
      await saveResume(page).click();
      const response = await created;
      expect(response.status()).toBe(201);
      await expect(toast(page, "Resume saved")).toBeVisible();
      await expect(page).toHaveURL(/\/dashboard\/resumes$/);
      const saved = row(page, "Manual E2E");
      await expect(saved.getByText("Default", { exact: true })).toHaveCount(2);
      await expect(saved.getByText("Tailored", { exact: true })).toHaveCount(0);

      const raw: unknown = await response.json();
      const resume = await storedResume(
        request,
        resumeJsonResponseSchema.parse(raw).id,
      );
      expect(resume).toMatchObject({
        isDefault: true,
        isTailored: false,
        jobApplicationId: null,
      });
      const content: unknown = JSON.parse(resume.content);
      expect(content).toEqual(MANUAL);
      const pdf = await request.get(`${LIST}/${resume.id}/pdf`);
      expect(pdf.status()).toBe(422);
      expect(await pdf.json()).toEqual({ error: LEGACY_PDF });
    });

    test("an empty or blank title is refused without a request", async ({
      page,
    }) => {
      const posts = recordRequests(page, call("POST", LIST));
      await page.goto("/dashboard/resumes/new");
      await saveResume(page).click();
      await expect(
        page.getByText("Give the resume a title.", { exact: true }),
      ).toBeVisible();
      await expect(resumeTitle(page)).toHaveAttribute("aria-invalid", "true");
      await resumeTitle(page).fill("   ");
      await saveResume(page).click();
      await expect(
        toast(page, "Give the resume a title before saving."),
      ).toBeVisible();
      await expect(page).toHaveURL(/\/dashboard\/resumes\/new$/);
      expect(posts).toHaveLength(0);
    });

    test("an address the browser rejects stops the form", async ({ page }) => {
      const posts = recordRequests(page, call("POST", LIST));
      await page.goto("/dashboard/resumes/new");
      await resumeTitle(page).fill("Manual E2E");
      const email = page.getByLabel("Email", { exact: true });
      await email.fill("alex@");
      await saveResume(page).click();
      expect(await isValid(email)).toBe(false);
      expect(posts).toHaveLength(0);
    });

    test("an over-long title is explained before it is sent", async ({
      page,
    }) => {
      await page.goto("/dashboard/resumes/new");
      await resumeTitle(page).fill("t".repeat(301));
      const created = responseTo(page, "POST", LIST);
      await saveResume(page).click();
      expect((await created).status()).toBe(400);
      await expect(
        toast(page, "Couldn't save the resume. Try again."),
      ).toBeVisible();
      expectedFail(
        "src/app/dashboard/resumes/components/manual-resume-form.tsx:52: the title has no length rule, so only the server's 400 and a generic toast stop it, while the stored view explains the same limit",
      );
      await expect(page.getByText(TOO_LONG, { exact: true })).toBeVisible({
        timeout: 2_000,
      });
    });

    for (const [failure, respond] of [
      [
        "a server error",
        (route: Route) =>
          route.fulfill({ status: 500, json: { error: "Bad" } }),
      ],
      [
        "a dropped connection",
        (route: Route) => route.abort("internetdisconnected"),
      ],
    ] as const)
      test(`${failure} keeps the form and its values`, async ({ page }) => {
        let posts = 0;
        await page.route(`**${LIST}`, (route) => {
          if (route.request().method() !== "POST") return route.fallback();
          posts += 1;
          return respond(route);
        });
        await page.goto("/dashboard/resumes/new");
        await fillResume(page, "Manual E2E");
        await saveResume(page).click();
        await expect(
          toast(page, "Couldn't save the resume. Try again."),
        ).toBeVisible();
        expect(posts).toBe(1);
        await expect(page).toHaveURL(/\/dashboard\/resumes\/new$/);
        await expect(resumeTitle(page)).toHaveValue("Manual E2E");
        await expect(page.getByLabel("Skills", { exact: true })).toHaveValue(
          "TypeScript",
        );
      });

    test("Save is disabled while saving and sends one request", async ({
      page,
      database,
      candidate,
    }) => {
      const pending = await hold(page, `**${LIST}`);
      await page.goto("/dashboard/resumes/new");
      await resumeTitle(page).fill("Manual E2E");
      await saveResume(page).dblclick();
      await expect(
        page.getByRole("button", { name: "Saving…", exact: true }),
      ).toBeDisabled();
      expect(pending.requests).toHaveLength(1);
      pending.release();
      await expect(toast(page, "Resume saved")).toBeVisible();
      expect(
        await database
          .select({ id: resumes.id })
          .from(resumes)
          .where(eq(resumes.userId, candidate.id)),
      ).toHaveLength(1);
    });

    test("Cancel goes back without saving", async ({ page }) => {
      const posts = recordRequests(page, call("POST", LIST));
      await page.goto("/dashboard/resumes/new");
      await resumeTitle(page).fill("Manual E2E");
      await page.getByRole("link", { name: "Cancel", exact: true }).click();
      await expect(page).toHaveURL(/\/dashboard\/resumes$/);
      await expect(emptyState(page)).toBeVisible();
      expect(posts).toHaveLength(0);
    });

    test("a new default takes over from the old one", async ({
      page,
      request,
      database,
      candidate,
    }) => {
      await seedManual(request, { title: "Old Default", isDefault: true });
      await page.goto("/dashboard/resumes/new");
      await resumeTitle(page).fill("New Default");
      await useAsDefault(page).check();
      await saveResume(page).click();
      await expect(toast(page, "Resume saved")).toBeVisible();
      await expect(
        row(page, "Old Default").getByRole("button", {
          name: "Set as default",
          exact: true,
        }),
      ).toBeVisible();
      expect(await defaults(database, candidate.id)).toEqual(["New Default"]);
    });
  },
);

test.describe(
  "Edit a resume written by hand",
  { tag: "@resume-manual-edit" },
  () => {
    test("the form opens with the saved content and saves the edits", async ({
      page,
      request,
    }) => {
      const resume = await seedManual(request, { title: "Manual E2E" });
      await seedManual(request, { title: "Newer Resume" });
      await page.goto(`/dashboard/resumes/${resume.id}`);
      await expect(
        page.getByRole("heading", { name: "Edit resume", level: 1 }),
      ).toBeVisible();
      await expect(resumeTitle(page)).toHaveValue("Manual E2E");
      for (const [label, value] of [
        ["Full name", MANUAL.personalInfo.name],
        ["Email", MANUAL.personalInfo.email],
        ["Phone", MANUAL.personalInfo.phone],
        ["Address", MANUAL.personalInfo.address],
        ["Professional summary", MANUAL.summary],
        ["Work experience", MANUAL.experience],
        ["Education", MANUAL.education],
        ["Skills", MANUAL.skills],
      ] as const)
        await expect(page.getByLabel(label, { exact: true })).toHaveValue(
          value,
        );
      await expect(useAsDefault(page)).not.toBeChecked();

      await resumeTitle(page).fill("Manual E2E v2");
      await page
        .getByLabel("Professional summary", { exact: true })
        .fill("Engineer who ships, carefully.");
      await useAsDefault(page).check();
      await page
        .getByRole("button", { name: "Save changes", exact: true })
        .click();
      await expect(toast(page, "Changes saved")).toBeVisible();
      await expect(page).toHaveURL(/\/dashboard\/resumes$/);
      await expect(
        page.getByRole("main").getByRole("listitem").first(),
      ).toContainText("Manual E2E v2");
      const stored = await storedResume(request, resume.id);
      expect(stored.isDefault).toBe(true);
      const content: unknown = JSON.parse(stored.content);
      expect(content).toEqual({
        ...MANUAL,
        summary: "Engineer who ships, carefully.",
      });
    });

    test("an unknown id or another account's resume does not load", async ({
      page,
      createCandidate,
      playwright,
      extraHTTPHeaders,
    }) => {
      const other = await createCandidate();
      const otherRequest = await playwright.request.newContext({
        baseURL: BASE_URL,
        storageState: other.storageState,
        extraHTTPHeaders,
      });
      let otherId: string;
      try {
        otherId = (await seedManual(otherRequest, { title: "Theirs" })).id;
      } finally {
        await otherRequest.dispose();
      }
      for (const id of [
        "not-a-uuid",
        "00000000-0000-4000-8000-000000000000",
        otherId,
      ]) {
        await page.goto(`/dashboard/resumes/${id}`);
        await expect(
          page.getByRole("heading", { name: "Resume", level: 1 }),
        ).toBeVisible();
        await expect(page.getByRole("main").getByRole("alert")).toContainText(
          NOT_LOADED,
        );
        await expect(resumeTitle(page)).toHaveCount(0);
      }
    });

    test("an empty or blank title is refused without a request", async ({
      page,
      request,
    }) => {
      const resume = await seedManual(request, { title: "Manual E2E" });
      const puts = recordRequests(page, call("PUT", `${LIST}/${resume.id}`));
      await page.goto(`/dashboard/resumes/${resume.id}`);
      await resumeTitle(page).fill("");
      await page
        .getByRole("button", { name: "Save changes", exact: true })
        .click();
      await expect(
        page.getByText("Give the resume a title.", { exact: true }),
      ).toBeVisible();
      await resumeTitle(page).fill("   ");
      await page
        .getByRole("button", { name: "Save changes", exact: true })
        .click();
      await expect(
        toast(page, "Give the resume a title before saving."),
      ).toBeVisible();
      expect(puts).toHaveLength(0);
    });

    test(
      "an over-long title is explained before it is sent",
      { tag: "@GAP-long-input-server-only-limits" },
      async ({ page, request }) => {
        const resume = await seedManual(request, { title: "Manual E2E" });
        await page.goto(`/dashboard/resumes/${resume.id}`);
        await resumeTitle(page).fill("t".repeat(301));
        const updated = responseTo(page, "PUT", `${LIST}/${resume.id}`);
        await page
          .getByRole("button", { name: "Save changes", exact: true })
          .click();
        expect((await updated).status()).toBe(400);
        await expect(
          toast(page, "Couldn't save the changes. Try again."),
        ).toBeVisible();
        expectedFail(
          "src/app/dashboard/resumes/components/manual-resume-form.tsx:52: the title has no length rule, so only the server's 400 and a generic toast stop it, while the stored view explains the same limit",
        );
        await expect(page.getByText(TOO_LONG, { exact: true })).toBeVisible({
          timeout: 2_000,
        });
      },
    );

    test("a failed save keeps the edits", async ({ page, request }) => {
      const resume = await seedManual(request, { title: "Manual E2E" });
      await page.route(`**${LIST}/${resume.id}`, (route) =>
        route.request().method() === "PUT"
          ? route.fulfill({ status: 500, json: { error: "Bad" } })
          : route.fallback(),
      );
      await page.goto(`/dashboard/resumes/${resume.id}`);
      await resumeTitle(page).fill("Edited");
      await page
        .getByRole("button", { name: "Save changes", exact: true })
        .click();
      await expect(
        toast(page, "Couldn't save the changes. Try again."),
      ).toBeVisible();
      await expect(page).toHaveURL(`/dashboard/resumes/${resume.id}`);
      await expect(resumeTitle(page)).toHaveValue("Edited");
    });

    test("saving a resume deleted elsewhere fails and keeps the edits", async ({
      page,
      request,
    }) => {
      const resume = await seedManual(request, { title: "Manual E2E" });
      const url = `${LIST}/${resume.id}`;
      await page.goto(`/dashboard/resumes/${resume.id}`);
      await expect(resumeTitle(page)).toHaveValue("Manual E2E");
      expect((await request.delete(url)).status()).toBe(200);
      await resumeTitle(page).fill("Edited");
      const updated = responseTo(page, "PUT", url);
      await page
        .getByRole("button", { name: "Save changes", exact: true })
        .click();
      expect((await updated).status()).toBe(404);
      await expect(
        toast(page, "Couldn't save the changes. Try again."),
      ).toBeVisible();
      await expect(page).toHaveURL(`/dashboard/resumes/${resume.id}`);
      await expect(resumeTitle(page)).toHaveValue("Edited");
    });

    test("content this editor does not read is left alone", async ({
      page,
      request,
    }) => {
      for (const content of [
        "Plain text resume",
        // A generated snapshot from a schema version this app does not read.
        JSON.stringify({ schemaVersion: 3, renderer: "latex", document: {} }),
      ]) {
        const resume = await seedManual(request, {
          title: "Odd Resume",
          content,
        });
        await page.goto(`/dashboard/resumes/${resume.id}`);
        const notice = page.getByRole("main").getByRole("alert");
        await expect(notice).toContainText("This resume can't be edited here");
        await expect(notice).toContainText(
          "Its saved content is in a format this editor does not read, so it is left as it is.",
        );
        await expect(resumeTitle(page)).toHaveCount(0);
        await expect(
          page.getByRole("button", { name: "Save changes" }),
        ).toHaveCount(0);
        expect((await storedResume(request, resume.id)).content).toBe(content);
      }
    });

    test("Cancel goes back without saving", async ({ page, request }) => {
      const resume = await seedManual(request, { title: "Manual E2E" });
      const puts = recordRequests(page, call("PUT", `${LIST}/${resume.id}`));
      await page.goto(`/dashboard/resumes/${resume.id}`);
      await resumeTitle(page).fill("Discarded");
      await page.getByRole("link", { name: "Cancel", exact: true }).click();
      await expect(page).toHaveURL(/\/dashboard\/resumes$/);
      await expect(row(page, "Manual E2E")).toBeVisible();
      expect(puts).toHaveLength(0);
    });
  },
);

test.describe(
  "A saved generated resume: PDF preview and details",
  { tag: "@resume-stored-view" },
  () => {
    // Each preview compiles the snapshot with the real LaTeX compiler.
    test.slow();

    function preview(page: Page) {
      return page.getByTitle("Resume PDF preview", { exact: true });
    }

    test("the PDF renders from the snapshot, and the title and default can be changed", async ({
      page,
      request,
      database,
    }) => {
      const resume = await seedGeneratedResume(request, {
        title: "Stored E2E",
      });
      await page.goto(`/dashboard/resumes/${resume.id}`);
      await expect(
        page.getByRole("heading", { name: "Stored E2E", level: 1 }),
      ).toBeVisible();
      await expect(preview(page)).toHaveAttribute("src", /^blob:/, {
        timeout: 30_000,
      });
      await expect(page.getByLabel("Page fit", { exact: true })).toHaveText(
        /Pages\s*1\s*Target\s*1\s*Revisions\s*0/,
      );
      await expect(
        page.getByText("Fits 1 page", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Generate again", exact: true }),
      ).toHaveAttribute("href", "/dashboard/resumes/generate");
      await expect
        .poll(async () => {
          const [stored] = await database
            .select({ pdfKey: resumes.pdfKey })
            .from(resumes)
            .where(eq(resumes.id, resume.id));
          return stored?.pdfKey;
        })
        .toMatch(/\.pdf$/);

      await resumeTitle(page).fill("Renamed");
      await useAsDefault(page).check();
      await page
        .getByRole("button", { name: "Save details", exact: true })
        .click();
      await expect(toast(page, "Details saved")).toBeVisible();
      expect(await storedResume(request, resume.id)).toMatchObject({
        title: "Renamed",
        isDefault: true,
      });

      // Chromium's PDF viewer tab reports no URL, so the call is captured instead.
      await page.evaluate(() => {
        window.open = (url) => {
          document.body.dataset.opened = String(url);
          return null;
        };
      });
      await page
        .getByRole("button", { name: "Open PDF in a new tab", exact: true })
        .click();
      await expect(page.locator("body")).toHaveAttribute(
        "data-opened",
        /^blob:/,
      );
    });

    test("an empty or over-long title is explained without a request", async ({
      page,
      request,
    }) => {
      const resume = await seedGeneratedResume(request);
      const puts = recordRequests(page, call("PUT", `${LIST}/${resume.id}`));
      await page.goto(`/dashboard/resumes/${resume.id}`);
      const save = page.getByRole("button", {
        name: "Save details",
        exact: true,
      });
      await resumeTitle(page).fill("");
      await save.click();
      const alert = page.getByRole("main").getByRole("alert");
      await expect(alert).toHaveText("Title is required");
      await resumeTitle(page).fill("t".repeat(301));
      await save.click();
      await expect(alert).toHaveText(TOO_LONG);
      expect(puts).toHaveLength(0);
    });

    test("a failed save shows the server's message", async ({
      page,
      request,
    }) => {
      const resume = await seedGeneratedResume(request);
      const gate = Promise.withResolvers<undefined>();
      await page.route(`**${LIST}/${resume.id}`, async (route) => {
        if (route.request().method() !== "PUT") return route.fallback();
        await gate.promise;
        await route.fulfill({
          status: 500,
          json: { error: "Internal server error" },
        });
      });
      await page.goto(`/dashboard/resumes/${resume.id}`);
      const save = page.getByRole("button", {
        name: "Save details",
        exact: true,
      });
      await save.click();
      await expect(save).toBeDisabled();
      gate.resolve(undefined);
      await expect(toast(page, "Internal server error")).toBeVisible();
      await expect(save).toBeEnabled();
    });

    test("a snapshot the compiler rejects says so, and Try again renders the fixed one", async ({
      page,
      request,
    }) => {
      const resume = await seedGeneratedResume(request, {
        document: { name: "Alex 🦄 Example" },
      });
      const failed = responseTo(page, "GET", `${LIST}/${resume.id}/pdf`);
      await page.goto(`/dashboard/resumes/${resume.id}`);
      const response = await failed;
      expect(response.status()).toBe(503);
      const notice = page.getByRole("main").getByRole("alert");
      await expect(notice).toContainText("The saved PDF didn't render", {
        timeout: 30_000,
      });
      const raw: unknown = await response.json();
      const { error } = z.object({ error: z.string() }).parse(raw);
      await expect(notice).toContainText(error);

      const fixed = await seedGeneratedResume(request, { title: "Fixed" });
      const stored = await storedResume(request, fixed.id);
      expect(
        (
          await request.put(`${LIST}/${resume.id}`, {
            data: { content: stored.content },
          })
        ).status(),
      ).toBe(200);
      await notice
        .getByRole("button", { name: "Try again", exact: true })
        .click();
      await expect(preview(page)).toHaveAttribute("src", /^blob:/, {
        timeout: 30_000,
      });
    });

    test("a PDF request that fails shows its message, or the fallback", async ({
      page,
      request,
    }) => {
      const resume = await seedGeneratedResume(request);
      const pdfUrl = `**${LIST}/${resume.id}/pdf`;
      await page.route(pdfUrl, (route) =>
        route.fulfill({ status: 503, json: { error: "Compiler down" } }),
      );
      await page.goto(`/dashboard/resumes/${resume.id}`);
      const notice = page.getByRole("main").getByRole("alert");
      await expect(notice).toContainText("The saved PDF didn't render");
      await expect(notice).toContainText("Compiler down");

      await page.unroute(pdfUrl);
      await page.route(pdfUrl, (route) =>
        route.fulfill({ status: 503, body: "" }),
      );
      await notice
        .getByRole("button", { name: "Try again", exact: true })
        .click();
      await expect(notice).toContainText("Could not render the saved resume.");

      await page.unroute(pdfUrl);
      await notice
        .getByRole("button", { name: "Try again", exact: true })
        .click();
      await expect(preview(page)).toHaveAttribute("src", /^blob:/, {
        timeout: 30_000,
      });
    });

    test("a stored PDF that has gone missing is compiled again", async ({
      page,
      request,
      database,
      candidate,
    }) => {
      const resume = await seedGeneratedResume(request);
      const missing = `users/${candidate.id}/resumes/00000000-0000-4000-8000-000000000000.pdf`;
      await database
        .update(resumes)
        .set({ pdfKey: missing })
        .where(eq(resumes.id, resume.id));
      await page.goto(`/dashboard/resumes/${resume.id}`);
      await expect(preview(page)).toHaveAttribute("src", /^blob:/, {
        timeout: 30_000,
      });
      await expect
        .poll(async () => {
          const [stored] = await database
            .select({ pdfKey: resumes.pdfKey })
            .from(resumes)
            .where(eq(resumes.id, resume.id));
          return stored?.pdfKey;
        })
        .not.toBe(missing);
    });

    test("a legacy HTML resume is shown sandboxed, without a PDF", async ({
      page,
      request,
    }) => {
      const resume = await seedManual(request, {
        title: "Legacy",
        content: JSON.stringify({
          html: '<h1>Legacy body</h1><script>parent.document.title="pwned"</script>',
        }),
      });
      const pdf = recordRequests(page, call("GET", `${LIST}/${resume.id}/pdf`));
      await page.goto(`/dashboard/resumes/${resume.id}`);
      const frame = page.getByTitle("Legacy resume preview", { exact: true });
      await expect(frame).toHaveAttribute("sandbox", "");
      await expect(
        page
          .frameLocator('iframe[title="Legacy resume preview"]')
          .getByRole("heading", { name: "Legacy body" }),
      ).toBeVisible();
      await expect(page).not.toHaveTitle("pwned");
      await expect(
        page.getByRole("link", { name: "Generate again", exact: true }),
      ).toHaveAttribute("href", "/dashboard/resumes/generate");
      expect(pdf).toHaveLength(0);
      const response = await request.get(`${LIST}/${resume.id}/pdf`);
      expect(response.status()).toBe(422);
      expect(await response.json()).toEqual({ error: LEGACY_PDF });
    });
  },
);

test.describe(
  "Resumes API contract",
  {
    tag: [
      "@resume-manual-create",
      "@resume-manual-edit",
      "@resumes-set-default",
      "@resumes-delete",
      "@resume-stored-view",
    ],
  },
  () => {
    test("create and update validate their bodies", async ({ request }) => {
      for (const [data, message] of [
        [{ title: "", content: "x" }, "Title is required"],
        [{ title: "t", content: "" }, "Content is required"],
        [{ title: "t".repeat(301), content: "x" }, TOO_LONG],
        [
          { title: "t", content: "x".repeat(1_000_001) },
          "This document is too large to save",
        ],
      ] as const) {
        const response = await request.post(LIST, { data });
        expect(response.status()).toBe(400);
        const body = await errorBody(response);
        expect(body.error).toBe("Invalid request data");
        expect(body.messages).toContain(message);
      }
      for (const data of [
        { title: "t", content: "x", isDefault: "x" },
        { title: "t", content: "x", jobApplicationId: "" },
      ]) {
        const response = await request.post(LIST, { data });
        expect(response.status()).toBe(400);
        expect((await errorBody(response)).error).toBe("Invalid request data");
      }
      const malformed = await request.post(LIST, MALFORMED_JSON);
      expect(malformed.status()).toBe(400);
      expect(await malformed.json()).toEqual({
        error: "Request body must be valid JSON",
      });

      const resume = await seedManual(request, { title: "Manual E2E" });
      const url = `${LIST}/${resume.id}`;
      for (const data of [
        { title: "" },
        { content: "" },
        { isDefault: "yes" },
      ]) {
        const response = await request.put(url, { data });
        expect(response.status()).toBe(400);
        expect((await errorBody(response)).error).toBe("Invalid request data");
      }
      const malformedUpdate = await request.put(url, MALFORMED_JSON);
      expect(malformedUpdate.status()).toBe(400);
    });

    test("another account's records cannot be linked, read, changed or deleted", async ({
      request,
      createCandidate,
      playwright,
      extraHTTPHeaders,
    }) => {
      const other = await createCandidate();
      const otherRequest = await playwright.request.newContext({
        baseURL: BASE_URL,
        storageState: other.storageState,
        extraHTTPHeaders,
      });
      try {
        const linked = await request.post(LIST, {
          data: {
            title: "t",
            content: "x",
            jobApplicationId: other.applicationId,
          },
        });
        expect(linked.status()).toBe(400);
        expect(await linked.json()).toEqual({ error: LINKED_APPLICATION });

        const mine = await seedManual(request, { title: "Mine" });
        const relinked = await request.put(`${LIST}/${mine.id}`, {
          data: { jobApplicationId: other.applicationId },
        });
        expect(relinked.status()).toBe(400);
        expect(await relinked.json()).toEqual({ error: LINKED_APPLICATION });

        const theirs = await seedManual(otherRequest, {
          title: "Theirs",
          isDefault: true,
        });
        const url = `${LIST}/${theirs.id}`;
        for (const response of [
          await request.get(url),
          await request.get(`${url}/pdf`),
          await request.put(url, { data: { isDefault: true } }),
          await request.delete(url),
        ]) {
          expect(response.status()).toBe(404);
          expect(await response.json()).toEqual({ error: "Resume not found" });
        }
        expect(await storedResume(otherRequest, theirs.id)).toMatchObject({
          title: "Theirs",
          isDefault: true,
        });
        expect((await request.get(`${LIST}/nope/pdf`)).status()).toBe(404);
      } finally {
        await otherRequest.dispose();
      }
    });

    test("every endpoint requires a session", async ({
      playwright,
      extraHTTPHeaders,
    }) => {
      const anonymous = await anonymousRequest(playwright, extraHTTPHeaders);
      try {
        for (const response of [
          await anonymous.get(LIST),
          await anonymous.post(LIST, { data: { title: "t", content: "x" } }),
          await anonymous.get(`${LIST}/any`),
          await anonymous.put(`${LIST}/any`, { data: { title: "t" } }),
          await anonymous.delete(`${LIST}/any`),
          await anonymous.get(`${LIST}/any/pdf`),
        ]) {
          expect(response.status(), response.url()).toBe(401);
          expect(await response.json()).toEqual({ error: "Unauthorized" });
        }
      } finally {
        await anonymous.dispose();
      }
    });
  },
);
