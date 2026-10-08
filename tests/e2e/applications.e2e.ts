import { applicationJsonResponseSchema } from "../../src/app/api/applications/validators";
import { test, expect } from "./support/fixtures";
import { BASE_URL } from "./support/runtime";

test("create, edit, and delete an application and refresh dashboard counts", async ({
  page,
}) => {
  await page.goto("/dashboard/applications/new");
  await page
    .getByRole("button", { name: "Save Application", exact: true })
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
    .getByRole("button", { name: "Save Application", exact: true })
    .click();
  await expect(page).toHaveURL(/\/dashboard\/applications$/);
  await expect(
    page
      .getByText("Browser Test Co", { exact: true })
      .filter({ visible: true }),
  ).toBeVisible();
  await page.goto("/dashboard");
  const applicationsCard = page
    .locator('[data-slot="card"]')
    .filter({ has: page.getByText("Applications", { exact: true }) });
  await expect(applicationsCard.getByText("2", { exact: true })).toBeVisible();
  await page.goto("/dashboard/applications");
  const card = page
    .locator('[data-slot="card"]')
    .filter({ has: page.getByText("Browser Test Co", { exact: true }) })
    .filter({ visible: true });
  await card.getByRole("link", { name: "Edit", exact: true }).click();
  await expect(page.getByLabel("Company *", { exact: true })).toHaveValue(
    "Browser Test Co",
  );
  await page.getByLabel("Status", { exact: true }).click();
  await page.getByRole("option", { name: "Interviewing", exact: true }).click();
  await page
    .getByLabel("Notes", { exact: true })
    .fill("Technical interview scheduled.");
  await page.getByRole("button", { name: "Save Changes", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/applications$/);
  await card.getByRole("link", { name: "Edit", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/applications\/[a-f\d-]+$/);
  await page.reload();
  await expect(page.getByLabel("Status", { exact: true })).toHaveText(
    "Interviewing",
  );
  await expect(page.getByLabel("Notes", { exact: true })).toHaveValue(
    "Technical interview scheduled.",
  );
  await page.goto("/dashboard/applications");
  page.once("dialog", (dialog) => {
    void dialog.accept().catch((error: unknown) => console.error(error));
  });
  await page
    .getByRole("button", {
      name: "Delete application at Browser Test Co",
      exact: true,
    })
    .click();
  await expect(
    page
      .getByText("Browser Test Co", { exact: true })
      .filter({ visible: true }),
  ).not.toBeVisible();
  await page.goto("/dashboard");
  await expect(applicationsCard.getByText("1", { exact: true })).toBeVisible();
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
      otherPage.getByText("Error loading application", { exact: true }),
    ).toBeVisible();
    await expect(
      otherPage.getByRole("button", {
        name: "Generate & Save PDF",
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
