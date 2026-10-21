import type { Page } from "@playwright/test";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { userProfiles } from "../../src/lib/db/schema";
import { generateConversationStarterResponseSchema } from "../../src/app/api/conversation-starters/validators";
import { test, expect } from "./support/fixtures";
import {
  completion,
  providerError,
  userPrompt,
  type FakeAI,
} from "./support/fake-ai";
import {
  anonymousRequest,
  errorBody,
  expectedFail,
  hold,
  MALFORMED_JSON,
  recordRequests,
} from "./support/helpers";
import { BASE_URL } from "./support/runtime";

const PAGE = "/dashboard/conversation-starters";
const GENERATE = "/api/conversation-starters/generate";
const PROSPECT =
  "Jordan Lee, engineering manager at Example Industries; we met at a meetup.";
const MESSAGE =
  "Hi Jordan, it was great meeting you at the meetup. Could we chat about your platform team?";
const FAILED = "Failed to generate conversation starter. Please try again.";
const TOO_SHORT = "Add a little more about who you're writing to.";
const RATE_LIMITED =
  "You're sending requests too quickly. Wait a minute, then try again.";

const prospectField = (page: Page) =>
  page.getByLabel("Who are you writing to? *", { exact: true });
const contextField = (page: Page) =>
  page.getByLabel("Anything else to mention", { exact: true });
const messageField = (page: Page) =>
  page.getByLabel("Message", { exact: true });
const writeButton = (page: Page) =>
  page.getByRole("button", { name: "Write message", exact: true });
const copyButton = (page: Page) =>
  page.getByRole("button", { name: "Copy message", exact: true });
const clearButton = (page: Page) =>
  page.getByRole("button", { name: "Clear", exact: true });

const isGenerate = (url: string, method: string) =>
  method === "POST" && new URL(url).pathname === GENERATE;

function generateRequests(page: Page) {
  return recordRequests(page, (request) =>
    isGenerate(request.url(), request.method()),
  );
}

function generated(page: Page) {
  return page.waitForResponse((response) =>
    isGenerate(response.url(), response.request().method()),
  );
}

/** Writes MESSAGE through the fake model from the default prospect details. */
async function writeMessage(page: Page, ai: FakeAI) {
  ai.reply(completion(MESSAGE));
  await page.goto(PAGE);
  await prospectField(page).fill(PROSPECT);
  await writeButton(page).click();
  await expect(messageField(page)).toHaveValue(MESSAGE);
}

test.describe(
  "Conversation starters page and profile notice",
  { tag: "@CS-1" },
  () => {
    test("opens from the nav with the saved profile named and nothing written yet", async ({
      page,
    }) => {
      await page.goto("/dashboard");
      const link = page
        .getByRole("navigation", { name: "Main" })
        .getByRole("link", { name: "Conversation starters", exact: true });
      await link.click();
      await expect(page).toHaveURL(/\/dashboard\/conversation-starters$/);
      await expect(link).toHaveAttribute("aria-current", "page");
      await expect(
        page.getByRole("heading", { name: "Conversation starters", level: 1 }),
      ).toBeVisible();
      await expect(
        page.getByText(
          "A short first message to someone at a company, written from what you know about them and your profile.",
          { exact: true },
        ),
      ).toBeVisible();
      await expect(
        page.getByText(
          "Your saved profile (Alex Example) is used to introduce you.",
        ),
      ).toHaveText(
        "Your saved profile (Alex Example) is used to introduce you. Update your profile if something looks off.",
      );
      await expect(writeButton(page)).toBeEnabled();
      await expect(copyButton(page)).toBeDisabled();
      await expect(messageField(page)).toHaveValue("");
      await page
        .getByRole("link", { name: "Update your profile", exact: true })
        .click();
      await expect(page).toHaveURL(/\/dashboard\/profile$/);
    });

    test("without a profile it asks for the background first", async ({
      page,
      database,
      candidate,
    }) => {
      await database
        .delete(userProfiles)
        .where(eq(userProfiles.userId, candidate.id));
      await page.goto(PAGE);
      await expect(
        page.getByText("No profile yet", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText("Without it the message can't say who you are."),
      ).toHaveText(
        "Without it the message can't say who you are. Add your background first.",
      );
      await expect(
        page.getByRole("link", { name: "Add your background", exact: true }),
      ).toHaveAttribute("href", "/dashboard/profile");
      await expect(page.getByText("Your saved profile")).toHaveCount(0);
    });

    test("a profile without names introduces the sender without one", async ({
      page,
      database,
      candidate,
    }) => {
      await database
        .update(userProfiles)
        .set({ firstName: null, lastName: null })
        .where(eq(userProfiles.userId, candidate.id));
      await page.goto(PAGE);
      await expect(
        page.getByText("Your saved profile is used to introduce you."),
      ).toHaveText(
        "Your saved profile is used to introduce you. Update your profile if something looks off.",
      );
    });

    test("a profile that fails to load is not reported as missing", async ({
      page,
    }) => {
      await page.route("**/api/profile", (route) =>
        route.fulfill({ status: 403, json: { error: "Profile unavailable" } }),
      );
      const loaded = page.waitForResponse(
        (response) => new URL(response.url()).pathname === "/api/profile",
      );
      await page.goto(PAGE);
      expect((await loaded).status()).toBe(403);
      await expect(
        page.getByRole("heading", { name: "Conversation starters", level: 1 }),
      ).toBeVisible();
      // The skeleton stays until the request settles, so its absence means the
      // notice area shows its final state.
      await expect(page.getByRole("main").getByRole("status")).toHaveCount(0);
      expectedFail(
        'src/app/dashboard/conversation-starters/page.tsx:107: only isLoading and data are read, so a failed profile query falls through to the "No profile yet" notice',
      );
      // The warning notice has no role, so this alert can only be an error state.
      await expect(page.getByRole("main").getByRole("alert")).toBeVisible({
        timeout: 2_000,
      });
      await expect(
        page.getByText("No profile yet", { exact: true }),
      ).toHaveCount(0, { timeout: 2_000 });
    });

    test.describe("signed out", () => {
      test.use({ authenticated: false });

      test("is sent to sign in", async ({ page }) => {
        await page.goto(PAGE);
        await expect(page).toHaveURL(/\/sign-in$/);
        await expect(
          page.getByRole("button", { name: "Sign in", exact: true }),
        ).toBeVisible();
      });
    });
  },
);

test.describe(
  "Write a message: validation and failures",
  { tag: "@CS-2" },
  () => {
    test("empty details are refused without a request", async ({ page }) => {
      const sent = generateRequests(page);
      await page.goto(PAGE);
      await writeButton(page).click();
      await expect(page.getByText(TOO_SHORT, { exact: true })).toBeVisible();
      expect(sent).toHaveLength(0);
    });

    test("surrounding spaces do not count toward the 20 characters", async ({
      page,
    }) => {
      const sent = generateRequests(page);
      await page.goto(PAGE);
      await prospectField(page).fill(`   ${"x".repeat(19)}   `);
      await writeButton(page).click();
      await expect(page.getByText(TOO_SHORT, { exact: true })).toBeVisible();
      expect(sent).toHaveLength(0);
    });

    test("exactly 20 characters is enough for the page and the server", async ({
      page,
      ai,
    }) => {
      ai.reply(completion(MESSAGE));
      await page.goto(PAGE);
      await prospectField(page).fill("x".repeat(20));
      const response = generated(page);
      await writeButton(page).click();
      expect((await response).status()).toBe(200);
      await expect(messageField(page)).toHaveValue(MESSAGE);
    });

    test("over-long details are refused by the server before the model is called", async ({
      page,
      ai,
    }) => {
      await page.goto(PAGE);
      await prospectField(page).fill("x".repeat(2001));
      const response = generated(page);
      await writeButton(page).click();
      expect((await response).status()).toBe(400);
      await expect(
        page.getByText("Invalid request data", { exact: true }),
      ).toBeVisible();
      await expect(messageField(page)).toHaveValue("");
      expect(ai.requests()).toHaveLength(0);
    });

    test("over-long extra context is refused by the server", async ({
      page,
      ai,
    }) => {
      await page.goto(PAGE);
      await prospectField(page).fill(PROSPECT);
      await contextField(page).fill("y".repeat(1201));
      const response = generated(page);
      await writeButton(page).click();
      expect((await response).status()).toBe(400);
      await expect(
        page.getByText("Invalid request data", { exact: true }),
      ).toBeVisible();
      expect(ai.requests()).toHaveLength(0);
    });

    test("a model failure is reported and the details are kept", async ({
      page,
      ai,
    }) => {
      // Unscripted, the fake provider rejects the call, as a provider outage would.
      await page.goto(PAGE);
      await prospectField(page).fill(PROSPECT);
      await contextField(page).fill("Ask about the platform team.");
      const response = generated(page);
      await writeButton(page).click();
      const failed = await response;
      expect(failed.status()).toBe(500);
      expect(await failed.json()).toEqual({ error: FAILED });
      await expect(page.getByText(FAILED, { exact: true })).toBeVisible();
      await expect(messageField(page)).toHaveValue("");
      await expect(copyButton(page)).toBeDisabled();
      await expect(prospectField(page)).toHaveValue(PROSPECT);
      await expect(contextField(page)).toHaveValue(
        "Ask about the platform team.",
      );
      expect(ai.requests()).toHaveLength(1);
    });

    test("a provider outage is retried, and a later success is used", async ({
      page,
      ai,
    }) => {
      ai.reply(providerError(503));
      await writeMessage(page, ai);
      expect(ai.requests()).toHaveLength(2);
    });

    test("a provider that stays down fails after three attempts", async ({
      page,
      ai,
    }) => {
      for (let attempt = 0; attempt < 3; attempt += 1)
        ai.reply(providerError(503));
      await page.goto(PAGE);
      await prospectField(page).fill(PROSPECT);
      await writeButton(page).click();
      await expect(page.getByText(FAILED, { exact: true })).toBeVisible();
      expect(ai.requests()).toHaveLength(3);
    });

    test("the per-account limit stops a burst before the model is called", async ({
      page,
      request,
      ai,
    }) => {
      // Rejected requests still count, and the limit is 10 a minute.
      for (let sent = 0; sent < 10; sent += 1)
        expect((await request.post(GENERATE, { data: {} })).status()).toBe(400);
      await page.goto(PAGE);
      await prospectField(page).fill(PROSPECT);
      await writeButton(page).click();
      await expect(page.getByText(RATE_LIMITED, { exact: true })).toBeVisible();
      expect(ai.requests()).toHaveLength(0);
    });

    test("an error without a readable message gets the request's fallback", async ({
      page,
    }) => {
      await page.route(`**${GENERATE}`, (route) =>
        route.fulfill({ status: 500, body: "Internal error page" }),
      );
      await page.goto(PAGE);
      await prospectField(page).fill(PROSPECT);
      await writeButton(page).click();
      await expect(
        page.getByText("Failed to generate conversation starter", {
          exact: true,
        }),
      ).toBeVisible();
      await expect(messageField(page)).toHaveValue("");
    });

    test("a dropped connection gets the page's own message", async ({
      page,
    }) => {
      let aborted = false;
      await page.route(`**${GENERATE}`, (route) => {
        aborted = true;
        return route.abort("internetdisconnected");
      });
      await page.goto(PAGE);
      await prospectField(page).fill(PROSPECT);
      await writeButton(page).click();
      await expect(
        page.getByText("Failed to fetch", { exact: true }),
      ).toBeVisible();
      expect(aborted).toBe(true);
      expectedFail(
        "src/app/dashboard/conversation-starters/page.tsx:75: the browser's TypeError message is shown, because the error is always an Error, so the page's fallback never applies",
      );
      await expect(
        page.getByText("Couldn't write the message. Try again.", {
          exact: true,
        }),
      ).toBeVisible({ timeout: 2_000 });
    });

    test("the API requires a session", async ({
      playwright,
      extraHTTPHeaders,
    }) => {
      const anonymous = await anonymousRequest(playwright, extraHTTPHeaders);
      try {
        const response = await anonymous.post(GENERATE, {
          data: { prospectDetails: PROSPECT },
        });
        expect(response.status()).toBe(401);
        expect(await response.json()).toEqual({ error: "Unauthorized" });
      } finally {
        await anonymous.dispose();
      }
    });

    test("the API rejects invalid bodies with field messages before the model", async ({
      request,
      ai,
    }) => {
      const cases: [unknown, string][] = [
        [{}, "Invalid input: expected string, received undefined"],
        [
          { prospectDetails: "Too short" },
          "Share a bit more about the person to personalize the outreach.",
        ],
        [
          { prospectDetails: `   ${"x".repeat(19)}   ` },
          "Share a bit more about the person to personalize the outreach.",
        ],
        [
          { prospectDetails: "x".repeat(2001) },
          "Prospect details are too long",
        ],
        [
          { prospectDetails: PROSPECT, additionalContext: "y".repeat(1201) },
          "Additional context is too long",
        ],
      ];
      for (const [data, message] of cases) {
        const response = await request.post(GENERATE, { data });
        expect(response.status()).toBe(400);
        const body = await errorBody(response);
        expect(body.error).toBe("Invalid request data");
        expect(body.messages).toContain(message);
      }
      expect(ai.requests()).toHaveLength(0);
    });

    test("the API rejects malformed JSON as a bad request", async ({
      request,
    }) => {
      const response = await request.post(GENERATE, MALFORMED_JSON);
      expect(response.status()).toBe(500);
      expectedFail(
        "src/app/api/conversation-starters/generate/route.ts:24: request.json() is outside routeErrorResponse, so a SyntaxError becomes a 500 with the parser's message",
      );
      expect(response.status()).toBe(400);
    });

    test("the API allows ten requests a minute per account", async ({
      request,
      createCandidate,
      playwright,
      extraHTTPHeaders,
    }) => {
      for (let sent = 0; sent < 10; sent += 1)
        expect((await request.post(GENERATE, { data: {} })).status()).toBe(400);
      const limited = await request.post(GENERATE, { data: {} });
      expect(limited.status()).toBe(429);
      expect(await limited.json()).toEqual({ error: RATE_LIMITED });
      const retryAfter = Number(limited.headers()["retry-after"]);
      expect(retryAfter).toBeGreaterThanOrEqual(1);
      expect(retryAfter).toBeLessThanOrEqual(60);

      const other = await createCandidate();
      const otherRequest = await playwright.request.newContext({
        baseURL: BASE_URL,
        storageState: other.storageState,
        extraHTTPHeaders,
      });
      try {
        expect((await otherRequest.post(GENERATE, { data: {} })).status()).toBe(
          400,
        );
      } finally {
        await otherRequest.dispose();
      }
    });
  },
);

test.describe("Write, edit, copy and clear a message", { tag: "@CS-3" }, () => {
  test.use({ permissions: ["clipboard-read", "clipboard-write"] });

  test("writes from the details, the profile and the default resume", async ({
    page,
    request,
    ai,
  }) => {
    const resume = await request.post("/api/resumes", {
      data: {
        title: "Default Resume",
        content: JSON.stringify({
          experience: "Led the payments team.",
          skills: "Go, Rust",
        }),
        isDefault: true,
      },
    });
    expect(resume.status()).toBe(201);
    // The model's reply is trimmed before it is shown.
    ai.reply(completion(`  ${MESSAGE}\n`));
    await page.goto(PAGE);
    await prospectField(page).fill(`  ${PROSPECT}  `);
    await contextField(page).fill("  Ask about the platform team.  ");
    const sent = page.waitForRequest((request) =>
      isGenerate(request.url(), request.method()),
    );
    await writeButton(page).click();
    await expect(
      page.getByText("Message ready", { exact: true }),
    ).toBeVisible();
    await expect(messageField(page)).toHaveValue(MESSAGE);
    await expect(copyButton(page)).toBeEnabled();

    const body: unknown = (await sent).postDataJSON();
    expect(
      z
        .object({ prospectDetails: z.string(), additionalContext: z.string() })
        .strict()
        .parse(body),
    ).toEqual({
      prospectDetails: `  ${PROSPECT}  `,
      additionalContext: "  Ask about the platform team.  ",
    });
    const [call] = ai.requests();
    const prompt = call ? userPrompt(call) : undefined;
    expect(prompt).toContain(
      `Prospect information (verbatim from the user):\n${PROSPECT}\n`,
    );
    expect(prompt).toContain("Name: Alex Example");
    expect(prompt).toContain(
      "Professional summary: Software engineer building reliable applications.",
    );
    expect(prompt).toContain("Location: Singapore");
    expect(prompt).toContain(
      "Recent experience highlights: Led the payments team.",
    );
    expect(prompt).toContain("Key skills: Go, Rust");
    expect(prompt).toContain(
      "Extra notes from the sender:\nAsk about the platform team.\n",
    );
  });

  test("without extra context the prompt says none was given", async ({
    page,
    ai,
  }) => {
    await writeMessage(page, ai);
    const [call] = ai.requests();
    expect(call ? userPrompt(call) : undefined).toContain(
      "Extra notes from the sender:\nNone provided",
    );
  });

  test("an edited message is what gets copied", async ({ page, ai }) => {
    await writeMessage(page, ai);
    await messageField(page).fill(`${MESSAGE} Thanks, Alex`);
    await copyButton(page).click();
    await expect(
      page.getByText("Message copied", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Copied", exact: true }),
    ).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      `${MESSAGE} Thanks, Alex`,
    );
    await expect(copyButton(page)).toBeVisible();
  });

  test("Clear empties the details and the message", async ({ page, ai }) => {
    await writeMessage(page, ai);
    await contextField(page).fill("Ask about the platform team.");
    await clearButton(page).click();
    await expect(prospectField(page)).toHaveValue("");
    await expect(contextField(page)).toHaveValue("");
    await expect(messageField(page)).toHaveValue("");
    await expect(copyButton(page)).toBeDisabled();
  });

  test("nothing is kept after a reload", async ({ page, ai }) => {
    await writeMessage(page, ai);
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Conversation starters", level: 1 }),
    ).toBeVisible();
    await expect(prospectField(page)).toHaveValue("");
    await expect(messageField(page)).toHaveValue("");
  });

  test("writing again replaces an edited message", async ({ page, ai }) => {
    await writeMessage(page, ai);
    await messageField(page).fill("My own edit");
    ai.reply(completion("Hi Jordan, a second take."));
    const response = generated(page);
    await writeButton(page).click();
    expect((await response).status()).toBe(200);
    await expect(messageField(page)).toHaveValue("Hi Jordan, a second take.");
  });

  test("shows that it is writing and blocks a second request", async ({
    page,
    ai,
  }) => {
    ai.reply(completion(MESSAGE));
    const pending = await hold(page, `**${GENERATE}`);
    await page.goto(PAGE);
    await prospectField(page).fill(PROSPECT);
    await writeButton(page).click();
    await expect(
      page.getByRole("button", { name: "Writing…", exact: true }),
    ).toBeDisabled();
    await expect(clearButton(page)).toBeDisabled();
    expect(pending.requests).toHaveLength(1);
    pending.release();
    await expect(messageField(page)).toHaveValue(MESSAGE);
    await expect(clearButton(page)).toBeEnabled();
  });

  test("a response the page cannot read is reported", async ({ page }) => {
    await page.route(`**${GENERATE}`, (route) =>
      route.fulfill({ json: { message: "Hi", success: false } }),
    );
    await page.goto(PAGE);
    await prospectField(page).fill(PROSPECT);
    await writeButton(page).click();
    await expect(
      page.getByText("Received an invalid server response. Please try again.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(messageField(page)).toHaveValue("");
  });

  test("a message typed by hand can be copied", async ({ page }) => {
    await page.goto(PAGE);
    await messageField(page).fill("Hi Sam, typed myself.");
    await copyButton(page).click();
    await expect(
      page.getByText("Message copied", { exact: true }),
    ).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      "Hi Sam, typed myself.",
    );
  });

  test("a refused clipboard asks the user to copy by hand", async ({
    page,
  }) => {
    await page.goto(PAGE);
    await messageField(page).fill("Hi Sam, typed myself.");
    await page.evaluate(() => {
      Object.defineProperty(navigator.clipboard, "writeText", {
        value: () =>
          Promise.reject(new DOMException("Denied", "NotAllowedError")),
      });
    });
    await copyButton(page).click();
    await expect(
      page.getByText("Couldn't copy. Select the text and copy it by hand.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(copyButton(page)).toBeVisible();
  });

  test("the API returns the trimmed message", async ({ request, ai }) => {
    ai.reply(completion(`\n${MESSAGE}  `));
    const response = await request.post(GENERATE, {
      data: { prospectDetails: PROSPECT },
    });
    expect(response.status()).toBe(200);
    const raw: unknown = await response.json();
    expect(generateConversationStarterResponseSchema.parse(raw)).toEqual({
      message: MESSAGE,
      success: true,
    });
  });
});
