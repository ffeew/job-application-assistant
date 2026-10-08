import { defineConfig, devices } from "@playwright/test";
import { BASE_URL } from "./tests/e2e/support/runtime";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.e2e.ts",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  outputDir: "artifacts/e2e/results",
  reporter: [
    ["line"],
    ["html", { outputFolder: "artifacts/e2e/report", open: "never" }],
  ],
  use: {
    baseURL: BASE_URL,
    actionTimeout: 15_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
