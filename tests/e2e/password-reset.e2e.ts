import { randomUUID } from "node:crypto";
import type {
  APIRequestContext,
  Locator,
  Page,
  Request,
} from "@playwright/test";
import { and, eq, like } from "drizzle-orm";
import { z } from "zod";
import { account, session, verification } from "../../src/lib/db/schema";
import { test, expect, type Database } from "./support/fixtures";
import {
  expectedFail,
  hold,
  recordRequests,
  resetToken,
} from "./support/helpers";
import { BASE_URL } from "./support/runtime";

test.use({ authenticated: false });

const REQUEST_RESET = "/api/auth/request-password-reset";
const RESET = "/api/auth/reset-password";
const RESET_PAGE = `${BASE_URL}/reset-password`;
const SEND_FAILED =
  "Couldn't send the reset email. Check the address and try again.";
const RESET_FAILED =
  "Couldn't reset the password. The link may have expired; request a new one.";
const NEW_PASSWORD = "E2E-reset-password-5678";

function isPost(path: string) {
  return (request: Request) =>
    request.method() === "POST" && new URL(request.url()).pathname === path;
}

function responseTo(page: Page, path: string) {
  return page.waitForResponse((response) => isPost(path)(response.request()));
}

function validity(field: Locator) {
  return field.evaluate((element) =>
    element instanceof HTMLInputElement
      ? {
          valueMissing: element.validity.valueMissing,
          typeMismatch: element.validity.typeMismatch,
        }
      : null,
  );
}

async function requestReset(request: APIRequestContext, email: string) {
  const response = await request.post(REQUEST_RESET, {
    headers: { Origin: BASE_URL },
    data: { email, redirectTo: RESET_PAGE },
  });
  expect(response.status()).toBe(200);
}

/** The link the reset email carries. */
function emailLink(token: string) {
  return `/api/auth/reset-password/${token}?callbackURL=${encodeURIComponent(RESET_PAGE)}`;
}

async function openEmailLink(page: Page, token: string) {
  await page.goto(emailLink(token));
  await expect(page).toHaveURL(`${RESET_PAGE}?token=${token}`);
  await expect(
    page.getByRole("heading", { name: "Choose a new password", exact: true }),
  ).toBeVisible();
}

async function fillNewPassword(
  page: Page,
  password: string,
  confirm = password,
) {
  await page.getByLabel("New password", { exact: true }).fill(password);
  await page.getByLabel("Confirm new password", { exact: true }).fill(confirm);
}

function saveButton(page: Page) {
  return page.getByRole("button", { name: "Save new password", exact: true });
}

function sendButton(page: Page) {
  return page.getByRole("button", { name: "Send reset link", exact: true });
}

function brokenLinkHeading(page: Page) {
  return page.getByRole("heading", {
    name: "This reset link doesn't work",
    exact: true,
  });
}

function updatedHeading(page: Page) {
  return page.getByRole("heading", { name: "Password updated", exact: true });
}

function resetRows(database: Database, userId?: string) {
  const reset = like(verification.identifier, "reset-password:%");
  return database
    .select({ id: verification.id })
    .from(verification)
    .where(userId ? and(reset, eq(verification.value, userId)) : reset);
}

async function passwordHash(database: Database, userId: string) {
  const [credential] = await database
    .select({ password: account.password })
    .from(account)
    .where(
      and(eq(account.userId, userId), eq(account.providerId, "credential")),
    );
  return credential?.password;
}

test.describe(
  "Request a password reset link",
  { tag: "@forgot-password" },
  () => {
    test("a reset link is requested from the sign-in page", async ({
      page,
      candidate,
      database,
    }) => {
      await page.goto("/sign-in");
      await page
        .getByRole("link", { name: "Forgot your password?", exact: true })
        .click();
      await expect(page).toHaveURL(/\/forgot-password$/);
      await expect(
        page.getByRole("heading", { name: "Reset your password", exact: true }),
      ).toBeVisible();
      await page.getByLabel("Email", { exact: true }).fill(candidate.email);
      const sent = responseTo(page, REQUEST_RESET);
      await sendButton(page).click();
      const response = await sent;
      expect(response.status()).toBe(200);
      const body: unknown = response.request().postDataJSON();
      // The emailed link sends the user back to this app's reset page.
      expect(
        z.object({ email: z.string(), redirectTo: z.string() }).parse(body),
      ).toEqual({ email: candidate.email, redirectTo: RESET_PAGE });

      await expect(
        page.getByRole("heading", { name: "Check your email", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText(
          `We sent a reset link to ${candidate.email}. Open it to choose a new password. If it doesn't arrive, check your spam folder.`,
          { exact: true },
        ),
      ).toBeVisible();
      expect(await resetToken(database, candidate.id)).toHaveLength(24);

      await page
        .getByRole("link", { name: "Back to sign in", exact: true })
        .click();
      await expect(page).toHaveURL(/\/sign-in$/);
    });

    test("an unknown email gets the same answer and no link is made", async ({
      page,
      database,
    }) => {
      const before = (await resetRows(database)).length;
      await page.goto("/forgot-password");
      await page
        .getByLabel("Email", { exact: true })
        .fill(`nobody-${randomUUID()}@example.test`);
      const sent = responseTo(page, REQUEST_RESET);
      await sendButton(page).click();
      expect((await sent).status()).toBe(200);
      await expect(
        page.getByRole("heading", { name: "Check your email", exact: true }),
      ).toBeVisible();
      expect(await resetRows(database)).toHaveLength(before);
    });

    test("an empty or malformed address is stopped by the browser", async ({
      page,
    }) => {
      const posts = recordRequests(page, isPost(REQUEST_RESET));
      await page.goto("/forgot-password");
      const email = page.getByLabel("Email", { exact: true });
      await sendButton(page).click();
      expect(await validity(email)).toMatchObject({ valueMissing: true });
      await email.fill("not-an-email");
      await sendButton(page).click();
      expect(await validity(email)).toMatchObject({ typeMismatch: true });
      await expect(
        page.getByRole("heading", { name: "Reset your password", exact: true }),
      ).toBeVisible();
      expect(posts).toHaveLength(0);
    });

    test("an address without a dotted domain is refused by the server", async ({
      page,
    }) => {
      await page.goto("/forgot-password");
      await page.getByLabel("Email", { exact: true }).fill("user@localhost");
      const refused = responseTo(page, REQUEST_RESET);
      await sendButton(page).click();
      expect((await refused).status()).toBe(400);
      await expect(page.getByText(SEND_FAILED, { exact: true })).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Reset your password", exact: true }),
      ).toBeVisible();
    });

    test("after three requests in a minute the limit is explained", async ({
      page,
      request,
      candidate,
    }) => {
      for (let sent = 0; sent < 3; sent += 1)
        await requestReset(request, candidate.email);
      await page.goto("/forgot-password");
      await page.getByLabel("Email", { exact: true }).fill(candidate.email);
      const limited = responseTo(page, REQUEST_RESET);
      await sendButton(page).click();
      expect((await limited).status()).toBe(429);
      expectedFail(
        'src/app/(auth)/forgot-password/page.tsx:34: every result.error gets SEND_FAILED, so a 429 reads "Couldn\'t send the reset email. Check the address and try again."',
      );
      // Sign in and sign up word the same limit this way.
      await expect(
        page.getByText("Too many attempts. Wait a minute, then try again.", {
          exact: true,
        }),
      ).toBeVisible({ timeout: 2_000 });
    });

    test("a server error keeps the form so it can be sent again", async ({
      page,
      candidate,
    }) => {
      await page.route(`**${REQUEST_RESET}`, (route) =>
        route.fulfill({ status: 500, json: {} }),
      );
      await page.goto("/forgot-password");
      await page.getByLabel("Email", { exact: true }).fill(candidate.email);
      await sendButton(page).click();
      await expect(page.getByText(SEND_FAILED, { exact: true })).toBeVisible();
      await expect(page.getByLabel("Email", { exact: true })).toHaveValue(
        candidate.email,
      );
      await expect(sendButton(page)).toBeEnabled();
    });

    test("a dropped connection is reported", async ({ page, candidate }) => {
      let aborted = false;
      await page.route(`**${REQUEST_RESET}`, (route) => {
        aborted = true;
        return route.abort("internetdisconnected");
      });
      await page.goto("/forgot-password");
      await page.getByLabel("Email", { exact: true }).fill(candidate.email);
      await sendButton(page).click();
      await expect(page.getByText(SEND_FAILED, { exact: true })).toBeVisible();
      await expect(sendButton(page)).toBeEnabled();
      expect(aborted).toBe(true);
    });

    test("Send is disabled while sending and sends one request", async ({
      page,
      candidate,
    }) => {
      const pending = await hold(page, `**${REQUEST_RESET}`);
      await page.goto("/forgot-password");
      await page.getByLabel("Email", { exact: true }).fill(candidate.email);
      await sendButton(page).click();
      await expect(
        page.getByRole("button", { name: "Sending…", exact: true }),
      ).toBeDisabled();
      await page.getByLabel("Email", { exact: true }).press("Enter");
      expect(pending.requests).toHaveLength(1);
      pending.release();
      await expect(
        page.getByRole("heading", { name: "Check your email", exact: true }),
      ).toBeVisible();
      expect(pending.requests).toHaveLength(1);
    });

    test("a reset link cannot send the user to another site", async ({
      request,
      candidate,
      database,
    }) => {
      const response = await request.post(REQUEST_RESET, {
        headers: { Origin: BASE_URL },
        data: {
          email: candidate.email,
          redirectTo: "https://attacker.example/reset-password",
        },
      });
      expect(response.status()).toBe(403);
      expect(await resetRows(database, candidate.id)).toEqual([]);
    });
  },
);

test.describe(
  "Choose a new password from a reset link",
  { tag: "@reset-password" },
  () => {
    test("the emailed link opens the form and the new password replaces the old one", async ({
      page,
      request,
      candidate,
      database,
    }) => {
      await requestReset(request, candidate.email);
      const token = await resetToken(database, candidate.id);
      const before = await passwordHash(database, candidate.id);
      await openEmailLink(page, token);
      await fillNewPassword(page, NEW_PASSWORD);
      const saved = responseTo(page, RESET);
      await saveButton(page).click();
      expect((await saved).status()).toBe(200);
      await expect(updatedHeading(page)).toBeVisible();
      await expect(
        page.getByText("Sign in with your new password.", { exact: true }),
      ).toBeVisible();
      expect(await resetRows(database, candidate.id)).toEqual([]);
      const after = await passwordHash(database, candidate.id);
      expect(after).toEqual(expect.any(String));
      expect(after).not.toBe(before);
      await page.getByRole("link", { name: "Sign in", exact: true }).click();
      await expect(page).toHaveURL(/\/sign-in$/);
    });

    test("a reset ends every existing session, and only the new password signs in", async ({
      page,
      request,
      candidate,
      database,
      playwright,
      extraHTTPHeaders,
    }) => {
      const original = await playwright.request.newContext({
        baseURL: BASE_URL,
        storageState: candidate.storageState,
        extraHTTPHeaders,
      });
      try {
        expect((await original.get("/api/applications")).status()).toBe(200);
        await requestReset(request, candidate.email);
        await openEmailLink(page, await resetToken(database, candidate.id));
        await fillNewPassword(page, NEW_PASSWORD);
        await saveButton(page).click();
        await expect(updatedHeading(page)).toBeVisible();
        expect(
          await database
            .select({ id: session.id })
            .from(session)
            .where(eq(session.userId, candidate.id)),
        ).toEqual([]);
        expect((await original.get("/api/applications")).status()).toBe(401);
      } finally {
        await original.dispose();
      }

      await page.goto("/sign-in");
      await page.getByLabel("Email", { exact: true }).fill(candidate.email);
      await page
        .getByLabel("Password", { exact: true })
        .fill(candidate.password);
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      await expect(
        page.getByText("Email or password is incorrect.", { exact: true }),
      ).toBeVisible();
      await page.getByLabel("Password", { exact: true }).fill(NEW_PASSWORD);
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      await expect(page).toHaveURL(/\/dashboard$/);
      await expect(
        page.getByRole("heading", { name: "Dashboard", exact: true }),
      ).toBeVisible();
    });

    test("a link without a token says it doesn't work and offers a new one", async ({
      page,
    }) => {
      await page.goto("/reset-password");
      await expect(brokenLinkHeading(page)).toBeVisible();
      await expect(
        page.getByText(
          "It is incomplete or has expired. Request a new one to continue.",
          { exact: true },
        ),
      ).toBeVisible();
      await expect(
        page.getByLabel("New password", { exact: true }),
      ).toHaveCount(0);
      await page
        .getByRole("link", { name: "Request a new link", exact: true })
        .click();
      await expect(page).toHaveURL(/\/forgot-password$/);
    });

    test("an emailed link with an unknown token says it doesn't work", async ({
      page,
    }) => {
      await page.goto(emailLink("bogus-token"));
      await expect(page).toHaveURL(`${RESET_PAGE}?error=INVALID_TOKEN`);
      await expect(brokenLinkHeading(page)).toBeVisible();
    });

    test("an emailed link that has expired says it doesn't work", async ({
      page,
      request,
      candidate,
      database,
    }) => {
      await requestReset(request, candidate.email);
      const token = await resetToken(database, candidate.id);
      await database
        .update(verification)
        .set({ expiresAt: new Date(Date.now() - 1_000) })
        .where(eq(verification.identifier, `reset-password:${token}`));
      await page.goto(emailLink(token));
      await expect(page).toHaveURL(`${RESET_PAGE}?error=INVALID_TOKEN`);
      await expect(brokenLinkHeading(page)).toBeVisible();
    });

    test("an unknown token in the page address is refused on save", async ({
      page,
    }) => {
      await page.goto("/reset-password?token=bogus-token");
      await fillNewPassword(page, NEW_PASSWORD);
      const refused = responseTo(page, RESET);
      await saveButton(page).click();
      expect((await refused).status()).toBe(400);
      await expect(page.getByText(RESET_FAILED, { exact: true })).toBeVisible();
      await expect(saveButton(page)).toBeEnabled();
    });

    test("a link that expires while open is refused and the password is kept", async ({
      page,
      request,
      candidate,
      database,
    }) => {
      await requestReset(request, candidate.email);
      const token = await resetToken(database, candidate.id);
      const before = await passwordHash(database, candidate.id);
      await openEmailLink(page, token);
      await database
        .update(verification)
        .set({ expiresAt: new Date(Date.now() - 1_000) })
        .where(eq(verification.identifier, `reset-password:${token}`));
      await fillNewPassword(page, NEW_PASSWORD);
      const refused = responseTo(page, RESET);
      await saveButton(page).click();
      expect((await refused).status()).toBe(400);
      await expect(page.getByText(RESET_FAILED, { exact: true })).toBeVisible();
      expect(await passwordHash(database, candidate.id)).toBe(before);
    });

    test("a used link cannot reset the password again", async ({
      page,
      request,
      candidate,
      database,
    }) => {
      await requestReset(request, candidate.email);
      const token = await resetToken(database, candidate.id);
      await openEmailLink(page, token);
      await fillNewPassword(page, NEW_PASSWORD);
      await saveButton(page).click();
      await expect(updatedHeading(page)).toBeVisible();
      const afterFirst = await passwordHash(database, candidate.id);

      await page.goto(`/reset-password?token=${token}`);
      await fillNewPassword(page, "E2E-second-password-9012");
      const refused = responseTo(page, RESET);
      await saveButton(page).click();
      expect((await refused).status()).toBe(400);
      await expect(page.getByText(RESET_FAILED, { exact: true })).toBeVisible();
      expect(await passwordHash(database, candidate.id)).toBe(afterFirst);
    });

    test("different passwords are caught before sending and the link still works", async ({
      page,
      request,
      candidate,
      database,
    }) => {
      await requestReset(request, candidate.email);
      await openEmailLink(page, await resetToken(database, candidate.id));
      const posts = recordRequests(page, isPost(RESET));
      await fillNewPassword(page, "Abcdefgh1", "Abcdefgh2");
      await saveButton(page).click();
      await expect(
        page.getByText("The two passwords don't match.", { exact: true }),
      ).toBeVisible();
      await expect(saveButton(page)).toBeEnabled();
      expect(posts).toHaveLength(0);
      expect(await resetRows(database, candidate.id)).toHaveLength(1);
    });

    test("a short password is caught before sending and the link still works", async ({
      page,
      request,
      candidate,
      database,
    }) => {
      await requestReset(request, candidate.email);
      await openEmailLink(page, await resetToken(database, candidate.id));
      const posts = recordRequests(page, isPost(RESET));
      await fillNewPassword(page, "short7c");
      await saveButton(page).click();
      await expect(
        page.getByText("Use at least 8 characters for the password.", {
          exact: true,
        }),
      ).toBeVisible();
      expect(posts).toHaveLength(0);
      expect(await resetRows(database, candidate.id)).toHaveLength(1);
    });

    test("a password over 128 characters is refused, but the link can still be used", async ({
      page,
      request,
      candidate,
      database,
    }) => {
      await requestReset(request, candidate.email);
      await openEmailLink(page, await resetToken(database, candidate.id));
      await fillNewPassword(page, "a".repeat(129));
      const refused = responseTo(page, RESET);
      await saveButton(page).click();
      expect((await refused).status()).toBe(400);
      await expect(page.getByText(RESET_FAILED, { exact: true })).toBeVisible();
      // The length is checked before the token is spent.
      expect(await resetRows(database, candidate.id)).toHaveLength(1);
      await fillNewPassword(page, NEW_PASSWORD);
      await saveButton(page).click();
      await expect(updatedHeading(page)).toBeVisible();
    });

    test("empty fields are stopped by the browser", async ({ page }) => {
      const posts = recordRequests(page, isPost(RESET));
      await page.goto("/reset-password?token=unused-token");
      await saveButton(page).click();
      expect(
        await validity(page.getByLabel("New password", { exact: true })),
      ).toMatchObject({ valueMissing: true });
      await expect(
        page.getByRole("heading", {
          name: "Choose a new password",
          exact: true,
        }),
      ).toBeVisible();
      expect(posts).toHaveLength(0);
    });

    test("a server error is reported and the form can be sent again", async ({
      page,
    }) => {
      await page.route(`**${RESET}`, (route) =>
        route.fulfill({ status: 500, json: {} }),
      );
      await page.goto("/reset-password?token=stubbed-token");
      await fillNewPassword(page, NEW_PASSWORD);
      await saveButton(page).click();
      await expect(page.getByText(RESET_FAILED, { exact: true })).toBeVisible();
      await expect(saveButton(page)).toBeEnabled();
    });

    test("a dropped connection is reported", async ({ page }) => {
      let aborted = false;
      await page.route(`**${RESET}`, (route) => {
        aborted = true;
        return route.abort("internetdisconnected");
      });
      await page.goto("/reset-password?token=stubbed-token");
      await fillNewPassword(page, NEW_PASSWORD);
      await saveButton(page).click();
      await expect(page.getByText(RESET_FAILED, { exact: true })).toBeVisible();
      await expect(saveButton(page)).toBeEnabled();
      expect(aborted).toBe(true);
    });

    test("Save is disabled while saving and sends one request", async ({
      page,
      request,
      candidate,
      database,
    }) => {
      await requestReset(request, candidate.email);
      await openEmailLink(page, await resetToken(database, candidate.id));
      const pending = await hold(page, `**${RESET}`);
      await fillNewPassword(page, NEW_PASSWORD);
      await saveButton(page).click();
      await expect(
        page.getByRole("button", { name: "Saving…", exact: true }),
      ).toBeDisabled();
      await page
        .getByLabel("Confirm new password", { exact: true })
        .press("Enter");
      expect(pending.requests).toHaveLength(1);
      pending.release();
      await expect(updatedHeading(page)).toBeVisible();
      expect(pending.requests).toHaveLength(1);
    });
  },
);
