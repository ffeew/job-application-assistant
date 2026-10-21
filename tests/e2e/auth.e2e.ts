import { randomUUID } from "node:crypto";
import type { Locator, Page, Request, Response } from "@playwright/test";
import { eq, inArray } from "drizzle-orm";
import { account, session, user } from "../../src/lib/db/schema";
import { test, expect, type Database } from "./support/fixtures";
import { expectedFail, hold, recordRequests } from "./support/helpers";
import { BASE_URL } from "./support/runtime";

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

const SIGN_UP = "/api/auth/sign-up/email";
const SIGN_IN = "/api/auth/sign-in/email";
const TOO_MANY = "Too many attempts. Wait a minute, then try again.";
const UNREACHABLE =
  "Couldn't reach the server. Check your connection and try again.";
const SIGN_UP_FAILED = "Couldn't create the account. Try again in a moment.";
const ALREADY_REGISTERED =
  "Couldn't create the account. That email may already be registered.";
const INCORRECT = "Email or password is incorrect.";
const SIGN_IN_FAILED = "Couldn't sign you in. Try again in a moment.";
const SIGN_OUT_FAILED =
  "Couldn't sign you out on the server, so this browser may still be signed in. Open the dashboard and sign out again.";
const PASSWORD = "E2E-signup-password-1234";

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

function uniqueEmail() {
  return `signup-${randomUUID()}@example.test`;
}

async function fillSignUp(
  page: Page,
  {
    name = "New Example Candidate",
    email,
    password = PASSWORD,
    confirm = password,
  }: { name?: string; email: string; password?: string; confirm?: string },
) {
  await page.getByLabel("Full name", { exact: true }).fill(name);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password", { exact: true }).fill(confirm);
}

function createAccount(page: Page) {
  return page.getByRole("button", { name: "Create account", exact: true });
}

async function fillSignIn(page: Page, email: string, password: string) {
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
}

function signIn(page: Page) {
  return page.getByRole("button", { name: "Sign in", exact: true });
}

async function sessionCount(database: Database, userId: string) {
  const rows = await database
    .select({ id: session.id })
    .from(session)
    .where(eq(session.userId, userId));
  return rows.length;
}

async function deleteUsers(database: Database, ...emails: string[]) {
  await database.delete(user).where(inArray(user.email, emails));
}

test.describe("Create an account", { tag: "@sign-up" }, () => {
  test("creates the account with the email in lower case and opens an empty dashboard", async ({
    page,
    database,
  }) => {
    const typed = `Signup-${randomUUID()}@Example.test`;
    const stored = typed.toLowerCase();
    try {
      await page.goto("/sign-up");
      // The shortest password the server accepts.
      await fillSignUp(page, {
        name: "Casey Example",
        email: typed,
        password: "Exactly8",
      });
      await createAccount(page).click();
      await expect(page).toHaveURL(/\/dashboard$/);
      await expect(
        page.getByRole("heading", { name: "Dashboard", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "No applications yet", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText(
          "Nothing yet. Changes to your applications, resumes and cover letters show up here.",
          { exact: true },
        ),
      ).toBeVisible();
      const header = page.getByRole("banner");
      await expect(
        header.getByText("Casey Example", { exact: true }),
      ).toBeVisible();
      await expect(header.getByText(stored, { exact: true })).toBeVisible();

      expect(
        await database
          .select({ name: user.name })
          .from(user)
          .where(eq(user.email, stored)),
      ).toEqual([{ name: "Casey Example" }]);
      expect(
        await database
          .select({ providerId: account.providerId })
          .from(account)
          .innerJoin(user, eq(account.userId, user.id))
          .where(eq(user.email, stored)),
      ).toEqual([{ providerId: "credential" }]);
      expect(
        await database
          .select({ id: session.id })
          .from(session)
          .innerJoin(user, eq(session.userId, user.id))
          .where(eq(user.email, stored)),
      ).toHaveLength(1);
    } finally {
      await deleteUsers(database, stored, typed);
    }
  });

  test("empty required fields are stopped by the browser", async ({ page }) => {
    const posts = recordRequests(page, isPost(SIGN_UP));
    await page.goto("/sign-up");
    await createAccount(page).click();
    expect(
      await validity(page.getByLabel("Full name", { exact: true })),
    ).toMatchObject({ valueMissing: true });
    await page.getByLabel("Full name", { exact: true }).fill("Casey Example");
    await page.getByLabel("Email", { exact: true }).fill(uniqueEmail());
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await createAccount(page).click();
    expect(
      await validity(page.getByLabel("Confirm password", { exact: true })),
    ).toMatchObject({ valueMissing: true });
    await expect(page).toHaveURL(/\/sign-up$/);
    expect(posts).toHaveLength(0);
  });

  test("an address the browser rejects is not sent", async ({ page }) => {
    const posts = recordRequests(page, isPost(SIGN_UP));
    await page.goto("/sign-up");
    await fillSignUp(page, { email: "not-an-email" });
    await createAccount(page).click();
    expect(
      await validity(page.getByLabel("Email", { exact: true })),
    ).toMatchObject({ typeMismatch: true });
    await expect(page).toHaveURL(/\/sign-up$/);
    expect(posts).toHaveLength(0);
  });

  test("an address without a dotted domain is refused by the server", async ({
    page,
    database,
  }) => {
    const email = `e2e-${randomUUID()}@localhost`;
    try {
      await page.goto("/sign-up");
      await fillSignUp(page, { email });
      const refused = responseTo(page, SIGN_UP);
      await createAccount(page).click();
      expect((await refused).status()).toBe(400);
      await expect(
        page.getByText(SIGN_UP_FAILED, { exact: true }),
      ).toBeVisible();
      expect(
        await database.select().from(user).where(eq(user.email, email)),
      ).toEqual([]);
    } finally {
      await deleteUsers(database, email);
    }
  });

  test("different passwords are caught before sending", async ({ page }) => {
    const posts = recordRequests(page, isPost(SIGN_UP));
    await page.goto("/sign-up");
    await fillSignUp(page, {
      email: uniqueEmail(),
      password: "Abcdefgh1",
      confirm: "Abcdefgh2",
    });
    await createAccount(page).click();
    await expect(
      page.getByText("The two passwords don't match.", { exact: true }),
    ).toBeVisible();
    await expect(createAccount(page)).toBeEnabled();
    expect(posts).toHaveLength(0);
  });

  test("a short password is caught before sending, after a mismatch", async ({
    page,
  }) => {
    const posts = recordRequests(page, isPost(SIGN_UP));
    await page.goto("/sign-up");
    await fillSignUp(page, {
      email: uniqueEmail(),
      password: "short7c",
      confirm: "short7d",
    });
    await createAccount(page).click();
    await expect(
      page.getByText("The two passwords don't match.", { exact: true }),
    ).toBeVisible();
    await page.getByLabel("Confirm password", { exact: true }).fill("short7c");
    await createAccount(page).click();
    await expect(
      page.getByText("Use at least 8 characters for the password.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByText("The two passwords don't match.", { exact: true }),
    ).toHaveCount(0);
    expect(posts).toHaveLength(0);
  });

  test("a password over 128 characters is refused by the server", async ({
    page,
    database,
  }) => {
    const email = uniqueEmail();
    try {
      await page.goto("/sign-up");
      await fillSignUp(page, { email, password: "a".repeat(129) });
      const refused = responseTo(page, SIGN_UP);
      await createAccount(page).click();
      expect((await refused).status()).toBe(400);
      await expect(
        page.getByText(SIGN_UP_FAILED, { exact: true }),
      ).toBeVisible();
      expect(
        await database.select().from(user).where(eq(user.email, email)),
      ).toEqual([]);
    } finally {
      await deleteUsers(database, email);
    }
  });

  test("an email that is already registered is refused", async ({
    page,
    candidate,
  }) => {
    await page.goto("/sign-up");
    await fillSignUp(page, { email: candidate.email });
    const refused = responseTo(page, SIGN_UP);
    await createAccount(page).click();
    expect((await refused).status()).toBe(422);
    await expect(
      page.getByText(ALREADY_REGISTERED, { exact: true }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/sign-up$/);
  });

  test("the same email in different case is refused too", async ({
    page,
    candidate,
  }) => {
    await page.goto("/sign-up");
    await fillSignUp(page, { email: candidate.email.toUpperCase() });
    const refused = responseTo(page, SIGN_UP);
    await createAccount(page).click();
    expect((await refused).status()).toBe(422);
    await expect(
      page.getByText(ALREADY_REGISTERED, { exact: true }),
    ).toBeVisible();
  });

  test("the limit of three attempts in ten seconds stops a burst", async ({
    page,
    request,
    candidate,
  }) => {
    // The candidate fixture's own sign-up used the first of the three.
    for (let sent = 0; sent < 2; sent += 1)
      expect(
        (
          await request.post(SIGN_UP, {
            headers: { Origin: BASE_URL },
            data: { name: "Burst", email: candidate.email, password: PASSWORD },
          })
        ).status(),
      ).toBe(422);
    await page.goto("/sign-up");
    await fillSignUp(page, { email: candidate.email });
    const limited = responseTo(page, SIGN_UP);
    await createAccount(page).click();
    expect((await limited).status()).toBe(429);
    await expect(page.getByText(TOO_MANY, { exact: true })).toBeVisible();
  });

  test("a server error is reported and the form can be sent again", async ({
    page,
  }) => {
    await page.route(`**${SIGN_UP}`, (route) =>
      route.fulfill({ status: 500, json: {} }),
    );
    await page.goto("/sign-up");
    await fillSignUp(page, { email: uniqueEmail() });
    await createAccount(page).click();
    await expect(page.getByText(SIGN_UP_FAILED, { exact: true })).toBeVisible();
    await expect(createAccount(page)).toBeEnabled();
    await expect(page).toHaveURL(/\/sign-up$/);
  });

  test("a dropped connection is reported", async ({ page }) => {
    let aborted = false;
    await page.route(`**${SIGN_UP}`, (route) => {
      aborted = true;
      return route.abort("internetdisconnected");
    });
    await page.goto("/sign-up");
    await fillSignUp(page, { email: uniqueEmail() });
    await createAccount(page).click();
    await expect(page.getByText(UNREACHABLE, { exact: true })).toBeVisible();
    await expect(createAccount(page)).toBeEnabled();
    expect(aborted).toBe(true);
  });

  test("Create account is disabled while sending and sends one request", async ({
    page,
    candidate,
  }) => {
    const pending = await hold(page, `**${SIGN_UP}`);
    await page.goto("/sign-up");
    // A registered address keeps the request from creating an account.
    await fillSignUp(page, { email: candidate.email });
    await createAccount(page).click();
    await expect(
      page.getByRole("button", { name: "Creating account…", exact: true }),
    ).toBeDisabled();
    await page.getByLabel("Confirm password", { exact: true }).press("Enter");
    expect(pending.requests).toHaveLength(1);
    pending.release();
    await expect(
      page.getByText(ALREADY_REGISTERED, { exact: true }),
    ).toBeVisible();
    await expect(createAccount(page)).toBeEnabled();
    expect(pending.requests).toHaveLength(1);
  });

  test("a name of only spaces is refused", async ({ page, database }) => {
    const email = uniqueEmail();
    try {
      await page.goto("/sign-up");
      await fillSignUp(page, { name: "   ", email });
      const sent = responseTo(page, SIGN_UP);
      await createAccount(page).click();
      expect((await sent).status()).toBe(200);
      expectedFail(
        'src/app/(auth)/sign-up/sign-up-form.tsx:47: the name is sent untrimmed and Better Auth accepts it, so the account is created with the name "   "',
      );
      expect(
        await database.select().from(user).where(eq(user.email, email)),
      ).toEqual([]);
    } finally {
      await deleteUsers(database, email);
    }
  });
});

test.describe(
  "Registration closed (DISABLE_SIGNUP=true)",
  { tag: "@sign-up-disabled" },
  () => {
    test("a server that refuses new accounts is explained on the form", async ({
      page,
    }) => {
      // The shared server has sign-up enabled, so only the client branch is
      // reachable; this is the refusal Better Auth sends when it is disabled.
      let refusals = 0;
      await page.route(`**${SIGN_UP}`, (route) => {
        refusals += 1;
        return route.fulfill({
          status: 400,
          json: {
            code: "EMAIL_PASSWORD_SIGN_UP_DISABLED",
            message: "Email and password sign up is not enabled",
          },
        });
      });
      await page.goto("/sign-up");
      await fillSignUp(page, { email: uniqueEmail() });
      await createAccount(page).click();
      await expect(
        page.getByText("New accounts are turned off on this server.", {
          exact: true,
        }),
      ).toBeVisible();
      await expect(page).toHaveURL(/\/sign-up$/);
      expect(refusals).toBe(1);
    });
  },
);

test.describe("Sign in", { tag: "@sign-in" }, () => {
  test("signs in and the dashboard shows who is signed in", async ({
    page,
    candidate,
    database,
  }) => {
    await page.goto("/sign-in");
    await fillSignIn(page, candidate.email, candidate.password);
    await signIn(page).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole("heading", { name: "Dashboard", exact: true }),
    ).toBeVisible();
    const header = page.getByRole("banner");
    await expect(
      header.getByText("Alex Example", { exact: true }),
    ).toBeVisible();
    await expect(
      header.getByText(candidate.email, { exact: true }),
    ).toBeVisible();
    // The fixture's sign-up session and this one.
    expect(await sessionCount(database, candidate.id)).toBe(2);
  });

  test("the email is matched without regard to case", async ({
    page,
    candidate,
  }) => {
    await page.goto("/sign-in");
    await fillSignIn(page, candidate.email.toUpperCase(), candidate.password);
    await signIn(page).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole("banner").getByText(candidate.email, { exact: true }),
    ).toBeVisible();
  });

  test("empty fields are stopped by the browser", async ({ page }) => {
    const posts = recordRequests(page, isPost(SIGN_IN));
    await page.goto("/sign-in");
    await signIn(page).click();
    expect(
      await validity(page.getByLabel("Email", { exact: true })),
    ).toMatchObject({ valueMissing: true });
    await expect(page).toHaveURL(/\/sign-in$/);
    expect(posts).toHaveLength(0);
  });

  test("an unknown email gets the same answer as a wrong password", async ({
    page,
  }) => {
    await page.goto("/sign-in");
    await fillSignIn(page, `nobody-${randomUUID()}@example.test`, PASSWORD);
    const refused = responseTo(page, SIGN_IN);
    await signIn(page).click();
    expect((await refused).status()).toBe(401);
    await expect(page.getByText(INCORRECT, { exact: true })).toBeVisible();
    await expect(page).toHaveURL(/\/sign-in$/);
  });

  test("an address without a dotted domain is refused by the server", async ({
    page,
  }) => {
    await page.goto("/sign-in");
    await fillSignIn(page, "user@localhost", PASSWORD);
    const refused = responseTo(page, SIGN_IN);
    await signIn(page).click();
    expect((await refused).status()).toBe(400);
    await expect(page.getByText(SIGN_IN_FAILED, { exact: true })).toBeVisible();
  });

  test("a password over 128 characters is refused by the server", async ({
    page,
    candidate,
  }) => {
    await page.goto("/sign-in");
    await fillSignIn(page, candidate.email, "a".repeat(129));
    const refused = responseTo(page, SIGN_IN);
    await signIn(page).click();
    expect((await refused).status()).toBe(400);
    await expect(page.getByText(SIGN_IN_FAILED, { exact: true })).toBeVisible();
  });

  test("after three attempts in ten seconds even the right password is refused", async ({
    page,
    request,
    candidate,
    database,
  }) => {
    for (let sent = 0; sent < 3; sent += 1)
      expect(
        (
          await request.post(SIGN_IN, {
            headers: { Origin: BASE_URL },
            data: {
              email: candidate.email,
              password: "Incorrect-password-1234",
            },
          })
        ).status(),
      ).toBe(401);
    await page.goto("/sign-in");
    await fillSignIn(page, candidate.email, candidate.password);
    const limited = responseTo(page, SIGN_IN);
    await signIn(page).click();
    expect((await limited).status()).toBe(429);
    await expect(page.getByText(TOO_MANY, { exact: true })).toBeVisible();
    await expect(page).toHaveURL(/\/sign-in$/);
    expect(await sessionCount(database, candidate.id)).toBe(1);
  });

  test("a server error is reported and the form can be sent again", async ({
    page,
    candidate,
  }) => {
    await page.route(`**${SIGN_IN}`, (route) =>
      route.fulfill({ status: 500, json: {} }),
    );
    await page.goto("/sign-in");
    await fillSignIn(page, candidate.email, candidate.password);
    await signIn(page).click();
    await expect(page.getByText(SIGN_IN_FAILED, { exact: true })).toBeVisible();
    await expect(signIn(page)).toBeEnabled();
    await expect(page).toHaveURL(/\/sign-in$/);
  });

  test("a dropped connection is reported", async ({ page, candidate }) => {
    let aborted = false;
    await page.route(`**${SIGN_IN}`, (route) => {
      aborted = true;
      return route.abort("internetdisconnected");
    });
    await page.goto("/sign-in");
    await fillSignIn(page, candidate.email, candidate.password);
    await signIn(page).click();
    await expect(page.getByText(UNREACHABLE, { exact: true })).toBeVisible();
    await expect(signIn(page)).toBeEnabled();
    expect(aborted).toBe(true);
  });

  test("Sign in is disabled while sending and sends one request", async ({
    page,
    candidate,
  }) => {
    const pending = await hold(page, `**${SIGN_IN}`);
    await page.goto("/sign-in");
    await fillSignIn(page, candidate.email, candidate.password);
    await signIn(page).click();
    await expect(
      page.getByRole("button", { name: "Signing in…", exact: true }),
    ).toBeDisabled();
    await page.getByLabel("Password", { exact: true }).press("Enter");
    expect(pending.requests).toHaveLength(1);
    pending.release();
    await expect(page).toHaveURL(/\/dashboard$/);
    expect(pending.requests).toHaveLength(1);
  });

  test("an earlier error is cleared when the form is sent again", async ({
    page,
    candidate,
  }) => {
    await page.goto("/sign-in");
    await fillSignIn(page, candidate.email, "Incorrect-password-1234");
    await signIn(page).click();
    await expect(page.getByText(INCORRECT, { exact: true })).toBeVisible();
    const pending = await hold(page, `**${SIGN_IN}`);
    await page.getByLabel("Password", { exact: true }).fill(candidate.password);
    await signIn(page).click();
    await expect(
      page.getByRole("button", { name: "Signing in…", exact: true }),
    ).toBeDisabled();
    await expect(page.getByText(INCORRECT, { exact: true })).toHaveCount(0);
    pending.release();
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});

test.describe(
  "Sign out (desktop header and mobile sheet)",
  { tag: "@sign-out" },
  () => {
    test.use({ authenticated: true });

    async function openDashboard(page: Page) {
      await page.goto("/dashboard");
      await expect(
        page.getByRole("heading", { name: "Dashboard", exact: true }),
      ).toBeVisible();
    }

    function signOut(page: Page) {
      return page.getByRole("button", { name: "Sign out", exact: true });
    }

    async function expectOnSignIn(page: Page) {
      await expect(page).toHaveURL(/\/sign-in$/);
      await expect(
        page.getByRole("heading", { name: "Sign in", exact: true }),
      ).toBeVisible();
    }

    test("signing out ends the session on the server, not only in the browser", async ({
      page,
      request,
      database,
      candidate,
    }) => {
      await openDashboard(page);
      expect(await sessionCount(database, candidate.id)).toBe(1);
      await signOut(page).click();
      await expectOnSignIn(page);
      await expect(
        page.getByText(SIGN_OUT_FAILED, { exact: true }),
      ).toHaveCount(0);
      await expect.poll(() => sessionCount(database, candidate.id)).toBe(0);
      // The request fixture holds the same session token the browser had.
      expect((await request.get("/api/applications")).status()).toBe(401);
      await page.goto("/dashboard");
      await expect(page).toHaveURL(/\/sign-in$/);
    });

    test("a failed sign-out still leaves the dashboard and warns that this browser may be signed in", async ({
      page,
      request,
      database,
      candidate,
    }) => {
      let attempts = 0;
      await page.route("**/api/auth/sign-out", (route) => {
        attempts += 1;
        return route.fulfill({ status: 500, json: {} });
      });
      await openDashboard(page);
      await signOut(page).click();
      await expectOnSignIn(page);
      await expect(
        page.getByText(SIGN_OUT_FAILED, { exact: true }),
      ).toBeVisible();
      expect(attempts).toBe(1);
      // What the warning says is true: the server still knows the session.
      expect(await sessionCount(database, candidate.id)).toBe(1);
      expect((await request.get("/api/applications")).status()).toBe(200);
    });

    test("a sign-out that never reaches the server warns, and signing out again works", async ({
      page,
      database,
      candidate,
    }) => {
      let attempts = 0;
      await page.route("**/api/auth/sign-out", (route) => {
        attempts += 1;
        return route.abort("internetdisconnected");
      });
      await openDashboard(page);
      await signOut(page).click();
      await expectOnSignIn(page);
      await expect(
        page.getByText(SIGN_OUT_FAILED, { exact: true }),
      ).toBeVisible();
      expect(attempts).toBe(1);

      await page.unroute("**/api/auth/sign-out");
      await openDashboard(page);
      await signOut(page).click();
      await expectOnSignIn(page);
      await expect.poll(() => sessionCount(database, candidate.id)).toBe(0);
    });

    test("a double click while signing out shows no false warning", async ({
      page,
      database,
      candidate,
    }) => {
      const pending = await hold(page, "**/api/auth/sign-out");
      await openDashboard(page);
      await signOut(page).dblclick();
      // Nothing disables the button, so both clicks send a request.
      await expect.poll(() => pending.requests.length).toBe(2);
      pending.release();
      await Promise.all(pending.requests.map((request) => request.response()));
      await expectOnSignIn(page);
      await expect.poll(() => sessionCount(database, candidate.id)).toBe(0);
      await expect(
        page.getByText(SIGN_OUT_FAILED, { exact: true }),
      ).toHaveCount(0);
    });

    test("Back after signing out returns to sign in without the account's data", async ({
      page,
    }) => {
      await openDashboard(page);
      await signOut(page).click();
      await expectOnSignIn(page);
      const data: Response[] = [];
      page.on("response", (response) => {
        const { pathname } = new URL(response.url());
        if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth/"))
          data.push(response);
      });
      await page.goBack();
      await expectOnSignIn(page);
      expect(data.filter((response) => response.ok())).toEqual([]);
    });

    test.describe("on a phone", () => {
      test.use({ viewport: { width: 390, height: 844 } });

      test("signing out from the navigation sheet ends the session", async ({
        page,
        database,
        candidate,
      }) => {
        await openDashboard(page);
        await page
          .getByRole("button", { name: "Open navigation", exact: true })
          .click();
        const sheet = page.getByRole("dialog", {
          name: "Navigation",
          exact: true,
        });
        await expect(
          sheet.getByText(candidate.email, { exact: true }),
        ).toBeVisible();
        await sheet
          .getByRole("button", { name: "Sign out", exact: true })
          .click();
        await expectOnSignIn(page);
        await expect.poll(() => sessionCount(database, candidate.id)).toBe(0);
      });
    });
  },
);
