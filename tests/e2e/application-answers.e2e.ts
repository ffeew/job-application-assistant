import type { Page } from "@playwright/test";
import { eq } from "drizzle-orm";
import { jobApplications, userProfiles } from "../../src/lib/db/schema";
import { test, expect } from "./support/fixtures";
import {
  completion,
  providerError,
  userPrompt,
  type FakeAI,
} from "./support/fake-ai";
import {
  anonymousRequest,
  call,
  errorBody,
  expectedFail,
  hold,
  MALFORMED_JSON,
  recordRequests,
  responseTo,
  revokeSessions,
} from "./support/helpers";

const PAGE = "/dashboard/application-answers";
const GENERATE = "/api/application-answers/generate";
const JOB = "Software Engineer at Example Industries";
const FAILED = "Failed to draft the answers";
const TOO_LARGE =
  "Too many questions or too large a profile for the model. Paste fewer questions.";
const RATE_LIMITED =
  "You're sending requests too quickly. Wait a minute, then try again.";
const EMPTY_ANSWERS = "The answers appear here, one per question.";
const WHY = "Why do you want this role?";
const WHY_ANSWER =
  "I build reliable web applications in TypeScript at Example Co.";

function questions(page: Page) {
  return page.getByLabel("Questions *", { exact: true });
}

function draftButton(page: Page) {
  return page.getByRole("button", { name: "Draft answers", exact: true });
}

function answers(page: Page) {
  return page.getByRole("region", { name: "Answers" });
}

function toast(page: Page, text: string) {
  return page.getByText(text, { exact: true });
}

function reply(items: { question: string; answer: string; reason?: string }[]) {
  return completion(
    JSON.stringify({
      answers: items.map((item) => ({ reason: "", ...item })),
    }),
  );
}

async function chooseJob(page: Page, name = JOB) {
  await page.getByLabel("Application", { exact: true }).click();
  await page.getByRole("option", { name, exact: true }).click();
}

/** Drafts one answer through the fake model from the default page. */
async function draftWhy(page: Page, ai: FakeAI) {
  ai.reply(reply([{ question: WHY, answer: WHY_ANSWER }]));
  await page.goto(PAGE);
  await questions(page).fill(WHY);
  await draftButton(page).click();
  await expect(answers(page).getByLabel(WHY, { exact: true })).toHaveValue(
    WHY_ANSWER,
  );
}

test.describe(
  "Application questions page: first view",
  { tag: "@AA-1" },
  () => {
    test("opens from the nav with the profile named and nothing drafted", async ({
      page,
    }) => {
      await page.goto("/dashboard");
      const link = page
        .getByRole("navigation", { name: "Main" })
        .getByRole("link", { name: "Application questions", exact: true });
      await link.click();
      await expect(page).toHaveURL(/\/dashboard\/application-answers$/);
      await expect(link).toHaveAttribute("aria-current", "page");
      await expect(
        page.getByRole("heading", { name: "Application questions", level: 1 }),
      ).toBeVisible();
      await expect(
        page.getByText("Answers use only what your saved profile says."),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Update your profile", exact: true }),
      ).toHaveAttribute("href", "/dashboard/profile");
      const picker = page.getByLabel("Application", { exact: true });
      await expect(picker).toHaveText("No saved job");
      await expect(picker).toHaveAccessibleDescription(
        "Optional. Lets answers speak to this job.",
      );
      await expect(questions(page)).toHaveValue("");
      await expect(draftButton(page)).toBeEnabled();
      await expect(
        page.getByRole("button", { name: "Clear", exact: true }),
      ).toBeEnabled();
      await expect(answers(page)).toContainText(EMPTY_ANSWERS);
    });

    test("without a profile it asks for one, and drafting stays open", async ({
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
        page.getByRole("link", { name: "Add your background", exact: true }),
      ).toHaveAttribute("href", "/dashboard/profile");
      await expect(draftButton(page)).toBeEnabled();
    });

    test("without applications there is no job picker", async ({
      page,
      request,
      candidate,
    }) => {
      expect(
        (
          await request.delete(`/api/applications/${candidate.applicationId}`)
        ).status(),
      ).toBe(200);
      await page.goto(PAGE);
      await expect(questions(page)).toBeVisible();
      await expect(page.getByLabel("Application", { exact: true })).toHaveCount(
        0,
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
      await expect(questions(page)).toBeVisible();
      expectedFail(
        'src/app/dashboard/application-answers/page.tsx:53: only isLoading and data are read, so a failed profile query falls through to the "No profile yet" notice',
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
      });
    });
  },
);

test.describe(
  "Draft answers: what the page does with replies",
  { tag: "@AA-2" },
  () => {
    test("answers are drafted for a saved job and flagged where needed", async ({
      page,
      ai,
    }) => {
      ai.reply(
        reply([
          { question: WHY, answer: WHY_ANSWER },
          { question: "What is your gender?", answer: "" },
          { question: "What is your notice period?", answer: "" },
        ]),
      );
      await page.goto(PAGE);
      await chooseJob(page);
      await questions(page).fill(
        `  ${WHY}\nWhat is your gender?\nWhat is your notice period?  `,
      );
      const sent = page.waitForRequest((request) =>
        call("POST", GENERATE)(request),
      );
      await draftButton(page).click();
      await expect(toast(page, "Answers drafted")).toBeVisible();
      const body: unknown = (await sent).postDataJSON();
      expect(body).toMatchObject({
        questions: `${WHY}\nWhat is your gender?\nWhat is your notice period?`,
      });
      const region = answers(page);
      await expect(region.getByLabel(WHY, { exact: true })).toHaveValue(
        WHY_ANSWER,
      );
      await expect(
        region.getByLabel("What is your gender?", { exact: true }),
      ).toHaveAccessibleDescription("Answer this yourself");
      await expect(
        region.getByLabel("What is your notice period?", { exact: true }),
      ).toHaveAccessibleDescription("Needs your answer");
      await expect(region).not.toContainText(EMPTY_ANSWERS);
    });

    test("a reply with no answers asks for the form's questions", async ({
      page,
      ai,
    }) => {
      ai.reply(completion(JSON.stringify({ answers: [] })));
      await page.goto(PAGE);
      await questions(page).fill(WHY);
      await draftButton(page).click();
      await expect(
        toast(page, "No questions found. Paste the form's questions."),
      ).toBeVisible();
      await expect(answers(page)).toContainText(EMPTY_ANSWERS);
    });

    test("a reply the page cannot read is reported", async ({ page }) => {
      await page.route(`**${GENERATE}`, (route) =>
        route.fulfill({ json: { foo: 1 } }),
      );
      await page.goto(PAGE);
      await questions(page).fill(WHY);
      await draftButton(page).click();
      await expect(
        toast(page, "Received an invalid server response. Please try again."),
      ).toBeVisible();
      await expect(answers(page)).toContainText(EMPTY_ANSWERS);
    });

    test("an error without a readable message gets the page's fallback", async ({
      page,
    }) => {
      await page.route(`**${GENERATE}`, (route) =>
        route.fulfill({ status: 502, body: "<html>Bad gateway</html>" }),
      );
      await page.goto(PAGE);
      await questions(page).fill(WHY);
      await draftButton(page).click();
      await expect(
        toast(page, "Couldn't draft the answers. Try again."),
      ).toBeVisible();
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
      await questions(page).fill(WHY);
      await draftButton(page).click();
      await expect(toast(page, "Failed to fetch")).toBeVisible();
      expect(aborted).toBe(true);
      expectedFail(
        "src/app/dashboard/application-answers/page.tsx:77: the browser's TypeError message is shown, because the error is always an Error, so the page's fallback never applies",
      );
      await expect(
        toast(page, "Couldn't draft the answers. Try again."),
      ).toBeVisible({ timeout: 2_000 });
    });

    test("Draft and Clear wait while drafting, and one request is sent", async ({
      page,
      ai,
    }) => {
      ai.reply(reply([{ question: WHY, answer: WHY_ANSWER }]));
      const pending = await hold(page, `**${GENERATE}`);
      await page.goto(PAGE);
      await questions(page).fill(WHY);
      await draftButton(page).click();
      await expect(
        page.getByRole("button", { name: "Drafting…", exact: true }),
      ).toBeDisabled();
      await expect(
        page.getByRole("button", { name: "Clear", exact: true }),
      ).toBeDisabled();
      await questions(page).press("Control+Enter");
      expect(pending.requests).toHaveLength(1);
      pending.release();
      await expect(toast(page, "Answers drafted")).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Clear", exact: true }),
      ).toBeEnabled();
    });
  },
);

test.describe("Questions field validation", { tag: "@AA-3" }, () => {
  test("empty, blank or too much text is refused without a request", async ({
    page,
  }) => {
    const sent = recordRequests(page, call("POST", GENERATE));
    await page.goto(PAGE);
    await draftButton(page).click();
    await expect(
      toast(page, "Paste the application's questions."),
    ).toBeVisible();
    await questions(page).fill("a".repeat(6_001));
    await draftButton(page).click();
    await expect(
      toast(page, "That's too much at once. Paste fewer questions."),
    ).toBeVisible();
    await expect(questions(page)).toHaveValue("a".repeat(6_001));
    expect(sent).toHaveLength(0);
  });

  test("blank text is refused like empty text", async ({ page }) => {
    const sent = recordRequests(page, call("POST", GENERATE));
    await page.goto(PAGE);
    await questions(page).fill("   \n  ");
    await draftButton(page).click();
    await expect(
      toast(page, "Paste the application's questions."),
    ).toBeVisible();
    expect(sent).toHaveLength(0);
  });

  test("exactly 6,000 characters after trimming are sent", async ({
    page,
    ai,
  }) => {
    ai.reply(reply([{ question: "q", answer: "a" }]));
    await page.goto(PAGE);
    await questions(page).fill(`  ${"a".repeat(6_000)}  `);
    const sent = responseTo(page, "POST", GENERATE);
    await draftButton(page).click();
    expect((await sent).status()).toBe(200);
  });
});

test.describe("An unreachable model is reported", { tag: "@AA-4" }, () => {
  test("a model that refuses the call fails the draft and keeps the questions", async ({
    page,
    ai,
  }) => {
    // Unscripted, the fake provider rejects the call, as a provider outage would.
    await page.goto(PAGE);
    await chooseJob(page);
    await questions(page).fill(WHY);
    const failed = responseTo(page, "POST", GENERATE);
    await draftButton(page).click();
    const response = await failed;
    expect(response.status()).toBe(500);
    expect(await response.json()).toEqual({ error: FAILED });
    await expect(toast(page, FAILED)).toBeVisible();
    await expect(answers(page)).toContainText(EMPTY_ANSWERS);
    await expect(questions(page)).toHaveValue(WHY);
    await expect(draftButton(page)).toBeEnabled();
    // Retries would spend a per-minute budget shared by every account.
    expect(ai.requests()).toHaveLength(1);
  });
});

test.describe("Only the account's own applications", { tag: "@AA-5" }, () => {
  test("another account's or an unknown application is not found before the model", async ({
    request,
    createCandidate,
    ai,
  }) => {
    const other = await createCandidate();
    for (const applicationId of [other.applicationId, "does-not-exist"]) {
      const response = await request.post(GENERATE, {
        data: { applicationId, questions: "Why us?" },
      });
      expect(response.status()).toBe(404);
      expect(await response.json()).toEqual({ error: "Application not found" });
    }
    expect(ai.requests()).toHaveLength(0);
  });

  test("an application deleted after the page loaded is named in the error", async ({
    page,
    request,
    candidate,
  }) => {
    await page.goto(PAGE);
    await chooseJob(page);
    await questions(page).fill(WHY);
    expect(
      (
        await request.delete(`/api/applications/${candidate.applicationId}`)
      ).status(),
    ).toBe(200);
    await draftButton(page).click();
    await expect(toast(page, "Application not found")).toBeVisible();
  });

  test("another account's id sent from the page is refused", async ({
    page,
    createCandidate,
  }) => {
    const other = await createCandidate();
    await page.route(`**${GENERATE}`, (route) =>
      route.continue({
        postData: JSON.stringify({
          applicationId: other.applicationId,
          questions: "Why us?",
        }),
      }),
    );
    await page.goto(PAGE);
    await questions(page).fill(WHY);
    await draftButton(page).click();
    await expect(toast(page, "Application not found")).toBeVisible();
  });
});

test.describe("Drafting API contract", { tag: "@AA-6" }, () => {
  test("the API requires a session", async ({
    playwright,
    extraHTTPHeaders,
  }) => {
    const anonymous = await anonymousRequest(playwright, extraHTTPHeaders);
    try {
      const response = await anonymous.post(GENERATE, {
        data: { questions: "Why us?" },
      });
      expect(response.status()).toBe(401);
      expect(await response.json()).toEqual({ error: "Unauthorized" });
    } finally {
      await anonymous.dispose();
    }
  });

  test("bodies are validated before the model", async ({ request, ai }) => {
    const malformed = await request.post(GENERATE, MALFORMED_JSON);
    expect(malformed.status()).toBe(400);
    expect(await malformed.json()).toEqual({
      error: "Request body must be valid JSON",
    });
    for (const [data, path, message] of [
      [{}, "questions", undefined],
      [{ questions: "" }, "questions", "Paste the application's questions."],
      [{ questions: "   " }, "questions", "Paste the application's questions."],
      [
        { questions: "a".repeat(6_001) },
        "questions",
        "That's too much at once. Paste fewer questions.",
      ],
      [{ applicationId: "", questions: "q" }, "applicationId", undefined],
      [
        { applicationId: "x".repeat(101), questions: "q" },
        "applicationId",
        undefined,
      ],
      [{ applicationId: 123, questions: "q" }, "applicationId", undefined],
    ] as const) {
      const response = await request.post(GENERATE, { data });
      expect(response.status(), JSON.stringify(data).slice(0, 60)).toBe(400);
      const body = await errorBody(response);
      expect(body.error).toBe("Invalid request data");
      expect(body.details?.map((issue) => issue.path.join("."))).toContain(
        path,
      );
      if (message) expect(body.messages).toContain(message);
    }
    expect(ai.requests()).toHaveLength(0);
  });

  test("ten requests a minute are allowed, then the limit is explained", async ({
    page,
    request,
    ai,
  }) => {
    // Rejected requests still count, because the limit is checked first.
    for (let sent = 0; sent < 10; sent += 1)
      expect(
        (await request.post(GENERATE, { data: { questions: "" } })).status(),
      ).toBe(400);
    const limited = await request.post(GENERATE, { data: { questions: "q" } });
    expect(limited.status()).toBe(429);
    expect(await limited.json()).toEqual({ error: RATE_LIMITED });
    const retryAfter = Number(limited.headers()["retry-after"]);
    expect(retryAfter).toBeGreaterThanOrEqual(1);
    expect(retryAfter).toBeLessThanOrEqual(60);
    await page.goto(PAGE);
    await questions(page).fill(WHY);
    await draftButton(page).click();
    await expect(toast(page, RATE_LIMITED)).toBeVisible();
    expect(ai.requests()).toHaveLength(0);
  });
});

test.describe("Review, edit and copy an answer", { tag: "@AA-7" }, () => {
  test.use({ permissions: ["clipboard-read", "clipboard-write"] });

  test("an edited answer is what gets copied, and typing enables an empty one", async ({
    page,
    ai,
  }) => {
    ai.reply(
      reply([
        { question: WHY, answer: WHY_ANSWER },
        { question: "What is your notice period?", answer: "" },
      ]),
    );
    await page.goto(PAGE);
    await questions(page).fill(`${WHY}\nWhat is your notice period?`);
    await draftButton(page).click();
    const region = answers(page);
    const why = region.getByLabel(WHY, { exact: true });
    await expect(why).toHaveValue(WHY_ANSWER);
    const copies = region.getByRole("button", { name: "Copy answer" });
    await expect(copies.nth(1)).toBeDisabled();
    await why.fill("Edited answer");
    await copies.first().click();
    await expect(toast(page, "Answer copied")).toBeVisible();
    await expect(
      region.getByRole("button", { name: "Copied", exact: true }),
    ).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      "Edited answer",
    );
    await region
      .getByLabel("What is your notice period?", { exact: true })
      .fill("Two weeks");
    await expect(
      region.getByRole("button", { name: "Copy answer" }).last(),
    ).toBeEnabled();
  });

  test("a refused clipboard asks the user to copy by hand", async ({
    page,
    ai,
  }) => {
    await draftWhy(page, ai);
    await page.evaluate(() => {
      Object.defineProperty(navigator.clipboard, "writeText", {
        value: () =>
          Promise.reject(new DOMException("Denied", "NotAllowedError")),
      });
    });
    await answers(page)
      .getByRole("button", { name: "Copy answer", exact: true })
      .click();
    await expect(
      toast(page, "Couldn't copy. Select the text and copy it by hand."),
    ).toBeVisible();
    await expect(
      answers(page).getByRole("button", { name: "Copy answer", exact: true }),
    ).toBeVisible();
  });
});

test.describe("Clear the form", { tag: "@AA-8" }, () => {
  test("Clear empties the questions, the job and the answers without a request", async ({
    page,
    ai,
  }) => {
    ai.reply(reply([{ question: WHY, answer: WHY_ANSWER }]));
    await page.goto(PAGE);
    await chooseJob(page);
    await questions(page).fill(WHY);
    await draftButton(page).click();
    await expect(toast(page, "Answers drafted")).toBeVisible();
    const sent = recordRequests(page, (request) => request.method() !== "GET");
    await page.getByRole("button", { name: "Clear", exact: true }).click();
    await expect(questions(page)).toHaveValue("");
    await expect(page.getByLabel("Application", { exact: true })).toHaveText(
      "No saved job",
    );
    await expect(answers(page)).toContainText(EMPTY_ANSWERS);
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    expect(sent).toHaveLength(0);
  });
});

test.describe(
  "The draft across navigation, reloads and sign-out",
  { tag: "@AA-9" },
  () => {
    test("moving to another dashboard page and back keeps everything", async ({
      page,
      ai,
    }) => {
      ai.reply(reply([{ question: WHY, answer: WHY_ANSWER }]));
      await page.goto(PAGE);
      await chooseJob(page);
      await questions(page).fill(WHY);
      await draftButton(page).click();
      const why = answers(page).getByLabel(WHY, { exact: true });
      await expect(why).toHaveValue(WHY_ANSWER);
      await why.fill("Edited answer");
      const nav = page.getByRole("navigation", { name: "Main" });
      await nav.getByRole("link", { name: "Profile", exact: true }).click();
      await expect(page).toHaveURL(/\/dashboard\/profile$/);
      await nav
        .getByRole("link", { name: "Application questions", exact: true })
        .click();
      await expect(questions(page)).toHaveValue(WHY);
      await expect(page.getByLabel("Application", { exact: true })).toHaveText(
        JOB,
      );
      await expect(why).toHaveValue("Edited answer");
    });

    test("a reload starts over", async ({ page, ai }) => {
      await draftWhy(page, ai);
      await page.reload();
      await expect(questions(page)).toHaveValue("");
      await expect(answers(page)).toContainText(EMPTY_ANSWERS);
    });

    test("signing out and back in starts over", async ({
      page,
      candidate,
      ai,
    }) => {
      await draftWhy(page, ai);
      await page.getByRole("button", { name: "Sign out", exact: true }).click();
      await expect(page).toHaveURL(/\/sign-in$/);
      await page.getByLabel("Email", { exact: true }).fill(candidate.email);
      await page
        .getByLabel("Password", { exact: true })
        .fill(candidate.password);
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      await expect(page).toHaveURL(/\/dashboard$/);
      await page
        .getByRole("navigation", { name: "Main" })
        .getByRole("link", { name: "Application questions", exact: true })
        .click();
      await expect(questions(page)).toHaveValue("");
      await expect(answers(page)).toContainText(EMPTY_ANSWERS);
    });

    test("a draft that finishes after leaving the page is still there on return", async ({
      page,
      ai,
    }) => {
      ai.reply(reply([{ question: WHY, answer: WHY_ANSWER }]));
      const pending = await hold(page, `**${GENERATE}`);
      await page.goto(PAGE);
      await questions(page).fill(WHY);
      await draftButton(page).click();
      await expect.poll(() => pending.requests.length).toBe(1);
      const nav = page.getByRole("navigation", { name: "Main" });
      await nav.getByRole("link", { name: "Profile", exact: true }).click();
      await expect(page).toHaveURL(/\/dashboard\/profile$/);
      const finished = responseTo(page, "POST", GENERATE);
      pending.release();
      expect((await finished).status()).toBe(200);
      await nav
        .getByRole("link", { name: "Application questions", exact: true })
        .click();
      await expect(questions(page)).toHaveValue(WHY);
      expectedFail(
        "src/app/dashboard/application-answers/page.tsx:69: the answers are stored in mutate()'s onSuccess, which TanStack Query skips once the page has unmounted",
      );
      await expect(answers(page).getByLabel(WHY, { exact: true })).toHaveValue(
        WHY_ANSWER,
        { timeout: 2_000 },
      );
    });

    test("a session revoked before drafting is refused", async ({
      page,
      database,
      candidate,
    }) => {
      await page.goto(PAGE);
      await questions(page).fill(WHY);
      await revokeSessions(database, candidate.id);
      const refused = responseTo(page, "POST", GENERATE);
      await draftButton(page).click();
      expect((await refused).status()).toBe(401);
      await expect(toast(page, "Unauthorized")).toBeVisible();
    });
  },
);

test.describe("Real drafting through the model", { tag: "@AA-10" }, () => {
  test("the model's answers are flagged by the policy, and the prompt holds only the job's own text", async ({
    page,
    request,
    candidate,
    ai,
  }) => {
    expect(
      (
        await request.put(`/api/applications/${candidate.applicationId}`, {
          data: {
            notes: "Recruiter call booked.",
            contactName: "Robin Ng",
            contactEmail: "robin@example.test",
            salaryRange: "SGD 9k",
          },
        })
      ).status(),
    ).toBe(200);
    ai.reply(
      reply([
        { question: WHY, answer: WHY_ANSWER },
        { question: "What is your gender?", answer: "" },
        { question: "I agree to the privacy policy", answer: "" },
        { question: "What is your notice period?", answer: "" },
        { question: "What are your salary expectations?", answer: "SGD 8,000" },
        {
          question: "Are you legally authorized to work in Singapore?",
          answer: "",
          reason: "Not in your profile",
        },
      ]),
    );
    await page.goto(PAGE);
    await chooseJob(page);
    await questions(page).fill(
      [
        WHY,
        "What is your gender?",
        "I agree to the privacy policy",
        "What is your notice period?",
        "What are your salary expectations?",
        "Are you legally authorized to work in Singapore?",
      ].join("\n"),
    );
    await draftButton(page).click();
    await expect(toast(page, "Answers drafted")).toBeVisible();
    const region = answers(page);
    for (const [question, flag] of [
      ["What is your gender?", "Answer this yourself"],
      ["I agree to the privacy policy", "Read and confirm this yourself"],
      ["What is your notice period?", "Needs your answer"],
      ["What are your salary expectations?", "Answer this yourself"],
      [
        "Are you legally authorized to work in Singapore?",
        "Not in your profile",
      ],
    ] as const)
      await expect(
        region.getByLabel(question, { exact: true }),
      ).toHaveAccessibleDescription(flag);
    await expect(
      region.getByLabel("What are your salary expectations?", {
        exact: true,
      }),
    ).toHaveValue("SGD 8,000");
    await expect(
      region.getByLabel(WHY, { exact: true }),
    ).not.toHaveAccessibleDescription(/./);

    const [sent] = ai.requests();
    if (!sent) throw new Error("The draft calls the model once.");
    const prompt = userPrompt(sent);
    expect(prompt).toContain("Company: Example Industries");
    expect(prompt).toContain("Position: Software Engineer");
    expect(prompt).toContain(
      "Build reliable web applications using TypeScript.",
    );
    for (const kept of [
      "Recruiter call booked.",
      "Robin Ng",
      "robin@example.test",
      "SGD 9k",
    ])
      expect(prompt).not.toContain(kept);
    const instructions = sent.messages.find(
      (message) => message.role === "system",
    )?.content;
    expect(instructions).toContain('"firstName":"Alex"');
  });

  test("without a saved job the prompt says so", async ({ page, ai }) => {
    await draftWhy(page, ai);
    const [sent] = ai.requests();
    expect(sent ? userPrompt(sent) : undefined).toContain("No saved job.");
  });

  for (const [status, httpStatus, message] of [
    [
      429,
      429,
      "The model's usage limit was reached. Wait a minute, then try again.",
    ],
    [413, 413, TOO_LARGE],
    [503, 500, FAILED],
    [400, 500, FAILED],
  ] as const)
    test(`a provider ${status} becomes a ${httpStatus} with its message`, async ({
      page,
      ai,
    }) => {
      ai.reply(providerError(status));
      await page.goto(PAGE);
      await questions(page).fill(WHY);
      const failed = responseTo(page, "POST", GENERATE);
      await draftButton(page).click();
      const response = await failed;
      expect(response.status()).toBe(httpStatus);
      await expect(toast(page, message)).toBeVisible();
      expect(ai.requests()).toHaveLength(1);
    });

  test("a provider 402 says the account is out of credits", async ({
    page,
    ai,
  }) => {
    ai.reply(providerError(402));
    await page.goto(PAGE);
    await questions(page).fill(WHY);
    const failed = responseTo(page, "POST", GENERATE);
    await draftButton(page).click();
    expect((await failed).status()).toBe(402);
    // Which provider the copy names is left open: it says OpenRouter even
    // when drafts go to Groq.
    await expect(
      page.getByText(/out of credits\. Add credits, then try again\.$/),
    ).toBeVisible();
  });

  for (const [name, content, finishReason] of [
    ["a reply cut at the token cap", '{"answers":[{"question":"Why', "length"],
    ["an empty reply cut at the token cap", '{"answers":[]}', "length"],
  ] as const)
    test(`${name} is reported as too large`, async ({ page, ai }) => {
      ai.reply(completion(content, finishReason));
      await page.goto(PAGE);
      await questions(page).fill(WHY);
      const failed = responseTo(page, "POST", GENERATE);
      await draftButton(page).click();
      expect((await failed).status()).toBe(413);
      await expect(toast(page, TOO_LARGE)).toBeVisible();
    });

  for (const [name, content] of [
    ["a reply that is not JSON", "Sure! Here are your answers"],
    ["a reply that does not fit the schema", '{"answers":[{"question":"q"}]}'],
  ] as const)
    test(`${name} fails the draft`, async ({ page, ai }) => {
      ai.reply(completion(content));
      await page.goto(PAGE);
      await questions(page).fill(WHY);
      const failed = responseTo(page, "POST", GENERATE);
      await draftButton(page).click();
      expect((await failed).status()).toBe(500);
      await expect(toast(page, FAILED)).toBeVisible();
    });

  test("a stored application without a description is sent as not provided", async ({
    page,
    database,
    candidate,
    ai,
  }) => {
    await database
      .update(jobApplications)
      .set({ jobDescription: null })
      .where(eq(jobApplications.id, candidate.applicationId));
    ai.reply(reply([{ question: WHY, answer: WHY_ANSWER }]));
    await page.goto(PAGE);
    await chooseJob(page);
    await questions(page).fill(WHY);
    await draftButton(page).click();
    await expect(toast(page, "Answers drafted")).toBeVisible();
    const [sent] = ai.requests();
    expect(sent ? userPrompt(sent) : undefined).toContain("Not provided");
  });
});
