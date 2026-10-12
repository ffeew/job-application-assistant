import { applicationJsonResponseSchema } from "../../src/app/api/applications/validators";
import { test, expect } from "./support/fixtures";
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
