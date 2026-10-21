import type { Locator, Page } from "@playwright/test";
import { eq } from "drizzle-orm";
import { userProfiles } from "../../src/lib/db/schema";
import { userProfileJsonResponseSchema } from "../../src/app/api/profile/validators";
import { test, expect, type Database } from "./support/fixtures";
import { userPrompt } from "./support/fake-ai";
import {
  anonymousRequest,
  call,
  errorBody,
  expectedFail,
  hold,
  importReply,
  isValid,
  MALFORMED_JSON,
  recordRequests,
  responseTo,
  revokeSessions,
} from "./support/helpers";

const SAVE_FAILED = "Couldn't save your profile. Try again.";
const IMPORTED = "Resume imported. Review each section before saving.";
const RATE_LIMITED =
  "You're sending requests too quickly. Wait a minute, then try again.";
const TOO_LONG = "Keep this under 300 characters";

const EMPTY_PROFILE = {
  firstName: null,
  lastName: null,
  email: null,
  phone: null,
  address: null,
  city: null,
  state: null,
  zipCode: null,
  country: null,
  linkedinUrl: null,
  githubUrl: null,
  portfolioUrl: null,
  professionalSummary: null,
};

async function storedProfiles(database: Database, userId: string) {
  return database
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId));
}

/** Opens the profile page for an account that has no personal details yet. */
async function openWithoutProfile(
  page: Page,
  database: Database,
  userId: string,
) {
  await database.delete(userProfiles).where(eq(userProfiles.userId, userId));
  await page.goto("/dashboard/profile");
  await expect(
    page
      .getByRole("main")
      .getByRole("heading", { name: "No details yet", level: 2 }),
  ).toBeVisible();
}

function addDetails(page: Page) {
  return page
    .getByRole("main")
    .getByRole("button", { name: "Add your details", exact: true });
}

async function chooseImportFile(
  page: Page,
  file: { name: string; mimeType: string; buffer: Buffer },
) {
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("main")
    .getByRole("button", { name: "Import a resume", exact: true })
    .click();
  await (await chooser).setFiles(file);
}

const PNG = {
  name: "image.png",
  mimeType: "image/png",
  buffer: Buffer.from("not really a picture"),
};

test.describe(
  "Create personal information without a profile",
  { tag: "@personal-create" },
  () => {
    test("typed details are saved and shown on the card", async ({
      page,
      database,
      candidate,
    }) => {
      await openWithoutProfile(page, database, candidate.id);
      const main = page.getByRole("main");
      await expect(
        main.getByText(
          "Type your details in, or import an existing resume (PDF, Word or text, up to 8 MB) and review what it finds.",
          { exact: true },
        ),
      ).toBeVisible();
      await expect(
        main.getByRole("button", { name: "Edit", exact: true }),
      ).toHaveCount(0);

      await addDetails(page).click();
      const form = page.getByRole("dialog", { name: "Add your details" });
      await expect(form).toContainText(
        "Your name and contact details head every resume.",
      );
      await expect(form.getByLabel("First name", { exact: true })).toHaveValue(
        "",
      );
      await expect(form.getByLabel("Email", { exact: true })).toHaveValue("");
      await form.getByLabel("First name", { exact: true }).fill("Taylor");
      await form.getByLabel("Last name", { exact: true }).fill("Example");
      await form
        .getByLabel("Email", { exact: true })
        .fill("taylor@example.test");
      await form.getByLabel("City", { exact: true }).fill("Singapore");
      await form.getByLabel("Country", { exact: true }).fill("Singapore");
      await form
        .getByLabel("LinkedIn URL", { exact: true })
        .fill("https://linkedin.com/in/taylor");
      await form
        .getByLabel("Professional summary", { exact: true })
        .fill("Data engineer who ships reliable pipelines.");
      const created = responseTo(page, "POST", "/api/profile");
      await form
        .getByRole("button", { name: "Save profile", exact: true })
        .click();
      expect((await created).status()).toBe(201);

      await expect(
        page.getByText("Profile saved", { exact: true }),
      ).toBeVisible();
      await expect(form).toBeHidden();
      await expect(
        main.getByRole("heading", { name: "Taylor Example", level: 3 }),
      ).toBeVisible();
      await expect(
        main.getByText("taylor@example.test", { exact: true }),
      ).toBeVisible();
      await expect(
        main.getByText("Singapore, Singapore", { exact: true }),
      ).toBeVisible();
      const linkedin = main.getByRole("link", {
        name: "https://linkedin.com/in/taylor",
        exact: true,
      });
      await expect(linkedin).toHaveAttribute(
        "href",
        "https://linkedin.com/in/taylor",
      );
      await expect(linkedin).toHaveAttribute("target", "_blank");
      await expect(
        main.getByRole("button", { name: "Edit", exact: true }),
      ).toBeVisible();

      const rows = await storedProfiles(database, candidate.id);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        firstName: "Taylor",
        lastName: "Example",
        email: "taylor@example.test",
        city: "Singapore",
        country: "Singapore",
        linkedinUrl: "https://linkedin.com/in/taylor",
        professionalSummary: "Data engineer who ships reliable pipelines.",
        phone: null,
        address: null,
        githubUrl: null,
      });
      await page.reload();
      await expect(
        main.getByRole("heading", { name: "Taylor Example", level: 3 }),
      ).toBeVisible();
    });

    test("saving with every field blank creates an empty profile", async ({
      page,
      database,
      candidate,
    }) => {
      await openWithoutProfile(page, database, candidate.id);
      await addDetails(page).click();
      const form = page.getByRole("dialog", { name: "Add your details" });
      await form
        .getByRole("button", { name: "Save profile", exact: true })
        .click();
      await expect(
        page.getByText("Profile saved", { exact: true }),
      ).toBeVisible();
      await expect(form).toBeHidden();
      await expect(
        page
          .getByRole("main")
          .getByRole("heading", { name: "No name yet", level: 3 }),
      ).toBeVisible();
      const rows = await storedProfiles(database, candidate.id);
      expect(rows).toHaveLength(1);
      // The sheet focuses First name on open, and React Hook Form stores a
      // field's DOM value ("") when it loses focus; both mean no name.
      const [stored] = rows;
      expect({ ...stored, firstName: stored?.firstName || null }).toMatchObject(
        EMPTY_PROFILE,
      );
    });

    test("Cancel, Escape and Close discard what was typed", async ({
      page,
      database,
      candidate,
    }) => {
      const posts = recordRequests(page, call("POST", "/api/profile"));
      await openWithoutProfile(page, database, candidate.id);
      const form = page.getByRole("dialog", { name: "Add your details" });
      const firstName = form.getByLabel("First name", { exact: true });
      const dismissals = [
        () => form.getByRole("button", { name: "Cancel", exact: true }).click(),
        () => page.keyboard.press("Escape"),
        () => form.getByRole("button", { name: "Close", exact: true }).click(),
      ];
      for (const dismiss of dismissals) {
        await addDetails(page).click();
        await expect(firstName).toHaveValue("");
        await firstName.fill("Taylor");
        await dismiss();
        await expect(form).toBeHidden();
      }
      await addDetails(page).click();
      await expect(firstName).toHaveValue("");
      await page.keyboard.press("Escape");
      await expect(form).toBeHidden();
      await expect(
        page
          .getByRole("main")
          .getByRole("heading", { name: "No details yet", level: 2 }),
      ).toBeVisible();
      expect(posts).toHaveLength(0);
    });

    test("a failed save keeps the sheet open with what was typed", async ({
      page,
      database,
      candidate,
    }) => {
      await page.route("**/api/profile", (route) =>
        route.request().method() === "POST"
          ? route.fulfill({ status: 500, json: { error: "Create failed" } })
          : route.fallback(),
      );
      await openWithoutProfile(page, database, candidate.id);
      await addDetails(page).click();
      const form = page.getByRole("dialog", { name: "Add your details" });
      await form.getByLabel("First name", { exact: true }).fill("Taylor");
      await form
        .getByRole("button", { name: "Save profile", exact: true })
        .click();
      await expect(page.getByText(SAVE_FAILED, { exact: true })).toBeVisible();
      await expect(form).toBeVisible();
      await expect(form.getByLabel("First name", { exact: true })).toHaveValue(
        "Taylor",
      );
      expect(await storedProfiles(database, candidate.id)).toEqual([]);
    });

    test("a profile created elsewhere after the page loaded is not a server error", async ({
      page,
      database,
      candidate,
    }) => {
      await openWithoutProfile(page, database, candidate.id);
      await database
        .insert(userProfiles)
        .values({ userId: candidate.id, firstName: "Elsewhere" });
      await addDetails(page).click();
      const form = page.getByRole("dialog", { name: "Add your details" });
      await form.getByLabel("First name", { exact: true }).fill("Taylor");
      const created = responseTo(page, "POST", "/api/profile");
      await form
        .getByRole("button", { name: "Save profile", exact: true })
        .click();
      const response = await created;
      // The unique user_id kept the row created elsewhere as the only one.
      const rows = await storedProfiles(database, candidate.id);
      expect(rows).toHaveLength(1);
      expect(response.status()).toBe(500);
      expectedFail(
        "src/app/api/profile/service.ts:64: the insert does not handle the unique user_id, so the violation reaches routeErrorResponse and returns 500",
      );
      expect(response.status()).toBeLessThan(500);
    });

    test("Save is disabled while saving and sends one request", async ({
      page,
      database,
      candidate,
    }) => {
      const pending = await hold(page, "**/api/profile");
      await openWithoutProfile(page, database, candidate.id);
      await addDetails(page).click();
      const form = page.getByRole("dialog", { name: "Add your details" });
      await form.getByLabel("First name", { exact: true }).fill("Taylor");
      await form
        .getByRole("button", { name: "Save profile", exact: true })
        .click();
      await expect(
        form.getByRole("button", { name: "Saving…", exact: true }),
      ).toBeDisabled();
      expect(pending.requests).toHaveLength(1);
      pending.release();
      await expect(
        page.getByText("Profile saved", { exact: true }),
      ).toBeVisible();
      expect(await storedProfiles(database, candidate.id)).toHaveLength(1);
    });

    test("an over-long field is refused without a request", async ({
      page,
      database,
      candidate,
    }) => {
      const posts = recordRequests(page, call("POST", "/api/profile"));
      await openWithoutProfile(page, database, candidate.id);
      await addDetails(page).click();
      const form = page.getByRole("dialog", { name: "Add your details" });
      await form
        .getByLabel("First name", { exact: true })
        .fill("a".repeat(301));
      await form
        .getByRole("button", { name: "Save profile", exact: true })
        .click();
      await expect(form.getByText(TOO_LONG, { exact: true })).toBeVisible();
      await expect(form).toBeVisible();
      expect(posts).toHaveLength(0);
    });

    test("a file over 8 MB is refused before it is sent", async ({
      page,
      database,
      candidate,
    }) => {
      const imports = recordRequests(
        page,
        call("POST", "/api/profile/resume-import"),
      );
      await openWithoutProfile(page, database, candidate.id);
      await chooseImportFile(page, {
        name: "big.txt",
        mimeType: "text/plain",
        buffer: Buffer.alloc(8 * 1024 * 1024 + 1, "a"),
      });
      await expect(
        page.getByText("That file is over 8 MB. Choose a smaller one.", {
          exact: true,
        }),
      ).toBeVisible();
      expect(imports).toHaveLength(0);
    });

    test("an unsupported file type is refused by the server", async ({
      page,
      database,
      candidate,
    }) => {
      await openWithoutProfile(page, database, candidate.id);
      const rejected = responseTo(page, "POST", "/api/profile/resume-import");
      await chooseImportFile(page, PNG);
      expect((await rejected).status()).toBe(415);
      await expect(
        page.getByText(
          "Unsupported file type. Upload a PDF, DOCX or TXT file.",
          { exact: true },
        ),
      ).toBeVisible();
      await expect(
        page
          .getByRole("main")
          .getByRole("button", { name: "Import a resume", exact: true }),
      ).toBeEnabled();
    });

    test("the import limit stops a sixth file in a minute", async ({
      page,
      request,
      database,
      candidate,
      ai,
    }) => {
      // The limit is checked before the file type, so rejected files still count.
      for (let sent = 0; sent < 5; sent += 1)
        expect(
          (
            await request.post("/api/profile/resume-import", {
              multipart: { file: PNG },
            })
          ).status(),
        ).toBe(415);
      await openWithoutProfile(page, database, candidate.id);
      const limited = responseTo(page, "POST", "/api/profile/resume-import");
      await chooseImportFile(page, {
        name: "resume.txt",
        mimeType: "text/plain",
        buffer: Buffer.from("Taylor Example"),
      });
      expect((await limited).status()).toBe(429);
      await expect(page.getByText(RATE_LIMITED, { exact: true })).toBeVisible();
      expect(ai.requests()).toHaveLength(0);
    });

    test("an import fills the form, and Cancel goes back to the imported values", async ({
      page,
      database,
      candidate,
      ai,
    }) => {
      ai.reply(
        importReply({
          firstName: "Imported",
          lastName: "Candidate",
          email: "imported@example.test",
          city: "Singapore",
        }),
      );
      await openWithoutProfile(page, database, candidate.id);
      await chooseImportFile(page, {
        name: "resume.txt",
        mimeType: "text/plain",
        buffer: Buffer.from("Imported Candidate\nimported@example.test\n"),
      });
      await expect(page.getByText(IMPORTED, { exact: true })).toBeVisible({
        timeout: 30_000,
      });
      const [sent] = ai.requests();
      expect(sent ? userPrompt(sent) : undefined).toContain(
        "Imported Candidate",
      );

      await addDetails(page).click();
      const form = page.getByRole("dialog", { name: "Add your details" });
      const firstName = form.getByLabel("First name", { exact: true });
      await expect(firstName).toHaveValue("Imported");
      await expect(form.getByLabel("Email", { exact: true })).toHaveValue(
        "imported@example.test",
      );
      await firstName.fill("Edited");
      await form.getByRole("button", { name: "Cancel", exact: true }).click();
      await expect(form).toBeHidden();
      await addDetails(page).click();
      await expect(firstName).toHaveValue("Imported");

      await form
        .getByRole("button", { name: "Save profile", exact: true })
        .click();
      await expect(
        page.getByText("Profile saved", { exact: true }),
      ).toBeVisible();
      await expect(form).toBeHidden();
      await expect(
        page
          .getByRole("main")
          .getByRole("heading", { name: "Imported Candidate", level: 3 }),
      ).toBeVisible();
      const [stored] = await storedProfiles(database, candidate.id);
      expect(stored).toMatchObject({
        firstName: "Imported",
        lastName: "Candidate",
        email: "imported@example.test",
        city: "Singapore",
      });
    });

    test("create rejects missing keys, malformed JSON and a missing session", async ({
      request,
      playwright,
      extraHTTPHeaders,
    }) => {
      const anonymous = await anonymousRequest(playwright, extraHTTPHeaders);
      try {
        const response = await anonymous.post("/api/profile", {
          data: EMPTY_PROFILE,
        });
        expect(response.status()).toBe(401);
        expect(await response.json()).toEqual({ error: "Unauthorized" });
      } finally {
        await anonymous.dispose();
      }
      const empty = await request.post("/api/profile", { data: {} });
      expect(empty.status()).toBe(400);
      const body = await errorBody(empty);
      expect(body.error).toBe("Invalid request data");
      // Every key is nullable but none may be left out.
      expect(body.details?.map((issue) => issue.path.join("."))).toEqual(
        expect.arrayContaining(["firstName", "email", "professionalSummary"]),
      );
      const malformed = await request.post("/api/profile", MALFORMED_JSON);
      expect(malformed.status()).toBe(400);
      expect(await malformed.json()).toEqual({
        error: "Request body must be valid JSON",
      });
    });
  },
);

test.describe("Edit personal information", { tag: "@personal-edit" }, () => {
  async function openEdit(page: Page) {
    await page.goto("/dashboard/profile");
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    const form = page.getByRole("dialog", { name: "Edit profile" });
    await expect(form.getByLabel("First name", { exact: true })).toHaveValue(
      "Alex",
    );
    return form;
  }

  function saveChanges(form: Locator) {
    return form.getByRole("button", { name: "Save changes", exact: true });
  }

  test("contact details and links are saved, and a cleared email is removed", async ({
    page,
    database,
    candidate,
  }) => {
    await page.goto("/dashboard/profile");
    const main = page.getByRole("main");
    await expect(
      main.getByRole("heading", { name: "Alex Example", level: 3 }),
    ).toBeVisible();
    await expect(
      main.getByText("Software engineer building reliable applications.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      main.getByText("alex@example.test", { exact: true }),
    ).toBeVisible();
    await expect(main.getByText("Singapore", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Edit", exact: true }).click();
    const form = page.getByRole("dialog", { name: "Edit profile" });
    await expect(form.getByLabel("First name", { exact: true })).toHaveValue(
      "Alex",
    );
    await expect(form.getByLabel("Email", { exact: true })).toHaveValue(
      "alex@example.test",
    );
    await form.getByLabel("Phone", { exact: true }).fill("+65 5555 0000");
    await form.getByLabel("Address", { exact: true }).fill("1 Example Street");
    await form.getByLabel("State or region", { exact: true }).fill("Central");
    await form.getByLabel("Postcode", { exact: true }).fill("049315");
    await form.getByLabel("Country", { exact: true }).fill("Singapore");
    await form
      .getByLabel("GitHub URL", { exact: true })
      .fill("https://github.com/alex");
    await form
      .getByLabel("Portfolio URL", { exact: true })
      .fill("https://alex.example");
    await form.getByLabel("Email", { exact: true }).fill("");
    await saveChanges(form).click();

    await expect(
      page.getByText("Changes saved", { exact: true }),
    ).toBeVisible();
    await expect(form).toBeHidden();
    await expect(
      main.getByText("+65 5555 0000", { exact: true }),
    ).toBeVisible();
    await expect(
      main.getByText("Singapore, Central, Singapore", { exact: true }),
    ).toBeVisible();
    for (const href of ["https://github.com/alex", "https://alex.example"])
      await expect(
        main.getByRole("link", { name: href, exact: true }),
      ).toHaveAttribute("href", href);
    await expect(main.getByText("GitHub", { exact: true })).toBeVisible();
    await expect(main.getByText("Portfolio", { exact: true })).toBeVisible();
    await expect(main.getByText("Email", { exact: true })).toHaveCount(0);
    // The card leaves the street address and postcode out.
    await expect(
      main.getByText("1 Example Street", { exact: true }),
    ).toHaveCount(0);
    await expect(main.getByText("049315", { exact: true })).toHaveCount(0);

    const [stored] = await storedProfiles(database, candidate.id);
    expect(stored).toMatchObject({
      firstName: "Alex",
      email: null,
      phone: "+65 5555 0000",
      address: "1 Example Street",
      state: "Central",
      zipCode: "049315",
      country: "Singapore",
      githubUrl: "https://github.com/alex",
      portfolioUrl: "https://alex.example",
      linkedinUrl: null,
    });
    await page.reload();
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await expect(form.getByLabel("Address", { exact: true })).toHaveValue(
      "1 Example Street",
    );
    await expect(form.getByLabel("Postcode", { exact: true })).toHaveValue(
      "049315",
    );
    await expect(form.getByLabel("Email", { exact: true })).toHaveValue("");
  });

  test("over-long text is refused field by field without a request", async ({
    page,
  }) => {
    const puts = recordRequests(page, call("PUT", "/api/profile"));
    const form = await openEdit(page);
    const shortFields = [
      "First name",
      "Last name",
      "Phone",
      "Address",
      "City",
      "State or region",
      "Postcode",
      "Country",
    ];
    for (const label of shortFields)
      await form.getByLabel(label, { exact: true }).fill("a".repeat(301));
    await form
      .getByLabel("Professional summary", { exact: true })
      .fill("s".repeat(20_001));
    await saveChanges(form).click();
    await expect(form.getByText(TOO_LONG, { exact: true })).toHaveCount(
      shortFields.length,
    );
    await expect(
      form.getByText("Keep this under 20,000 characters", { exact: true }),
    ).toBeVisible();
    await expect(form).toBeVisible();
    expect(puts).toHaveLength(0);
  });

  test("addresses and links the browser accepts but the schema rejects get field messages", async ({
    page,
  }) => {
    const puts = recordRequests(page, call("PUT", "/api/profile"));
    const form = await openEdit(page);
    await form.getByLabel("Email", { exact: true }).fill("alex@example");
    await form
      .getByLabel("LinkedIn URL", { exact: true })
      .fill("ftp://example.com");
    await form
      .getByLabel("GitHub URL", { exact: true })
      .fill("javascript:alert(1)");
    await form
      .getByLabel("Portfolio URL", { exact: true })
      .fill(`https://example.com/${"a".repeat(2_000)}`);
    await saveChanges(form).click();
    await expect(
      form.getByText("Invalid email format", { exact: true }),
    ).toBeVisible();
    await expect(
      form.getByText("Enter a link starting with https://", { exact: true }),
    ).toHaveCount(2);
    await expect(
      form.getByText("Keep this under 2,000 characters", { exact: true }),
    ).toBeVisible();
    expect(puts).toHaveLength(0);
  });

  test("an address or link the browser rejects stops the form before it validates", async ({
    page,
  }) => {
    const puts = recordRequests(page, call("PUT", "/api/profile"));
    const form = await openEdit(page);
    const email = form.getByLabel("Email", { exact: true });
    await email.fill("not-an-email");
    await saveChanges(form).click();
    expect(await isValid(email)).toBe(false);

    await email.fill("alex@example.test");
    const github = form.getByLabel("GitHub URL", { exact: true });
    await github.fill("github.com/alex");
    await saveChanges(form).click();
    expect(await isValid(github)).toBe(false);
    await expect(form).toBeVisible();
    await expect(
      form.getByText("Enter a link starting with https://", { exact: true }),
    ).toHaveCount(0);
    expect(puts).toHaveLength(0);
  });

  test("Cancel, Escape and Close discard the edits", async ({ page }) => {
    const puts = recordRequests(page, call("PUT", "/api/profile"));
    await page.goto("/dashboard/profile");
    const edit = page.getByRole("button", { name: "Edit", exact: true });
    const form = page.getByRole("dialog", { name: "Edit profile" });
    const firstName = form.getByLabel("First name", { exact: true });
    const dismissals = [
      () => form.getByRole("button", { name: "Cancel", exact: true }).click(),
      () => page.keyboard.press("Escape"),
      () => form.getByRole("button", { name: "Close", exact: true }).click(),
    ];
    for (const dismiss of dismissals) {
      await edit.click();
      await expect(firstName).toHaveValue("Alex");
      await firstName.fill("Discarded");
      await dismiss();
      await expect(form).toBeHidden();
    }
    await edit.click();
    await expect(firstName).toHaveValue("Alex");
    await page.keyboard.press("Escape");
    await expect(form).toBeHidden();
    await expect(
      page
        .getByRole("main")
        .getByRole("heading", { name: "Alex Example", level: 3 }),
    ).toBeVisible();
    expect(puts).toHaveLength(0);
  });

  test("a save after a discarded edit stores only the new change", async ({
    page,
    database,
    candidate,
  }) => {
    const form = await openEdit(page);
    await form.getByLabel("First name", { exact: true }).fill("Discarded");
    await form.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(form).toBeHidden();
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await form.getByLabel("City", { exact: true }).fill("Paris");
    await saveChanges(form).click();
    await expect(
      page.getByText("Changes saved", { exact: true }),
    ).toBeVisible();
    await expect(form).toBeHidden();
    await expect(
      page
        .getByRole("main")
        .getByRole("heading", { name: "Alex Example", level: 3 }),
    ).toBeVisible();
    const [stored] = await storedProfiles(database, candidate.id);
    expect(stored).toMatchObject({ firstName: "Alex", city: "Paris" });
  });

  test("a failed save keeps the sheet open with the edits", async ({
    page,
  }) => {
    await page.route("**/api/profile", (route) =>
      route.request().method() === "PUT"
        ? route.fulfill({ status: 500, json: { error: "Update failed" } })
        : route.fallback(),
    );
    const form = await openEdit(page);
    await form.getByLabel("City", { exact: true }).fill("Paris");
    await saveChanges(form).click();
    await expect(page.getByText(SAVE_FAILED, { exact: true })).toBeVisible();
    await expect(form).toBeVisible();
    await expect(form.getByLabel("City", { exact: true })).toHaveValue("Paris");
  });

  test("saving a profile deleted elsewhere fails and stays an edit", async ({
    page,
    database,
    candidate,
  }) => {
    const form = await openEdit(page);
    await form.getByLabel("City", { exact: true }).fill("Paris");
    await database
      .delete(userProfiles)
      .where(eq(userProfiles.userId, candidate.id));
    const updated = responseTo(page, "PUT", "/api/profile");
    await saveChanges(form).click();
    const response = await updated;
    expect(response.status()).toBe(404);
    expect(await response.json()).toEqual({ error: "Profile not found" });
    await expect(page.getByText(SAVE_FAILED, { exact: true })).toBeVisible();
    await expect(form).toBeVisible();
    await expect(saveChanges(form)).toBeEnabled();
    expect(await storedProfiles(database, candidate.id)).toEqual([]);
  });

  test("a session that ended mid-edit fails the save without losing the edits", async ({
    page,
    database,
    candidate,
  }) => {
    const form = await openEdit(page);
    await form.getByLabel("City", { exact: true }).fill("Paris");
    await revokeSessions(database, candidate.id);
    const updated = responseTo(page, "PUT", "/api/profile");
    await saveChanges(form).click();
    const response = await updated;
    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    await expect(page.getByText(SAVE_FAILED, { exact: true })).toBeVisible();
    await expect(form.getByLabel("City", { exact: true })).toHaveValue("Paris");
    const [stored] = await storedProfiles(database, candidate.id);
    expect(stored?.city).toBe("Singapore");
  });

  test("Save is disabled while saving and sends one request", async ({
    page,
  }) => {
    const pending = await hold(page, "**/api/profile", "PUT");
    const form = await openEdit(page);
    await form.getByLabel("City", { exact: true }).fill("Paris");
    await saveChanges(form).click();
    await expect(
      form.getByRole("button", { name: "Saving…", exact: true }),
    ).toBeDisabled();
    expect(pending.requests).toHaveLength(1);
    pending.release();
    await expect(
      page.getByText("Changes saved", { exact: true }),
    ).toBeVisible();
  });

  test("a stored value over today's limit must be shortened before other edits save", async ({
    page,
    database,
    candidate,
  }) => {
    const legacy = "a".repeat(400);
    await database
      .update(userProfiles)
      .set({ firstName: legacy })
      .where(eq(userProfiles.userId, candidate.id));
    const puts = recordRequests(page, call("PUT", "/api/profile"));
    await page.goto("/dashboard/profile");
    await expect(
      page
        .getByRole("main")
        .getByRole("heading", { name: `${legacy} Example`, level: 3 }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    const form = page.getByRole("dialog", { name: "Edit profile" });
    await form.getByLabel("City", { exact: true }).fill("Paris");
    await saveChanges(form).click();
    await expect(form.getByText(TOO_LONG, { exact: true })).toBeVisible();
    expect(puts).toHaveLength(0);
  });

  test("update validates fields, keeps unsent ones and ignores ownership keys", async ({
    request,
    database,
    candidate,
  }) => {
    for (const [data, message] of [
      [{ email: "bad" }, "Invalid email format"],
      [
        { linkedinUrl: "javascript:alert(1)" },
        "Enter a link starting with https://",
      ],
    ] as const) {
      const response = await request.put("/api/profile", { data });
      expect(response.status()).toBe(400);
      const body = await errorBody(response);
      expect(body.error).toBe("Invalid request data");
      expect(body.messages).toContain(message);
    }

    const untouched = await request.put("/api/profile", { data: {} });
    expect(untouched.status()).toBe(200);
    const raw: unknown = await untouched.json();
    expect(userProfileJsonResponseSchema.parse(raw)).toMatchObject({
      userId: candidate.id,
      firstName: "Alex",
      email: "alex@example.test",
      city: "Singapore",
    });

    const takeover = await request.put("/api/profile", {
      data: { firstName: "Renamed", userId: "someone-else" },
    });
    expect(takeover.status()).toBe(200);
    const rows = await storedProfiles(database, candidate.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.firstName).toBe("Renamed");
    expect(await storedProfiles(database, "someone-else")).toEqual([]);

    const malformed = await request.put("/api/profile", MALFORMED_JSON);
    expect(malformed.status()).toBe(400);
    expect(await malformed.json()).toEqual({
      error: "Request body must be valid JSON",
    });
  });
});
