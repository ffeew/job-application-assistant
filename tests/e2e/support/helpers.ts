import type {
  APIRequestContext,
  APIResponse,
  Locator,
  Page,
  PlaywrightWorkerArgs,
  Request,
} from "@playwright/test";
import { and, eq, like } from "drizzle-orm";
import { z } from "zod";
import * as schema from "../../../src/lib/db/schema";
import type { SavedGeneratedResume } from "../../../src/lib/resume-document";
import { resumeJsonResponseSchema } from "../../../src/app/api/resumes/validators";
import { completion } from "./fake-ai";
import { expect, test, type Database } from "./fixtures";
import { BASE_URL } from "./runtime";

/**
 * Holds matching requests until `release()`, so a test can assert pending
 * states and count submissions before the server answers.
 */
export async function hold(page: Page, url: string | RegExp, method = "POST") {
  const requests: Request[] = [];
  const gate = Promise.withResolvers<undefined>();
  await page.route(url, async (route) => {
    if (route.request().method() !== method) {
      await route.fallback();
      return;
    }
    requests.push(route.request());
    await gate.promise;
    await route.fallback();
  });
  return { requests, release: () => gate.resolve(undefined) };
}

const errorBodySchema = z.object({
  error: z.string(),
  details: z
    .array(
      z.object({
        message: z.string(),
        path: z.array(z.union([z.string(), z.number()])),
      }),
    )
    .optional(),
});

/** An API error response, validated, with the messages of any field issues. */
export async function errorBody(response: APIResponse) {
  const raw: unknown = await response.json();
  const body = errorBodySchema.parse(raw);
  return {
    ...body,
    messages: (body.details ?? []).map((issue) => issue.message),
  };
}

/** An API client with no session. */
export function anonymousRequest(
  playwright: PlaywrightWorkerArgs["playwright"],
  extraHTTPHeaders?: Record<string, string>,
) {
  // The runner gives new request contexts this test's signed-in storage state
  // unless one is passed.
  return playwright.request.newContext({
    baseURL: BASE_URL,
    extraHTTPHeaders,
    storageState: { cookies: [], origins: [] },
  });
}

/** A request body that is not valid JSON; a string would be JSON-encoded. */
export const MALFORMED_JSON = {
  headers: { "Content-Type": "application/json" },
  data: Buffer.from("{not json"),
};

/** Collects requests as they are sent, to prove a form sent nothing. */
export function recordRequests(
  page: Page,
  matches: (request: Request) => boolean,
) {
  const requests: Request[] = [];
  page.on("request", (request) => {
    if (matches(request)) requests.push(request);
  });
  return requests;
}

/** Matches requests by method and path, ignoring the query string. */
export function call(method: string, pathname: string | RegExp) {
  return (request: Request) => {
    const path = new URL(request.url()).pathname;
    return (
      request.method() === method &&
      (typeof pathname === "string" ? path === pathname : pathname.test(path))
    );
  };
}

export function responseTo(
  page: Page,
  method: string,
  pathname: string | RegExp,
) {
  return page.waitForResponse((response) =>
    call(method, pathname)(response.request()),
  );
}

/** The browser's own constraint check, which blocks submit before the form validates. */
export function isValid(field: Locator) {
  return field.evaluate((element) =>
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement
      ? element.validity.valid
      : null,
  );
}

/** Matches one API path whatever its query string, for page.route. */
export function listGet(pathname: string) {
  return (url: URL) => url.pathname === pathname;
}

export function sectionIndex(page: Page) {
  return page.getByRole("navigation", { name: "Profile sections" });
}

/** A profile index button, whose name ends with the section's entry count. */
export function sectionButton(page: Page, label: string) {
  return sectionIndex(page).getByRole("button", {
    name: new RegExp(`^${label}`),
  });
}

export async function revokeSessions(database: Database, userId: string) {
  await database
    .delete(schema.session)
    .where(eq(schema.session.userId, userId));
}

/** Email is not configured in E2E, so the reset token is read where it is stored. */
export async function resetToken(database: Database, userId: string) {
  const rows = await database
    .select({ identifier: schema.verification.identifier })
    .from(schema.verification)
    .where(
      and(
        eq(schema.verification.value, userId),
        like(schema.verification.identifier, "reset-password:%"),
      ),
    );
  const [row] = rows;
  if (!row || rows.length !== 1)
    throw new Error(`Expected one reset token, found ${rows.length}.`);
  return row.identifier.slice("reset-password:".length);
}

const EMPTY_IMPORT = {
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
  workExperiences: [],
  education: [],
  skills: [],
  projects: [],
  certifications: [],
  achievements: [],
  references: [],
  warnings: [],
};

/**
 * The structured reply resume-import/service.ts asks the model for. Keys left
 * out are empty, as the model leaves out what a resume lacks.
 */
export function importReply(reply: Record<string, unknown> = {}) {
  return completion(JSON.stringify({ ...EMPTY_IMPORT, ...reply }));
}

/** Imports a file through the profile header's Import resume button. */
export async function importResume(
  page: Page,
  file: { name: string; mimeType: string; buffer: Buffer },
) {
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("main")
    .getByRole("button", { name: "Import resume", exact: true })
    .click();
  await (await chooser).setFiles(file);
}

// Profile sections share one layout: an index, a sheet form per entry, and
// a confirmation before delete.

const REMOVED =
  "It will be removed from your profile. Resumes you already saved keep their copy.";

export async function openSection(page: Page, label: string) {
  await page.goto("/dashboard/profile");
  await sectionButton(page, label).click();
  await expect(
    page
      .getByRole("main")
      .getByRole("heading", { name: label, level: 2, exact: true }),
  ).toBeVisible();
}

export function addButton(page: Page, name: string) {
  return page.getByRole("main").getByRole("button", { name, exact: true });
}

export function sheet(page: Page, name: string) {
  return page.getByRole("dialog", { name, exact: true });
}

export function saveButton(form: Locator) {
  return form.getByRole("button", { name: "Save", exact: true });
}

/** A saved entry's card, found by its heading. */
export function entry(page: Page, title: string) {
  return page
    .getByRole("main")
    .getByRole("listitem")
    .filter({
      has: page.getByRole("heading", { name: title, level: 3, exact: true }),
    });
}

/** Entry headings in display order; only the open section is rendered. */
export function entryTitles(page: Page) {
  return page.getByRole("main").getByRole("heading", { level: 3 });
}

/** Fails every write to one section's API; reads still reach the server. */
export async function failWrites(page: Page, section: string) {
  await page.route(`**/api/profile/${section}**`, (route) =>
    route.request().method() === "GET"
      ? route.fallback()
      : route.fulfill({ status: 500, json: { error: "Stubbed failure" } }),
  );
}

export async function confirmDelete(page: Page, name: string) {
  await page
    .getByRole("main")
    .getByRole("button", { name: `Delete ${name}`, exact: true })
    .click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toContainText(REMOVED);
  await dialog.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(dialog).toBeHidden();
}

export async function openEdit(page: Page, name: string, title: string) {
  await page
    .getByRole("main")
    .getByRole("button", { name: `Edit ${name}`, exact: true })
    .click();
  const form = sheet(page, title);
  await expect(form).toBeVisible();
  return form;
}

/** Saves a generated resume snapshot without running the worker. */
export async function seedGeneratedResume(
  request: APIRequestContext,
  {
    title = "Seeded Resume",
    jobApplicationId,
    document,
  }: {
    title?: string;
    jobApplicationId?: string;
    document?: Partial<SavedGeneratedResume["document"]>;
  } = {},
) {
  const content: SavedGeneratedResume = {
    schemaVersion: 2,
    renderer: "latex",
    templateVersion: 1,
    document: {
      title,
      name: "Alex Example",
      contacts: [],
      summary: "Software engineer building reliable applications.",
      sections: [],
      ...document,
    },
    aiSelection: null,
    config: {},
    generatedAt: new Date().toISOString(),
    fit: {
      targetPages: 1,
      pageCount: 1,
      revisions: 0,
      fitsTarget: true,
      changes: [],
      warnings: [],
    },
  };
  const response = await request.post("/api/resumes", {
    data: {
      title,
      content: JSON.stringify(content),
      isTailored: Boolean(jobApplicationId),
      jobApplicationId,
    },
  });
  expect(response.status()).toBe(201);
  const raw: unknown = await response.json();
  return resumeJsonResponseSchema.parse(raw);
}

/**
 * Marks the rest of the test as a known bug. Call it only after the test has
 * proved it reached the defect, and before asserting the intended behaviour.
 */
export function expectedFail(description: string) {
  // CI retries only an unexpected first attempt. Reaching this point on a
  // retry means the first attempt failed earlier or passed after the bug was
  // fixed, and either must stay visible rather than count as expected.
  if (test.info().retry > 0)
    throw new Error(
      `Expected-fail tests are not retried; the first attempt did not fail at the known bug: ${description}`,
    );
  test.fail(true, description);
}
