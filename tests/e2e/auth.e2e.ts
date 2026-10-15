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
