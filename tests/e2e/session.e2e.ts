import type { Page } from "@playwright/test";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  jobApplications,
  resumeGenerationJobs,
  session,
  user,
} from "../../src/lib/db/schema";
import { test, expect } from "./support/fixtures";
import { expectedFail, revokeSessions } from "./support/helpers";
import { BASE_URL } from "./support/runtime";

const UNKNOWN_ID = "00000000-0000-4000-8000-000000000000";
const SESSION_CHECK = "**/api/auth/get-session*";

/** Signs in on the sign-in form, which must already be open. */
async function signIn(page: Page, email: string, password: string) {
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  const signedIn = page.waitForResponse("**/api/auth/sign-in/email");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  expect((await signedIn).status()).toBe(200);
}

function row(page: Page, text: string) {
  return page
    .getByRole("main")
    .getByRole("listitem")
    .filter({ has: page.getByText(text, { exact: true }) });
}

function headerEmail(page: Page, email: string) {
  return page.getByRole("banner").getByText(email, { exact: true });
}

test.describe(
  "Route protection: signed out",
  {
    tag: ["@route-protection-and-session", "@dashboard-shell-and-auth-gating"],
  },
  () => {
    test.use({ authenticated: false });

    test("the proxy sends every dashboard route to sign in before it renders", async ({
      request,
      candidate,
    }) => {
      const id = candidate.applicationId;
      for (const path of [
        "/dashboard",
        "/dashboard/profile",
        "/dashboard/applications",
        "/dashboard/applications/new",
        `/dashboard/applications/${id}`,
        `/dashboard/applications/${id}/resume`,
        "/dashboard/resumes",
        "/dashboard/resumes/new",
        "/dashboard/resumes/generate",
        `/dashboard/resumes/${UNKNOWN_ID}`,
        "/dashboard/cover-letters",
        "/dashboard/cover-letters/new",
        `/dashboard/cover-letters/${UNKNOWN_ID}`,
        "/dashboard/conversation-starters",
        "/dashboard/application-answers",
      ]) {
        const response = await request.get(path, { maxRedirects: 0 });
        expect(response.status(), path).toBe(307);
        expect(response.headers().location, path).toBe("/sign-in");
      }
    });

    test("a signed-out visit to a dashboard page lands on the sign-in form", async ({
      page,
    }) => {
      const response = await page.goto("/dashboard/resumes");
      expect(response?.request().redirectedFrom()?.url()).toBe(
        `${BASE_URL}/dashboard/resumes`,
      );
      await expect(page).toHaveURL(/\/sign-in$/);
      await expect(
        page.getByRole("button", { name: "Sign in", exact: true }),
      ).toBeVisible();
    });

    test("public pages and API routes are not redirected", async ({
      request,
    }) => {
      for (const path of [
        "/",
        "/sign-in",
        "/sign-up",
        "/forgot-password",
        "/reset-password",
      ]) {
        const response = await request.get(path, { maxRedirects: 0 });
        expect(response.status(), path).toBe(200);
      }
      for (const path of ["/api/applications", "/api/dashboard/stats"]) {
        const response = await request.get(path, { maxRedirects: 0 });
        expect(response.status(), path).toBe(401);
        expect(await response.json()).toEqual({ error: "Unauthorized" });
      }
    });

    test("a forged session cookie passes the proxy but not the session check", async ({
      page,
    }) => {
      await page
        .context()
        .addCookies([
          { name: "better-auth.session_token", value: "forged", url: BASE_URL },
        ]);
      // The layout's check only runs once the proxy has let the page through.
      const checked = page.waitForResponse(SESSION_CHECK);
      await page.goto("/dashboard");
      await checked;
      await expect(page).toHaveURL(/\/sign-in$/);
      const stats = await page.request.get("/api/dashboard/stats");
      expect(stats.status()).toBe(401);
      expect(await stats.json()).toEqual({ error: "Unauthorized" });
    });
  },
);

test.describe(
  "Session validity on the dashboard",
  {
    tag: ["@route-protection-and-session", "@dashboard-shell-and-auth-gating"],
  },
  () => {
    test(
      "a session revoked on the server ends at sign in on the next load",
      { tag: ["@GAP-session-revoked-mid-flow", "@dashboard-load-errors"] },
      async ({ page, request, database, candidate }) => {
        await page.goto("/dashboard");
        await expect(headerEmail(page, candidate.email)).toBeVisible();
        await revokeSessions(database, candidate.id);
        await page.reload();
        await expect(page).toHaveURL(/\/sign-in$/);
        await expect(
          page.getByRole("button", { name: "Sign in", exact: true }),
        ).toBeVisible();
        await expect(page.getByText(candidate.email)).toHaveCount(0);
        expect((await request.get("/api/dashboard/stats")).status()).toBe(401);
      },
    );

    test(
      "an expired session is treated as signed out",
      { tag: "@GAP-session-revoked-mid-flow" },
      async ({ page, request, database, candidate }) => {
        await database
          .update(session)
          .set({ expiresAt: new Date(Date.now() - 60_000) })
          .where(eq(session.userId, candidate.id));
        await page.goto("/dashboard");
        await expect(page).toHaveURL(/\/sign-in$/);
        await expect(
          page.getByRole("button", { name: "Sign in", exact: true }),
        ).toBeVisible();
        expect((await request.get("/api/dashboard/stats")).status()).toBe(401);
      },
    );

    test("a deleted account is signed out on the next load", async ({
      page,
      database,
      candidate,
    }) => {
      await page.goto("/dashboard");
      await expect(headerEmail(page, candidate.email)).toBeVisible();
      // Sessions cascade with the account; fixture teardown tolerates the gap.
      await database.delete(user).where(eq(user.id, candidate.id));
      await page.reload();
      await expect(page).toHaveURL(/\/sign-in$/);
      await expect(
        page.getByRole("button", { name: "Sign in", exact: true }),
      ).toBeVisible();
    });

    test("an unreachable session check sends the user to sign in without ending the session", async ({
      page,
      candidate,
    }) => {
      await page.route(SESSION_CHECK, (route) => route.abort());
      await page.goto("/dashboard");
      await expect(page).toHaveURL(/\/sign-in$/);
      await page.unroute(SESSION_CHECK);
      await page.goto("/dashboard");
      await expect(
        page.getByRole("heading", { name: "Dashboard", level: 1, exact: true }),
      ).toBeVisible();
      await expect(headerEmail(page, candidate.email)).toBeVisible();
    });

    test("a failing session check is treated as signed out, and the session survives", async ({
      page,
      database,
      candidate,
    }) => {
      await page.route(SESSION_CHECK, (route) =>
        route.fulfill({ status: 500, json: {} }),
      );
      await page.goto("/dashboard");
      await expect(page).toHaveURL(/\/sign-in$/);
      await page.unroute(SESSION_CHECK);
      expect(
        await database
          .select({ id: session.id })
          .from(session)
          .where(eq(session.userId, candidate.id)),
      ).toHaveLength(1);
      await page.goto("/dashboard");
      await expect(headerEmail(page, candidate.email)).toBeVisible();
    });

    test("Back after an invalid-session redirect checks the session again", async ({
      page,
      database,
      candidate,
    }) => {
      await page.goto("/dashboard");
      await expect(headerEmail(page, candidate.email)).toBeVisible();
      await revokeSessions(database, candidate.id);
      await page.reload();
      await expect(page).toHaveURL(/\/sign-in$/);
      const rechecked = page.waitForResponse(SESSION_CHECK);
      await page.goBack();
      await rechecked;
      await expect(page).toHaveURL(/\/sign-in$/);
      await expect(
        page.getByRole("button", { name: "Sign in", exact: true }),
      ).toBeVisible();
      await expect(page.getByText(candidate.email)).toHaveCount(0);
    });
  },
);

const IMPORTED = {
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
      description: "Led the billing platform rewrite.",
      technologies: ["Go"],
    },
  ],
  education: [],
  skills: [],
  projects: [],
  certifications: [],
  achievements: [],
  references: [],
  markdown: null,
  warnings: [],
};

const draftSchema = z.object({
  state: z.object({ manualCompany: z.string(), ownerId: z.string() }),
});

test.describe(
  "Account state is cleared when another account signs in on the same tab",
  { tag: "@account-switch-state" },
  () => {
    test("the next account sees only its own records after a sign-out and sign-in", async ({
      page,
      candidate,
      createCandidate,
      database,
    }) => {
      await database
        .update(jobApplications)
        .set({ company: "Alpha Only Industries" })
        .where(eq(jobApplications.userId, candidate.id));
      const other = await createCandidate();
      const nav = page.getByRole("navigation", { name: "Main" });
      const activity = page.getByRole("region", { name: "Recent activity" });

      await page.goto("/dashboard");
      await expect(
        activity.getByText("Software Engineer at Alpha Only Industries", {
          exact: true,
        }),
      ).toBeVisible();
      await nav
        .getByRole("link", { name: "Applications", exact: true })
        .click();
      await expect(row(page, "Alpha Only Industries")).toBeVisible();

      // Both moves are client-side, so only clearing the cache keeps the
      // first account's lists from being shown again.
      await page.getByRole("button", { name: "Sign out" }).click();
      await expect(page).toHaveURL(/\/sign-in$/);
      await signIn(page, other.email, other.password);
      await expect(page).toHaveURL(/\/dashboard$/);
      await expect(headerEmail(page, other.email)).toBeVisible();
      await expect(
        activity.getByText("Software Engineer at Example Industries", {
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        activity.getByText("Software Engineer at Alpha Only Industries"),
      ).toHaveCount(0);

      await nav
        .getByRole("link", { name: "Applications", exact: true })
        .click();
      await expect(row(page, "Example Industries")).toBeVisible();
      await expect(row(page, "Alpha Only Industries")).toHaveCount(0);
      await expect(headerEmail(page, candidate.email)).toHaveCount(0);
    });

    test("an import under review is not shown to the next account", async ({
      page,
      createCandidate,
    }) => {
      const other = await createCandidate();
      // Stubbed in the browser so the review exists without Groq or OCR.
      await page.route("**/api/profile/resume-import", (route) =>
        route.fulfill({ json: IMPORTED }),
      );
      await page.goto("/dashboard/profile");
      await page.locator('input[type="file"]').setInputFiles({
        name: "resume.txt",
        mimeType: "text/plain",
        buffer: Buffer.from("Synthetic resume"),
      });
      const banner = page.getByText("1 imported item waiting for review", {
        exact: true,
      });
      await expect(banner).toBeVisible();

      await page.getByRole("button", { name: "Sign out" }).click();
      await expect(page).toHaveURL(/\/sign-in$/);
      await signIn(page, other.email, other.password);
      await expect(page).toHaveURL(/\/dashboard$/);
      // A reload would drop the in-memory review anyway, so this must be a
      // client-side move.
      await page
        .getByRole("navigation", { name: "Main" })
        .getByRole("link", { name: "Profile", exact: true })
        .click();
      await expect(
        page.getByText(
          "Everything you might put on a resume, kept in one place. Each resume draws from it.",
          { exact: true },
        ),
      ).toBeVisible();
      await expect(banner).toHaveCount(0);
    });

    test("a draft left when a session ended without sign-out is not shown to the next account", async ({
      page,
      createCandidate,
    }) => {
      const other = await createCandidate();
      const company = page.getByLabel("Company *", { exact: true });
      await page.goto("/dashboard/cover-letters/new");
      await company.fill("Draft Co A");
      await page.reload();
      await expect(company).toHaveValue("Draft Co A");

      await page.context().clearCookies();
      await page.goto("/sign-in");
      await signIn(page, other.email, other.password);
      await expect(page).toHaveURL(/\/dashboard$/);
      await page.goto("/dashboard/cover-letters/new");
      await expect(company).toHaveValue("");
      await expect
        .poll(async () => {
          const raw: unknown = JSON.parse(
            (await page.evaluate(() =>
              localStorage.getItem("cover-letter-draft"),
            )) ?? "null",
          );
          return draftSchema.safeParse(raw).data?.state;
        })
        .toEqual({ manualCompany: "", ownerId: other.id });
    });
  },
);

test.describe(
  "Session ends while the dashboard is open",
  { tag: "@GAP-session-revoked-mid-flow" },
  () => {
    test("with a live session every page loads and an edit saves", async ({
      page,
      database,
      candidate,
    }) => {
      const nav = page.getByRole("navigation", { name: "Main" });
      await page.goto("/dashboard");
      await nav.getByRole("link", { name: "Resumes", exact: true }).click();
      await expect(
        page.getByRole("heading", { name: "No resumes yet", exact: true }),
      ).toBeVisible();
      await nav
        .getByRole("link", { name: "Cover letters", exact: true })
        .click();
      await expect(
        page.getByRole("heading", {
          name: "No cover letters yet",
          exact: true,
        }),
      ).toBeVisible();
      await nav
        .getByRole("link", { name: "Applications", exact: true })
        .click();
      await row(page, "Example Industries")
        .getByRole("link", { name: "Edit", exact: true })
        .click();
      await expect(page.getByLabel("Company *", { exact: true })).toHaveValue(
        "Example Industries",
      );
      await page
        .getByLabel("Notes", { exact: true })
        .fill("Recruiter call booked.");
      await page
        .getByRole("button", { name: "Save changes", exact: true })
        .click();
      await expect(
        page.getByText("Changes saved", { exact: true }),
      ).toBeVisible();
      await expect(page).toHaveURL(/\/dashboard\/applications$/);
      await expect(headerEmail(page, candidate.email)).toBeVisible();
      await expect(page.getByText("Unauthorized")).toHaveCount(0);
      const [stored] = await database
        .select({ notes: jobApplications.notes })
        .from(jobApplications)
        .where(eq(jobApplications.id, candidate.applicationId));
      expect(stored?.notes).toBe("Recruiter call booked.");
    });

    test("moving to another page after the session was revoked goes to sign in", async ({
      page,
      database,
      candidate,
    }) => {
      await page.goto("/dashboard");
      await expect(headerEmail(page, candidate.email)).toBeVisible();
      await revokeSessions(database, candidate.id);
      const listed = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === "/api/resumes" &&
          response.request().method() === "GET",
      );
      await page
        .getByRole("navigation", { name: "Main" })
        .getByRole("link", { name: "Resumes", exact: true })
        .click();
      expect((await listed).status()).toBe(401);
      expectedFail(
        "src/app/dashboard/layout.tsx:126: the session is checked only when the layout mounts, and no query treats a 401 as signed out, so the page stays on /dashboard/resumes with an error",
      );
      await expect(page).toHaveURL(/\/sign-in/, { timeout: 2_000 });
    });

    test("opening an application after the session was revoked goes to sign in", async ({
      page,
      database,
      candidate,
    }) => {
      await page.goto("/dashboard/applications");
      await expect(row(page, "Example Industries")).toBeVisible();
      await revokeSessions(database, candidate.id);
      const loaded = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname ===
            `/api/applications/${candidate.applicationId}/resume` &&
          response.request().method() === "GET",
      );
      await row(page, "Example Industries")
        .getByRole("link", { name: "Tailor resume", exact: true })
        .click();
      expect((await loaded).status()).toBe(401);
      expectedFail(
        "src/app/dashboard/layout.tsx:126: the session is checked only when the layout mounts, and no query treats a 401 as signed out, so the tailor page stays open with an error",
      );
      await expect(page).toHaveURL(/\/sign-in/, { timeout: 2_000 });
    });

    test("a save after the session was revoked fails and keeps the edits", async ({
      page,
      database,
      candidate,
    }) => {
      await page.goto(`/dashboard/applications/${candidate.applicationId}`);
      await expect(page.getByLabel("Company *", { exact: true })).toHaveValue(
        "Example Industries",
      );
      await revokeSessions(database, candidate.id);
      await page.getByLabel("Notes", { exact: true }).fill("Unsaved note");
      const saved = page.waitForResponse(
        (response) => response.request().method() === "PUT",
      );
      await page
        .getByRole("button", { name: "Save changes", exact: true })
        .click();
      expect((await saved).status()).toBe(401);
      await expect(
        page.getByText("Couldn't save the changes. Try again.", {
          exact: true,
        }),
      ).toBeVisible();
      await expect(page).toHaveURL(
        `/dashboard/applications/${candidate.applicationId}`,
      );
      await expect(page.getByLabel("Notes", { exact: true })).toHaveValue(
        "Unsaved note",
      );
      const [stored] = await database
        .select({ notes: jobApplications.notes })
        .from(jobApplications)
        .where(eq(jobApplications.id, candidate.applicationId));
      expect(stored?.notes).toBeNull();
    });

    test("a preview after the session was revoked is refused and nothing is queued", async ({
      page,
      database,
      candidate,
    }) => {
      await page.goto(
        `/dashboard/applications/${candidate.applicationId}/resume`,
      );
      const preview = page.getByRole("button", {
        name: "Preview",
        exact: true,
      });
      await expect(preview).toBeEnabled();
      await revokeSessions(database, candidate.id);
      const queued = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === "/api/resume-generation/jobs" &&
          response.request().method() === "POST",
      );
      await preview.click();
      expect((await queued).status()).toBe(401);
      // The toast repeats the message outside main; the notice stays under the form.
      await expect(
        page.getByRole("main").getByText("Unauthorized", { exact: true }),
      ).toBeVisible();
      expect(
        await database
          .select({ id: resumeGenerationJobs.id })
          .from(resumeGenerationJobs)
          .where(eq(resumeGenerationJobs.userId, candidate.id)),
      ).toEqual([]);
    });

    test("a hard navigation without the cookie is redirected by the server", async ({
      page,
      candidate,
    }) => {
      await page.goto("/dashboard");
      await expect(headerEmail(page, candidate.email)).toBeVisible();
      await page.context().clearCookies();
      const response = await page.goto("/dashboard/applications");
      expect(response?.request().redirectedFrom()?.url()).toBe(
        `${BASE_URL}/dashboard/applications`,
      );
      await expect(page).toHaveURL(/\/sign-in$/);
      await expect(
        page.getByRole("button", { name: "Sign in", exact: true }),
      ).toBeVisible();
    });

    test("a delete in a tab left open after signing out elsewhere fails and keeps the record", async ({
      page,
      database,
      candidate,
    }) => {
      const other = await page.context().newPage();
      await other.goto("/dashboard/applications");
      await expect(row(other, "Example Industries")).toBeVisible();

      await page.goto("/dashboard");
      await page.getByRole("button", { name: "Sign out" }).click();
      await expect(page).toHaveURL(/\/sign-in$/);

      const deleted = other.waitForResponse(
        (response) => response.request().method() === "DELETE",
      );
      await other
        .getByRole("button", {
          name: "Delete application at Example Industries",
          exact: true,
        })
        .click();
      await other
        .getByRole("alertdialog")
        .getByRole("button", { name: "Delete", exact: true })
        .click();
      expect((await deleted).status()).toBe(401);
      await expect(other.getByRole("alertdialog")).toBeHidden();
      await expect(
        other.getByText("Couldn't delete the application. Try again.", {
          exact: true,
        }),
      ).toBeVisible();
      await expect(row(other, "Example Industries")).toBeVisible();
      await other.reload();
      await expect(other).toHaveURL(/\/sign-in$/);
      expect(
        await database
          .select({ id: jobApplications.id })
          .from(jobApplications)
          .where(eq(jobApplications.id, candidate.applicationId)),
      ).toHaveLength(1);
    });

    test("Back after signing out shows none of the account's data", async ({
      page,
      candidate,
    }) => {
      await page.goto("/dashboard/applications");
      await expect(row(page, "Example Industries")).toBeVisible();
      await page.getByRole("button", { name: "Sign out" }).click();
      await expect(page).toHaveURL(/\/sign-in$/);
      const rechecked = page.waitForResponse(SESSION_CHECK);
      await page.goBack();
      await rechecked;
      await expect(page).toHaveURL(/\/sign-in$/);
      await expect(
        page.getByRole("button", { name: "Sign in", exact: true }),
      ).toBeVisible();
      await expect(page.getByText("Example Industries")).toHaveCount(0);
      await expect(page.getByText(candidate.email)).toHaveCount(0);
    });

    test.describe("signed out", () => {
      test.use({ authenticated: false });

      test("signing in after a redirect returns to the page that was asked for", async ({
        page,
        candidate,
      }) => {
        const deepLink = `/dashboard/applications/${candidate.applicationId}/resume`;
        await page.goto(deepLink);
        await expect(page).toHaveURL(/\/sign-in/);
        await signIn(page, candidate.email, candidate.password);
        await expect(page).toHaveURL(/\/dashboard/);
        expectedFail(
          "src/proxy.ts:8 drops the requested path from the redirect, and src/app/(auth)/sign-in/page.tsx:49 always pushes /dashboard",
        );
        await expect(page).toHaveURL(deepLink, { timeout: 2_000 });
      });
    });
  },
);
