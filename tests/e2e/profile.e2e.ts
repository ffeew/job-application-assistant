import { test, expect } from "./support/fixtures";

test("seeded personal information populates inputs and edits survive reload", async ({
  page,
}) => {
  await page.goto("/dashboard/profile");
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  const form = page.getByRole("dialog", { name: "Edit Profile" });
  await expect(form.getByLabel("First Name", { exact: true })).toHaveValue(
    "Alex",
  );
  await expect(form.getByLabel("Email", { exact: true })).toHaveValue(
    "alex@example.test",
  );
  await form.getByLabel("First Name", { exact: true }).fill("Taylor");
  await form
    .getByLabel("Professional Summary", { exact: true })
    .fill("Engineer building dependable software.");
  await form.getByRole("button", { name: "Save Changes", exact: true }).click();
  await expect(form).not.toBeVisible();
  await expect(page.getByText("Taylor Example", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await expect(form.getByLabel("First Name", { exact: true })).toHaveValue(
    "Taylor",
  );
  await expect(
    form.getByLabel("Professional Summary", { exact: true }),
  ).toHaveValue("Engineer building dependable software.");
});

test("create, edit, and delete a skill", async ({ page }) => {
  await page.goto("/dashboard/profile");
  await page.getByRole("button", { name: /^Skills/ }).click();
  await page.getByRole("button", { name: "Add Skill", exact: true }).click();
  await page.getByLabel("Skill Name *", { exact: true }).fill("PostgreSQL");
  await page.getByLabel("Category *", { exact: true }).click();
  await page
    .getByRole("option", { name: "Technical", exact: true })
    .click();
  await page.getByLabel("Years of Experience").fill("3");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByText("PostgreSQL", { exact: true })).toBeVisible();
  await page.getByText("PostgreSQL", { exact: true }).hover();
  await page
    .getByRole("button", { name: "Edit PostgreSQL", exact: true })
    .click();
  await expect(page.getByLabel("Skill Name *", { exact: true })).toHaveValue(
    "PostgreSQL",
  );
  await page.getByLabel("Skill Name *", { exact: true }).fill("PostgreSQL 18");
  await page.getByRole("button", { name: "Update", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: /^Skills/ }).click();
  await expect(page.getByText("PostgreSQL 18", { exact: true })).toBeVisible();
  await page.getByText("PostgreSQL 18", { exact: true }).hover();
  await page
    .getByRole("button", { name: "Delete PostgreSQL 18", exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await expect(
    page.getByText("PostgreSQL 18", { exact: true }),
  ).not.toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: /^Skills/ }).click();
  await expect(
    page.getByText("PostgreSQL 18", { exact: true }),
  ).not.toBeVisible();
});
