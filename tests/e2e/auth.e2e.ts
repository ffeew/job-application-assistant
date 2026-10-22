import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { user } from "../../src/lib/db/schema";
import { test, expect } from "./support/fixtures";

test.use({ authenticated: false });

test("dashboard requires authentication", async ({ page, request }) => {
  await page.goto("/dashboard/profile");
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
  expect((await request.get("/api/applications")).status()).toBe(401);
});

test("sign up, reload the session, sign out, and sign back in", async ({
  page,
  database,
}) => {
  const email = `signup-${randomUUID()}@example.test`;
  const password = "E2E-signup-password-1234";
  try {
    await page.goto("/sign-up");
    await page.getByLabel("Full name").fill("New Example Candidate");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByLabel("Confirm password").fill(password);
    await page
      .getByRole("button", { name: "Create account", exact: true })
      .click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole("heading", { name: "Dashboard", exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(page.getByText(email, { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/sign-in$/);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/sign-in$/);
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText(email, { exact: true })).toBeVisible();
  } finally {
    await database.delete(user).where(eq(user.email, email));
  }
});

test("rejected credentials keep the candidate on sign in", async ({
  page,
  candidate,
}) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email", { exact: true }).fill(candidate.email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("Incorrect-password-1234");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByText("Email or password is incorrect.", { exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/sign-in$/);
});

test("sign-up links lead to sign up while registration is open", async ({
  page,
}) => {
  await page.goto("/");
  const banner = page.getByRole("banner");
  // The header shows placeholders until the session check returns.
  await expect(
    banner.getByRole("link", { name: "Create account", exact: true }),
  ).toBeVisible();
  for (const region of [
    banner,
    page.getByRole("main"),
    page.getByRole("contentinfo"),
  ]) {
    await expect(
      region.getByRole("link", { name: "Create account", exact: true }),
    ).toHaveAttribute("href", "/sign-up");
  }
  await page.goto("/sign-in");
  await expect(
    page.getByRole("link", { name: "Create one", exact: true }),
  ).toHaveAttribute("href", "/sign-up");
});

test.describe("registration closed (DISABLE_SIGNUP=true)", () => {
  const signUpLinks = 'a[href="/sign-up"]';

  test("the landing and sign-in pages don't link to sign up", async ({
    page,
    closedSignUpURL,
  }) => {
    await page.goto(`${closedSignUpURL}/`);
    // Wait for the session check first, so the absence below is not of
    // header placeholders.
    await expect(
      page
        .getByRole("banner")
        .getByRole("link", { name: "Sign in", exact: true }),
    ).toBeVisible();
    await expect(page.locator(signUpLinks)).toHaveCount(0);
    for (const region of [
      page.getByRole("main"),
      page.getByRole("contentinfo"),
    ]) {
      await expect(
        region.getByRole("link", { name: "Sign in", exact: true }),
      ).toHaveAttribute("href", "/sign-in");
    }

    await page.goto(`${closedSignUpURL}/sign-in`);
    await expect(
      page.getByRole("link", { name: "Forgot your password?", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "New accounts are turned off on this server. Ask whoever runs it for access.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(page.locator(signUpLinks)).toHaveCount(0);
  });

  test.describe("on a phone", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("the menu offers only sign in", async ({ page, closedSignUpURL }) => {
      await page.goto(`${closedSignUpURL}/`);
      // The header's (hidden) sign-in link appears once the session check has
      // run, so the menu trigger is hydrated before it is clicked.
      await expect(
        page.getByRole("banner").locator('a[href="/sign-in"]'),
      ).toBeAttached();
      await page
        .getByRole("button", { name: "Open menu", exact: true })
        .click();
      await expect(
        page
          .getByRole("dialog", { name: "Menu", exact: true })
          .getByRole("link", { name: "Sign in", exact: true }),
      ).toBeVisible();
      await expect(page.locator(signUpLinks)).toHaveCount(0);
    });
  });

  test("an existing account still signs in", async ({
    page,
    candidate,
    closedSignUpURL,
  }) => {
    await page.goto(`${closedSignUpURL}/sign-in`);
    await page.getByLabel("Email", { exact: true }).fill(candidate.email);
    await page.getByLabel("Password", { exact: true }).fill(candidate.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(`${closedSignUpURL}/dashboard`);
    await expect(
      page.getByRole("heading", { name: "Dashboard", exact: true }),
    ).toBeVisible();
  });

  test("sign up is refused", async ({
    page,
    request,
    database,
    closedSignUpURL,
  }) => {
    const email = `closed-${randomUUID()}@example.test`;
    try {
      await page.goto(`${closedSignUpURL}/sign-up`);
      await expect(
        page.getByRole("heading", {
          name: "Registration is closed",
          exact: true,
        }),
      ).toBeVisible();

      const response = await request.post(
        `${closedSignUpURL}/api/auth/sign-up/email`,
        {
          // The closed app trusts only its own origin.
          headers: { Origin: closedSignUpURL },
          data: {
            name: "Closed Example",
            email,
            password: "E2E-signup-password-1234",
          },
        },
      );
      expect(response.status()).toBe(400);
      const body: unknown = await response.json();
      expect(body).toMatchObject({ code: "EMAIL_PASSWORD_SIGN_UP_DISABLED" });
      expect(
        await database.select().from(user).where(eq(user.email, email)),
      ).toEqual([]);
    } finally {
      await database.delete(user).where(eq(user.email, email));
    }
  });
});
