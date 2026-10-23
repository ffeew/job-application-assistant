import { defineConfig, devices } from "@playwright/test";
import { BASE_URL } from "./tests/e2e/support/runtime";

// Test workers inherit this, so dates computed in a test match the browser's.
process.env.TZ = "UTC";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.e2e.ts",
  globalSetup: "./tests/e2e/global-setup.ts",
  // Lets --shard split by test rather than by file. One worker stays, because
  // the generation worker claims any user's queued jobs.
  fullyParallel: true,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  // Under CI a broken shard stops early, and stops on its own before the job
  // timeout, so teardown still writes the report and service logs.
  maxFailures: process.env.CI ? 25 : 0,
  globalTimeout: process.env.CI ? 20 * 60_000 : 0,
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
    locale: "en-US",
    timezoneId: "UTC",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
