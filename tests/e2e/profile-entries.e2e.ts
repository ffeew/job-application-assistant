import type {
  APIRequestContext,
  Locator,
  Page,
  PlaywrightWorkerArgs,
} from "@playwright/test";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import {
  achievements,
  certifications,
  projects,
  references,
} from "../../src/lib/db/schema";
import type {
  CreateAchievementRequest,
  CreateCertificationRequest,
  CreateProjectRequest,
  CreateReferenceRequest,
} from "../../src/app/api/profile/validators";
import { test, expect } from "./support/fixtures";
import {
  addButton,
  anonymousRequest,
  call,
  confirmDelete,
  entry,
  entryTitles,
  errorBody,
  expectedFail,
  failWrites,
  hold,
  isValid,
  listGet,
  MALFORMED_JSON,
  openEdit,
  openSection,
  recordRequests,
  responseTo,
  saveButton,
  sectionButton,
  sheet,
} from "./support/helpers";
import { BASE_URL } from "./support/runtime";

const TOO_LONG = "Keep this under 300 characters";
const TOO_LONG_TEXT = "Keep this under 20,000 characters";
const BAD_LINK = "Enter a link starting with https://";
const BAD_MONTH = "Date must be in YYYY-MM format";
const INVALID_RESPONSE =
  "Received an invalid server response. Please try again.";

const PROJECT = {
  title: "Route Planner",
  description: null,
  technologies: null,
  projectUrl: null,
  githubUrl: null,
  startDate: null,
  endDate: null,
  isOngoing: false,
  displayOrder: 0,
} satisfies CreateProjectRequest;

const CERTIFICATION = {
  name: "AWS Solutions Architect",
  issuingOrganization: "Amazon Web Services",
  issueDate: null,
  expirationDate: null,
  credentialId: null,
  credentialUrl: null,
  displayOrder: 0,
} satisfies CreateCertificationRequest;

const ACHIEVEMENT = {
  title: "Hackathon winner",
  description: null,
  organization: null,
  date: null,
  url: null,
  displayOrder: 0,
} satisfies CreateAchievementRequest;

const REFERENCE = {
  name: "Jordan Lee",
  title: null,
  company: null,
  email: null,
  phone: null,
  relationship: null,
  displayOrder: 0,
} satisfies CreateReferenceRequest;

interface BodyCase {
  data: Record<string, unknown>;
  message?: string;
  path?: string;
}

/** One profile entry API, described for the shared contract tests. */
interface EntryKind {
  label: string;
  tag: string;
  path: string;
  notFound: string;
  body: Record<string, unknown>;
  invalid: BodyCase[];
}

const PROJECTS: EntryKind = {
  label: "Projects",
  tag: "@projects-crud",
  path: "/api/profile/projects",
  notFound: "Project not found",
  body: PROJECT,
  invalid: [
    { data: {}, path: "title" },
    // Nullable keys are required, so a body with only the title is incomplete.
    { data: { title: "Only a title" }, path: "description" },
    { data: { ...PROJECT, title: "" }, message: "Project title is required" },
    { data: { ...PROJECT, title: "T".repeat(301) }, message: TOO_LONG },
    {
      data: { ...PROJECT, description: "D".repeat(20_001) },
      message: TOO_LONG_TEXT,
    },
    {
      data: { ...PROJECT, projectUrl: "javascript:alert(1)" },
      message: BAD_LINK,
    },
    {
      data: { ...PROJECT, githubUrl: "ftp://example.test" },
      message: BAD_LINK,
    },
    { data: { ...PROJECT, startDate: "2024-13" }, message: BAD_MONTH },
    { data: { ...PROJECT, displayOrder: -1 }, path: "displayOrder" },
    { data: { ...PROJECT, displayOrder: 1.5 }, path: "displayOrder" },
    { data: { ...PROJECT, isOngoing: "yes" }, path: "isOngoing" },
  ],
};

const CERTIFICATIONS: EntryKind = {
  label: "Certifications",
  tag: "@certifications-crud",
  path: "/api/profile/certifications",
  notFound: "Certification not found",
  body: CERTIFICATION,
  invalid: [
    { data: {}, path: "name" },
    {
      data: { ...CERTIFICATION, name: "" },
      message: "Certification name is required",
    },
    {
      data: { ...CERTIFICATION, issuingOrganization: "" },
      message: "Issuing organization is required",
    },
    {
      data: { ...CERTIFICATION, credentialId: "C".repeat(301) },
      message: TOO_LONG,
    },
    {
      data: { ...CERTIFICATION, credentialUrl: "ftp://example.test" },
      message: BAD_LINK,
    },
    { data: { ...CERTIFICATION, issueDate: "2024-00" }, message: BAD_MONTH },
  ],
};

const ACHIEVEMENTS: EntryKind = {
  label: "Achievements",
  tag: "@achievements-crud",
  path: "/api/profile/achievements",
  notFound: "Achievement not found",
  body: ACHIEVEMENT,
  invalid: [
    {
      data: {
        title: "No link key",
        description: null,
        organization: null,
        date: null,
        displayOrder: 0,
      },
      path: "url",
    },
    {
      data: { ...ACHIEVEMENT, title: "" },
      message: "Achievement title is required",
    },
    { data: { ...ACHIEVEMENT, url: "ftp://example.test" }, message: BAD_LINK },
    { data: { ...ACHIEVEMENT, date: "2024-00" }, message: BAD_MONTH },
    {
      data: { ...ACHIEVEMENT, organization: "O".repeat(301) },
      message: TOO_LONG,
    },
  ],
};

const REFERENCES: EntryKind = {
  label: "References",
  tag: "@references-crud",
  path: "/api/profile/references",
  notFound: "Reference not found",
  body: REFERENCE,
  invalid: [
    { data: {}, path: "name" },
    { data: { ...REFERENCE, name: "" }, message: "Reference name is required" },
    {
      data: { ...REFERENCE, email: "not-an-email" },
      message: "Invalid email format",
    },
    { data: { ...REFERENCE, relationship: "friend" }, path: "relationship" },
    // Stored values are the lowercase keys, not the labels the form shows.
    { data: { ...REFERENCE, relationship: "Manager" }, path: "relationship" },
    { data: { ...REFERENCE, phone: "1".repeat(301) }, message: TOO_LONG },
  ],
};

const KINDS = [PROJECTS, CERTIFICATIONS, ACHIEVEMENTS, REFERENCES];

const idSchema = z.object({ id: z.number() });
const listSchema = z.array(
  z.object({ id: z.number(), displayOrder: z.number() }),
);

async function seed(
  request: APIRequestContext,
  kind: EntryKind,
  data: Record<string, unknown> = {},
) {
  const response = await request.post(kind.path, {
    data: { ...kind.body, ...data },
  });
  expect(response.status()).toBe(201);
  const raw: unknown = await response.json();
  return idSchema.parse(raw).id;
}

async function listed(request: APIRequestContext, url: string) {
  const response = await request.get(url);
  expect(response.status()).toBe(200);
  const raw: unknown = await response.json();
  return listSchema.parse(raw);
}

function toast(page: Page, text: string) {
  return page.getByText(text, { exact: true });
}

function otherAccount(
  playwright: PlaywrightWorkerArgs["playwright"],
  storageState: Awaited<ReturnType<APIRequestContext["storageState"]>>,
  extraHTTPHeaders?: Record<string, string>,
) {
  return playwright.request.newContext({
    baseURL: BASE_URL,
    storageState,
    extraHTTPHeaders,
  });
}

test.describe(
  "Projects: add, edit and delete",
  { tag: "@projects-crud" },
  () => {
    test("a project is added, kept across a reload, edited and deleted", async ({
      page,
      database,
      candidate,
    }) => {
      await openSection(page, "Projects");
      const main = page.getByRole("main");
      await expect(
        main.getByRole("heading", { name: "No projects yet", level: 2 }),
      ).toBeVisible();
      await expect(
        main.getByText(
          "Add side projects, open source work or anything else you built.",
          { exact: true },
        ),
      ).toBeVisible();
      // An empty section offers its one action in the empty state only.
      await expect(addButton(page, "Add project")).toHaveCount(1);

      await addButton(page, "Add project").click();
      const form = sheet(page, "Add project");
      await expect(form).toContainText(
        "Appears in the Projects section of your resumes.",
      );
      await form.getByLabel("Title *", { exact: true }).fill("Route Planner");
      await form
        .getByLabel("Description", { exact: true })
        .fill("Plans delivery routes.");
      await form
        .getByLabel("Technologies", { exact: true })
        .fill("React, Node.js");
      await form.getByLabel("Start date", { exact: true }).fill("2023-02");
      await form.getByLabel("End date", { exact: true }).fill("2024-03");
      await form
        .getByLabel("Project URL", { exact: true })
        .fill("https://example.test/app");
      await form
        .getByLabel("Repository URL", { exact: true })
        .fill("https://github.com/example/app");
      const created = responseTo(page, "POST", PROJECTS.path);
      await saveButton(form).click();
      expect((await created).status()).toBe(201);
      await expect(toast(page, "Project saved")).toBeVisible();
      await expect(form).toBeHidden();

      const card = entry(page, "Route Planner");
      await expect(card).toContainText("Plans delivery routes.");
      await expect(
        card.getByText("Feb 2023 to Mar 2024", { exact: true }),
      ).toBeVisible();
      await expect(
        card.getByRole("link", { name: "Open project", exact: true }),
      ).toHaveAttribute("href", "https://example.test/app");
      for (const tag of ["React", "Node.js"])
        await expect(card.getByText(tag, { exact: true })).toBeVisible();
      await expect(sectionButton(page, "Projects")).toHaveText(
        /^Projects\s*1$/,
      );
      const [stored] = await database
        .select()
        .from(projects)
        .where(eq(projects.userId, candidate.id));
      expect(stored).toMatchObject({
        title: "Route Planner",
        description: "Plans delivery routes.",
        technologies: "React, Node.js",
        startDate: "2023-02",
        endDate: "2024-03",
        projectUrl: "https://example.test/app",
        githubUrl: "https://github.com/example/app",
        isOngoing: false,
      });

      await page.reload();
      await expect(
        main.getByRole("heading", { name: "Projects", level: 2, exact: true }),
      ).toBeVisible();
      await expect(card).toBeVisible();

      const edit = await openEdit(page, "Route Planner", "Edit project");
      await expect(edit.getByLabel("Title *", { exact: true })).toHaveValue(
        "Route Planner",
      );
      await expect(edit.getByLabel("Start date", { exact: true })).toHaveValue(
        "2023-02",
      );
      await edit.getByLabel("Title *", { exact: true }).fill("Route Planner 2");
      await saveButton(edit).click();
      await expect(toast(page, "Changes saved")).toBeVisible();
      await expect(edit).toBeHidden();
      await expect(entry(page, "Route Planner 2")).toBeVisible();

      await main
        .getByRole("button", { name: "Delete Route Planner 2", exact: true })
        .click();
      await expect(
        page.getByRole("alertdialog", { name: "Delete this project?" }),
      ).toBeVisible();
      await page
        .getByRole("alertdialog")
        .getByRole("button", { name: "Cancel", exact: true })
        .click();
      await expect(page.getByRole("alertdialog")).toBeHidden();
      await expect(entry(page, "Route Planner 2")).toBeVisible();
      await confirmDelete(page, "Route Planner 2");
      await expect(toast(page, "Project deleted")).toBeVisible();
      await expect(
        main.getByRole("heading", { name: "No projects yet", level: 2 }),
      ).toBeVisible();
      expect(
        await database
          .select()
          .from(projects)
          .where(eq(projects.userId, candidate.id)),
      ).toEqual([]);
    });

    test("projects are listed newest first", async ({ page, request }) => {
      await seed(request, PROJECTS, {
        title: "Older Project",
        startDate: "2022-01",
      });
      await seed(request, PROJECTS, {
        title: "Newer Project",
        startDate: "2024-01",
      });
      await openSection(page, "Projects");
      await expect(entryTitles(page)).toHaveText([
        "Newer Project",
        "Older Project",
      ]);
    });

    test("an ongoing project clears its end date and stays ongoing when edited", async ({
      page,
      database,
      candidate,
    }) => {
      await openSection(page, "Projects");
      await addButton(page, "Add project").click();
      const form = sheet(page, "Add project");
      await form.getByLabel("Title *", { exact: true }).fill("Route Planner");
      await form.getByLabel("Start date", { exact: true }).fill("2023-01");
      const end = form.getByLabel("End date", { exact: true });
      await end.fill("2023-06");
      await form.getByLabel("This project is ongoing", { exact: true }).check();
      await expect(end).toBeDisabled();
      await expect(end).toHaveValue("");
      await saveButton(form).click();
      await expect(toast(page, "Project saved")).toBeVisible();
      await expect(
        entry(page, "Route Planner").getByText("Jan 2023 to present", {
          exact: true,
        }),
      ).toBeVisible();
      const stored = () =>
        database
          .select({ isOngoing: projects.isOngoing, endDate: projects.endDate })
          .from(projects)
          .where(eq(projects.userId, candidate.id));
      expect(await stored()).toEqual([{ isOngoing: true, endDate: null }]);

      const edit = await openEdit(page, "Route Planner", "Edit project");
      await expect(
        edit.getByLabel("This project is ongoing", { exact: true }),
      ).toBeChecked();
      await expect(edit.getByLabel("End date", { exact: true })).toBeDisabled();
      await edit.getByLabel("Title *", { exact: true }).fill("Route Planner 2");
      await saveButton(edit).click();
      await expect(toast(page, "Changes saved")).toBeVisible();
      await expect(
        entry(page, "Route Planner 2").getByText("Jan 2023 to present", {
          exact: true,
        }),
      ).toBeVisible();
      expect(await stored()).toEqual([{ isOngoing: true, endDate: null }]);
    });

    test("an ongoing project without a start date reads as ongoing", async ({
      page,
      request,
    }) => {
      await seed(request, PROJECTS, { isOngoing: true });
      await openSection(page, "Projects");
      await expect(
        entry(page, "Route Planner").getByText("Ongoing", { exact: true }),
      ).toBeVisible();
    });

    test("unticking ongoing lets an end date finish the project", async ({
      page,
      request,
      database,
      candidate,
    }) => {
      await seed(request, PROJECTS, { isOngoing: true, startDate: "2023-01" });
      await openSection(page, "Projects");
      const edit = await openEdit(page, "Route Planner", "Edit project");
      await edit
        .getByLabel("This project is ongoing", { exact: true })
        .uncheck();
      const end = edit.getByLabel("End date", { exact: true });
      await expect(end).toBeEnabled();
      await end.fill("2024-06");
      await saveButton(edit).click();
      await expect(toast(page, "Changes saved")).toBeVisible();
      await expect(
        entry(page, "Route Planner").getByText("Jan 2023 to Jun 2024", {
          exact: true,
        }),
      ).toBeVisible();
      expect(
        await database
          .select({ isOngoing: projects.isOngoing, endDate: projects.endDate })
          .from(projects)
          .where(eq(projects.userId, candidate.id)),
      ).toEqual([{ isOngoing: false, endDate: "2024-06" }]);
    });

    test("a missing or over-long title is refused without a request", async ({
      page,
    }) => {
      const posts = recordRequests(page, call("POST", PROJECTS.path));
      await openSection(page, "Projects");
      await addButton(page, "Add project").click();
      const form = sheet(page, "Add project");
      await saveButton(form).click();
      await expect(
        form.getByText("Project title is required", { exact: true }),
      ).toBeVisible();
      await form.getByLabel("Title *", { exact: true }).fill("T".repeat(301));
      await saveButton(form).click();
      await expect(form.getByText(TOO_LONG, { exact: true })).toBeVisible();
      await expect(form).toBeVisible();
      expect(posts).toHaveLength(0);
    });

    test("a title of only spaces is refused like an empty one", async ({
      page,
      database,
      candidate,
    }) => {
      await openSection(page, "Projects");
      await addButton(page, "Add project").click();
      const form = sheet(page, "Add project");
      await form.getByLabel("Title *", { exact: true }).fill("   ");
      const created = responseTo(page, "POST", PROJECTS.path);
      await saveButton(form).click();
      expect((await created).status()).toBe(201);
      expectedFail(
        'src/app/api/profile/validators.ts:122: the title is min(1) without a trim, so "   " is saved as a project with a blank heading',
      );
      expect(
        await database
          .select()
          .from(projects)
          .where(eq(projects.userId, candidate.id)),
      ).toEqual([]);
    });

    test("a link without a scheme is stopped by the browser", async ({
      page,
    }) => {
      const posts = recordRequests(page, call("POST", PROJECTS.path));
      await openSection(page, "Projects");
      await addButton(page, "Add project").click();
      const form = sheet(page, "Add project");
      await form.getByLabel("Title *", { exact: true }).fill("Route Planner");
      const link = form.getByLabel("Project URL", { exact: true });
      await link.fill("not a url");
      await saveButton(form).click();
      expect(await isValid(link)).toBe(false);
      await expect(form).toBeVisible();
      expect(posts).toHaveLength(0);
    });

    test("a link the schema refuses is explained under the field", async ({
      page,
    }) => {
      const posts = recordRequests(page, call("POST", PROJECTS.path));
      await openSection(page, "Projects");
      await addButton(page, "Add project").click();
      const form = sheet(page, "Add project");
      await form.getByLabel("Title *", { exact: true }).fill("Route Planner");
      await form
        .getByLabel("Repository URL", { exact: true })
        .fill("ftp://example.test");
      await saveButton(form).click();
      await expect(form).toBeVisible();
      // Validation focuses the field it rejected, so the check below is settled.
      await expect(
        form.getByLabel("Repository URL", { exact: true }),
      ).toBeFocused();
      expect(posts).toHaveLength(0);
      expectedFail(
        "src/app/dashboard/profile/components/sections/projects-section.tsx:360: the URL inputs have no FormFieldError, so Save does nothing and says nothing",
      );
      await expect(form.getByText(BAD_LINK, { exact: true })).toBeVisible({
        timeout: 2_000,
      });
    });

    test("an over-long description is explained under the field", async ({
      page,
    }) => {
      const posts = recordRequests(page, call("POST", PROJECTS.path));
      await openSection(page, "Projects");
      await addButton(page, "Add project").click();
      const form = sheet(page, "Add project");
      await form.getByLabel("Title *", { exact: true }).fill("Route Planner");
      await form
        .getByLabel("Description", { exact: true })
        .fill("D".repeat(20_001));
      await saveButton(form).click();
      await expect(form).toBeVisible();
      // Validation focuses the field it rejected, so the check below is settled.
      await expect(
        form.getByLabel("Description", { exact: true }),
      ).toBeFocused();
      expect(posts).toHaveLength(0);
      expectedFail(
        "src/app/dashboard/profile/components/sections/projects-section.tsx:305: Description has no FormFieldError, so Save does nothing and says nothing",
      );
      await expect(form.getByText(TOO_LONG_TEXT, { exact: true })).toBeVisible({
        timeout: 2_000,
      });
    });

    test("Cancel, Escape and Close discard what was typed", async ({
      page,
    }) => {
      const posts = recordRequests(page, call("POST", PROJECTS.path));
      await openSection(page, "Projects");
      const form = sheet(page, "Add project");
      const title = form.getByLabel("Title *", { exact: true });
      const dismissals = [
        () => form.getByRole("button", { name: "Cancel", exact: true }).click(),
        () => page.keyboard.press("Escape"),
        () => form.getByRole("button", { name: "Close", exact: true }).click(),
      ];
      for (const dismiss of dismissals) {
        await addButton(page, "Add project").click();
        await expect(title).toHaveValue("");
        await title.fill("Discarded");
        await dismiss();
        await expect(form).toBeHidden();
      }
      await expect(
        page
          .getByRole("main")
          .getByRole("heading", { name: "No projects yet", level: 2 }),
      ).toBeVisible();
      expect(posts).toHaveLength(0);
    });

    test("Save is disabled while saving and sends one request", async ({
      page,
      database,
      candidate,
    }) => {
      const pending = await hold(page, `**${PROJECTS.path}`);
      await openSection(page, "Projects");
      await addButton(page, "Add project").click();
      const form = sheet(page, "Add project");
      await form.getByLabel("Title *", { exact: true }).fill("Route Planner");
      await saveButton(form).click();
      await expect(
        form.getByRole("button", { name: "Saving…", exact: true }),
      ).toBeDisabled();
      expect(pending.requests).toHaveLength(1);
      pending.release();
      await expect(toast(page, "Project saved")).toBeVisible();
      expect(
        await database
          .select()
          .from(projects)
          .where(eq(projects.userId, candidate.id)),
      ).toHaveLength(1);
    });

    test("failed saves and deletes keep the form or the row and say so", async ({
      page,
      request,
    }) => {
      await seed(request, PROJECTS);
      await failWrites(page, "projects");
      await openSection(page, "Projects");

      await addButton(page, "Add project").click();
      const form = sheet(page, "Add project");
      await form.getByLabel("Title *", { exact: true }).fill("New Project");
      await saveButton(form).click();
      await expect(
        toast(page, "Couldn't save the project. Try again."),
      ).toBeVisible();
      await expect(form.getByLabel("Title *", { exact: true })).toHaveValue(
        "New Project",
      );
      await form.getByRole("button", { name: "Cancel", exact: true }).click();
      await expect(form).toBeHidden();

      const edit = await openEdit(page, "Route Planner", "Edit project");
      await edit.getByLabel("Title *", { exact: true }).fill("Renamed");
      await saveButton(edit).click();
      await expect(
        toast(page, "Couldn't save the changes. Try again."),
      ).toBeVisible();
      await expect(edit).toBeVisible();
      await edit.getByRole("button", { name: "Cancel", exact: true }).click();
      await expect(edit).toBeHidden();

      await confirmDelete(page, "Route Planner");
      await expect(
        toast(page, "Couldn't delete the project. Try again."),
      ).toBeVisible();
      await expect(entry(page, "Route Planner")).toBeVisible();
    });

    test("a project already deleted elsewhere leaves the list", async ({
      page,
      request,
    }) => {
      const id = await seed(request, PROJECTS);
      await openSection(page, "Projects");
      await expect(entry(page, "Route Planner")).toBeVisible();
      expect((await request.delete(`${PROJECTS.path}/${id}`)).status()).toBe(
        200,
      );
      const deleted = responseTo(page, "DELETE", `${PROJECTS.path}/${id}`);
      await confirmDelete(page, "Route Planner");
      expect((await deleted).status()).toBe(404);
      await expect(
        toast(page, "Couldn't delete the project. Try again."),
      ).toBeVisible();
      expectedFail(
        "src/app/dashboard/profile/mutations/use-delete-project.ts:22: only onSuccess refreshes the list, so after a 404 the deleted project stays listed",
      );
      await expect(
        page
          .getByRole("main")
          .getByRole("heading", { name: "No projects yet", level: 2 }),
      ).toBeVisible({ timeout: 2_000 });
    });

    test("saving a project deleted elsewhere fails and keeps the form", async ({
      page,
      request,
    }) => {
      const id = await seed(request, PROJECTS);
      await openSection(page, "Projects");
      const edit = await openEdit(page, "Route Planner", "Edit project");
      expect((await request.delete(`${PROJECTS.path}/${id}`)).status()).toBe(
        200,
      );
      await edit.getByLabel("Title *", { exact: true }).fill("Renamed");
      const updated = responseTo(page, "PUT", `${PROJECTS.path}/${id}`);
      await saveButton(edit).click();
      const response = await updated;
      expect(response.status()).toBe(404);
      expect(await response.json()).toEqual({ error: "Project not found" });
      await expect(
        toast(page, "Couldn't save the changes. Try again."),
      ).toBeVisible();
      await expect(edit.getByLabel("Title *", { exact: true })).toHaveValue(
        "Renamed",
      );
    });
  },
);

test.describe(
  "Certifications: add, edit and delete",
  { tag: "@certifications-crud" },
  () => {
    test("a certification is added, edited and deleted", async ({
      page,
      database,
      candidate,
    }) => {
      await openSection(page, "Certifications");
      const main = page.getByRole("main");
      await expect(
        main.getByRole("heading", { name: "No certifications yet", level: 2 }),
      ).toBeVisible();
      await addButton(page, "Add certification").click();
      const form = sheet(page, "Add certification");
      await expect(form).toContainText(
        "Appears in the Certifications section of your resumes.",
      );
      await form
        .getByLabel("Certification name *", { exact: true })
        .fill("AWS Solutions Architect");
      await form
        .getByLabel("Issuing organization *", { exact: true })
        .fill("Amazon Web Services");
      await form.getByLabel("Issue date", { exact: true }).fill("2024-01");
      await form.getByLabel("Expiry date", { exact: true }).fill("2027-01");
      await form.getByLabel("Credential ID", { exact: true }).fill("ABC-123");
      await form
        .getByLabel("Credential URL", { exact: true })
        .fill("https://example.test/cred");
      await saveButton(form).click();
      await expect(toast(page, "Certification saved")).toBeVisible();
      await expect(form).toBeHidden();

      const card = entry(page, "AWS Solutions Architect");
      await expect(card).toContainText("Amazon Web Services");
      await expect(
        card.getByText("Issued Jan 2024", { exact: true }),
      ).toBeVisible();
      await expect(
        card.getByText("Expires Jan 2027", { exact: true }),
      ).toBeVisible();
      await expect(
        card.getByRole("link", { name: "Open credential", exact: true }),
      ).toHaveAttribute("href", "https://example.test/cred");
      // The card leaves the credential ID out; only the stored row has it.
      await expect(card).not.toContainText("ABC-123");
      const stored = () =>
        database
          .select({
            name: certifications.name,
            credentialId: certifications.credentialId,
          })
          .from(certifications)
          .where(eq(certifications.userId, candidate.id));
      expect(await stored()).toEqual([
        { name: "AWS Solutions Architect", credentialId: "ABC-123" },
      ]);

      const edit = await openEdit(
        page,
        "AWS Solutions Architect",
        "Edit certification",
      );
      await expect(
        edit.getByLabel("Credential ID", { exact: true }),
      ).toHaveValue("ABC-123");
      await edit
        .getByLabel("Certification name *", { exact: true })
        .fill("AWS Solutions Architect Pro");
      await saveButton(edit).click();
      await expect(toast(page, "Changes saved")).toBeVisible();
      await expect(entry(page, "AWS Solutions Architect Pro")).toBeVisible();
      expect(await stored()).toEqual([
        { name: "AWS Solutions Architect Pro", credentialId: "ABC-123" },
      ]);

      await confirmDelete(page, "AWS Solutions Architect Pro");
      await expect(toast(page, "Certification deleted")).toBeVisible();
      await expect(
        main.getByRole("heading", { name: "No certifications yet", level: 2 }),
      ).toBeVisible();
      expect(await stored()).toEqual([]);
    });

    test("certifications are listed by issue date, undated last", async ({
      page,
      request,
    }) => {
      await seed(request, CERTIFICATIONS, {
        name: "Older Cert",
        issueDate: "2022-01",
      });
      await seed(request, CERTIFICATIONS, { name: "Undated Cert" });
      await seed(request, CERTIFICATIONS, {
        name: "Newer Cert",
        issueDate: "2024-01",
      });
      await openSection(page, "Certifications");
      await expect(entryTitles(page)).toHaveText([
        "Newer Cert",
        "Older Cert",
        "Undated Cert",
      ]);
    });

    test("missing or over-long required fields are refused without a request", async ({
      page,
    }) => {
      const posts = recordRequests(page, call("POST", CERTIFICATIONS.path));
      await openSection(page, "Certifications");
      await addButton(page, "Add certification").click();
      const form = sheet(page, "Add certification");
      await saveButton(form).click();
      await expect(
        form.getByText("Certification name is required", { exact: true }),
      ).toBeVisible();
      await expect(
        form.getByText("Issuing organization is required", { exact: true }),
      ).toBeVisible();
      await form
        .getByLabel("Certification name *", { exact: true })
        .fill("N".repeat(301));
      await form
        .getByLabel("Issuing organization *", { exact: true })
        .fill("Amazon Web Services");
      await saveButton(form).click();
      await expect(form.getByText(TOO_LONG, { exact: true })).toBeVisible();
      expect(posts).toHaveLength(0);
    });

    test("an over-long credential ID is explained under the field", async ({
      page,
    }) => {
      const posts = recordRequests(page, call("POST", CERTIFICATIONS.path));
      await openSection(page, "Certifications");
      await addButton(page, "Add certification").click();
      const form = sheet(page, "Add certification");
      await form
        .getByLabel("Certification name *", { exact: true })
        .fill("AWS Solutions Architect");
      await form
        .getByLabel("Issuing organization *", { exact: true })
        .fill("Amazon Web Services");
      await form
        .getByLabel("Credential ID", { exact: true })
        .fill("C".repeat(301));
      await saveButton(form).click();
      await expect(form).toBeVisible();
      // Validation focuses the field it rejected, so the check below is settled.
      await expect(
        form.getByLabel("Credential ID", { exact: true }),
      ).toBeFocused();
      expect(posts).toHaveLength(0);
      expectedFail(
        "src/app/dashboard/profile/components/sections/certifications-section.tsx:318: Credential ID has no FormFieldError, so Save does nothing and says nothing",
      );
      await expect(form.getByText(TOO_LONG, { exact: true })).toBeVisible({
        timeout: 2_000,
      });
    });

    test("a credential link the schema refuses is explained under the field", async ({
      page,
    }) => {
      const posts = recordRequests(page, call("POST", CERTIFICATIONS.path));
      await openSection(page, "Certifications");
      await addButton(page, "Add certification").click();
      const form = sheet(page, "Add certification");
      await form
        .getByLabel("Certification name *", { exact: true })
        .fill("AWS Solutions Architect");
      await form
        .getByLabel("Issuing organization *", { exact: true })
        .fill("Amazon Web Services");
      await form
        .getByLabel("Credential URL", { exact: true })
        .fill("ftp://example.test");
      await saveButton(form).click();
      await expect(form).toBeVisible();
      // Validation focuses the field it rejected, so the check below is settled.
      await expect(
        form.getByLabel("Credential URL", { exact: true }),
      ).toBeFocused();
      expect(posts).toHaveLength(0);
      expectedFail(
        "src/app/dashboard/profile/components/sections/certifications-section.tsx:325: Credential URL has no FormFieldError, so Save does nothing and says nothing",
      );
      await expect(form.getByText(BAD_LINK, { exact: true })).toBeVisible({
        timeout: 2_000,
      });
    });

    test("Save is disabled while saving and sends one request", async ({
      page,
    }) => {
      const pending = await hold(page, `**${CERTIFICATIONS.path}`);
      await openSection(page, "Certifications");
      await addButton(page, "Add certification").click();
      const form = sheet(page, "Add certification");
      await form
        .getByLabel("Certification name *", { exact: true })
        .fill("AWS Solutions Architect");
      await form
        .getByLabel("Issuing organization *", { exact: true })
        .fill("Amazon Web Services");
      await saveButton(form).click();
      await expect(
        form.getByRole("button", { name: "Saving…", exact: true }),
      ).toBeDisabled();
      expect(pending.requests).toHaveLength(1);
      pending.release();
      await expect(toast(page, "Certification saved")).toBeVisible();
    });

    test("failed saves and deletes keep the form or the row and say so", async ({
      page,
      request,
    }) => {
      await seed(request, CERTIFICATIONS);
      await failWrites(page, "certifications");
      await openSection(page, "Certifications");

      await addButton(page, "Add certification").click();
      const form = sheet(page, "Add certification");
      await form
        .getByLabel("Certification name *", { exact: true })
        .fill("New Cert");
      await form
        .getByLabel("Issuing organization *", { exact: true })
        .fill("Example Org");
      await saveButton(form).click();
      await expect(
        toast(page, "Couldn't save the certification. Try again."),
      ).toBeVisible();
      await expect(form).toBeVisible();
      await form.getByRole("button", { name: "Cancel", exact: true }).click();
      await expect(form).toBeHidden();

      const edit = await openEdit(
        page,
        "AWS Solutions Architect",
        "Edit certification",
      );
      await edit
        .getByLabel("Certification name *", { exact: true })
        .fill("Renamed");
      await saveButton(edit).click();
      await expect(
        toast(page, "Couldn't save the changes. Try again."),
      ).toBeVisible();
      await expect(edit).toBeVisible();
      await edit.getByRole("button", { name: "Cancel", exact: true }).click();
      await expect(edit).toBeHidden();

      await confirmDelete(page, "AWS Solutions Architect");
      await expect(
        toast(page, "Couldn't delete the certification. Try again."),
      ).toBeVisible();
      await expect(entry(page, "AWS Solutions Architect")).toBeVisible();
    });
  },
);

test.describe(
  "Achievements: add, edit and delete",
  { tag: "@achievements-crud" },
  () => {
    test("an achievement with a link is added, edited and deleted", async ({
      page,
      database,
      candidate,
    }) => {
      await openSection(page, "Achievements");
      const main = page.getByRole("main");
      await expect(
        main.getByRole("heading", { name: "No achievements yet", level: 2 }),
      ).toBeVisible();
      await addButton(page, "Add achievement").click();
      const form = sheet(page, "Add achievement");
      await expect(form).toContainText(
        "Appears in the Achievements section of your resumes.",
      );
      await form
        .getByLabel("Title *", { exact: true })
        .fill("Hackathon winner");
      await form
        .getByLabel("Organization", { exact: true })
        .fill("Example Org");
      await form.getByLabel("Date", { exact: true }).fill("2024-03");
      await form
        .getByLabel("Description", { exact: true })
        .fill("First place.");
      await form
        .getByLabel("Link", { exact: true })
        .fill("https://example.test/award");
      const created = responseTo(page, "POST", ACHIEVEMENTS.path);
      await saveButton(form).click();
      expect((await created).status()).toBe(201);
      await expect(toast(page, "Achievement saved")).toBeVisible();
      await expect(form).toBeHidden();

      const card = entry(page, "Hackathon winner");
      await expect(card).toContainText("Example Org");
      await expect(card).toContainText("First place.");
      await expect(card.getByText("Mar 2024", { exact: true })).toBeVisible();
      await expect(
        card.getByRole("link", { name: "Open link", exact: true }),
      ).toHaveAttribute("href", "https://example.test/award");
      const stored = () =>
        database
          .select({ title: achievements.title, url: achievements.url })
          .from(achievements)
          .where(eq(achievements.userId, candidate.id));
      expect(await stored()).toEqual([
        { title: "Hackathon winner", url: "https://example.test/award" },
      ]);

      const edit = await openEdit(page, "Hackathon winner", "Edit achievement");
      await expect(edit.getByLabel("Link", { exact: true })).toHaveValue(
        "https://example.test/award",
      );
      await edit
        .getByLabel("Title *", { exact: true })
        .fill("Hackathon finalist");
      await edit.getByLabel("Link", { exact: true }).fill("");
      await saveButton(edit).click();
      await expect(toast(page, "Changes saved")).toBeVisible();
      const renamed = entry(page, "Hackathon finalist");
      await expect(renamed).toBeVisible();
      await expect(
        renamed.getByRole("link", { name: "Open link", exact: true }),
      ).toHaveCount(0);
      expect(await stored()).toEqual([
        { title: "Hackathon finalist", url: null },
      ]);

      await confirmDelete(page, "Hackathon finalist");
      await expect(toast(page, "Achievement deleted")).toBeVisible();
      await expect(
        main.getByRole("heading", { name: "No achievements yet", level: 2 }),
      ).toBeVisible();
      expect(await stored()).toEqual([]);
    });

    test("an achievement with only a title is saved", async ({
      page,
      database,
      candidate,
    }) => {
      await openSection(page, "Achievements");
      await addButton(page, "Add achievement").click();
      const form = sheet(page, "Add achievement");
      await form
        .getByLabel("Title *", { exact: true })
        .fill("Hackathon winner");
      await saveButton(form).click();
      await expect(toast(page, "Achievement saved")).toBeVisible();
      await expect(entry(page, "Hackathon winner")).toBeVisible();
      expect(
        await database
          .select({ url: achievements.url, date: achievements.date })
          .from(achievements)
          .where(eq(achievements.userId, candidate.id)),
      ).toEqual([{ url: null, date: null }]);
    });

    test("a missing title or a bad link is refused without a request", async ({
      page,
    }) => {
      const posts = recordRequests(page, call("POST", ACHIEVEMENTS.path));
      await openSection(page, "Achievements");
      await addButton(page, "Add achievement").click();
      const form = sheet(page, "Add achievement");
      await saveButton(form).click();
      await expect(
        form.getByText("Achievement title is required", { exact: true }),
      ).toBeVisible();

      await form
        .getByLabel("Title *", { exact: true })
        .fill("Hackathon winner");
      const link = form.getByLabel("Link", { exact: true });
      await link.fill("ftp://example.test");
      await saveButton(form).click();
      await expect(form.getByText(BAD_LINK, { exact: true })).toBeVisible();

      await link.fill("not a url");
      await saveButton(form).click();
      expect(await isValid(link)).toBe(false);
      await expect(form).toBeVisible();
      expect(posts).toHaveLength(0);
    });

    test("failed saves and deletes keep the form or the row and say so", async ({
      page,
      request,
    }) => {
      await seed(request, ACHIEVEMENTS);
      await failWrites(page, "achievements");
      await openSection(page, "Achievements");

      await addButton(page, "Add achievement").click();
      const form = sheet(page, "Add achievement");
      await form.getByLabel("Title *", { exact: true }).fill("New Award");
      await saveButton(form).click();
      await expect(
        toast(page, "Couldn't save the achievement. Try again."),
      ).toBeVisible();
      await expect(form).toBeVisible();
      await form.getByRole("button", { name: "Cancel", exact: true }).click();
      await expect(form).toBeHidden();

      const edit = await openEdit(page, "Hackathon winner", "Edit achievement");
      await edit.getByLabel("Title *", { exact: true }).fill("Renamed");
      await saveButton(edit).click();
      await expect(
        toast(page, "Couldn't save the changes. Try again."),
      ).toBeVisible();
      await expect(edit).toBeVisible();
      await edit.getByRole("button", { name: "Cancel", exact: true }).click();
      await expect(edit).toBeHidden();

      await confirmDelete(page, "Hackathon winner");
      await expect(
        toast(page, "Couldn't delete the achievement. Try again."),
      ).toBeVisible();
      await expect(entry(page, "Hackathon winner")).toBeVisible();
    });
  },
);

async function chooseRelationship(form: Locator, page: Page, name: string) {
  await form.getByLabel("Relationship", { exact: true }).click();
  await page.getByRole("option", { name, exact: true }).click();
}

test.describe(
  "References: add, edit and delete",
  { tag: "@references-crud" },
  () => {
    test("a reference with a relationship is added, cleared, edited and deleted", async ({
      page,
      database,
      candidate,
    }) => {
      await openSection(page, "References");
      const main = page.getByRole("main");
      await expect(
        main.getByRole("heading", { name: "No references yet", level: 2 }),
      ).toBeVisible();
      await addButton(page, "Add reference").click();
      const form = sheet(page, "Add reference");
      await expect(form).toContainText(
        "Kept with your profile for when an employer asks.",
      );
      await form.getByLabel("Name *", { exact: true }).fill("Jordan Lee");
      await form
        .getByLabel("Job title", { exact: true })
        .fill("Engineering Manager");
      await form.getByLabel("Company", { exact: true }).fill("Example Co");
      await form
        .getByLabel("Email", { exact: true })
        .fill("jordan@example.test");
      await form.getByLabel("Phone", { exact: true }).fill("+65 6000 0000");
      const relationship = form.getByLabel("Relationship", { exact: true });
      await expect(relationship).toHaveText("Not specified");
      await relationship.click();
      await expect(page.getByRole("option")).toHaveText([
        "Not specified",
        "Manager",
        "Colleague",
        "Client",
        "Professor",
        "Mentor",
        "Other",
      ]);
      await page.getByRole("option", { name: "Manager", exact: true }).click();
      await expect(relationship).toHaveText("Manager");
      await saveButton(form).click();
      await expect(toast(page, "Reference saved")).toBeVisible();
      await expect(form).toBeHidden();

      const card = entry(page, "Jordan Lee");
      await expect(
        card.getByText("Engineering Manager, Example Co", { exact: true }),
      ).toBeVisible();
      for (const text of ["jordan@example.test", "+65 6000 0000", "Manager"])
        await expect(card.getByText(text, { exact: true })).toBeVisible();
      const stored = () =>
        database
          .select({
            name: references.name,
            relationship: references.relationship,
          })
          .from(references)
          .where(eq(references.userId, candidate.id));
      expect(await stored()).toEqual([
        { name: "Jordan Lee", relationship: "manager" },
      ]);

      const edit = await openEdit(page, "Jordan Lee", "Edit reference");
      await expect(edit.getByLabel("Relationship", { exact: true })).toHaveText(
        "Manager",
      );
      await chooseRelationship(edit, page, "Not specified");
      await saveButton(edit).click();
      await expect(toast(page, "Changes saved")).toBeVisible();
      await expect(edit).toBeHidden();
      await expect(card.getByText("Manager", { exact: true })).toHaveCount(0);
      await expect(
        card.getByText("jordan@example.test", { exact: true }),
      ).toBeVisible();
      expect(await stored()).toEqual([
        { name: "Jordan Lee", relationship: null },
      ]);

      const again = await openEdit(page, "Jordan Lee", "Edit reference");
      await again.getByLabel("Name *", { exact: true }).fill("Jordan Lee-Park");
      await chooseRelationship(again, page, "Mentor");
      await saveButton(again).click();
      await expect(entry(page, "Jordan Lee-Park")).toBeVisible();
      await expect(
        entry(page, "Jordan Lee-Park").getByText("Mentor", { exact: true }),
      ).toBeVisible();
      expect(await stored()).toEqual([
        { name: "Jordan Lee-Park", relationship: "mentor" },
      ]);

      await confirmDelete(page, "Jordan Lee-Park");
      await expect(toast(page, "Reference deleted")).toBeVisible();
      await expect(
        main.getByRole("heading", { name: "No references yet", level: 2 }),
      ).toBeVisible();
      expect(await stored()).toEqual([]);
    });

    test("a missing name or an address the browser rejects is refused without a request", async ({
      page,
    }) => {
      const posts = recordRequests(page, call("POST", REFERENCES.path));
      await openSection(page, "References");
      await addButton(page, "Add reference").click();
      const form = sheet(page, "Add reference");
      await saveButton(form).click();
      await expect(
        form.getByText("Reference name is required", { exact: true }),
      ).toBeVisible();
      await form.getByLabel("Name *", { exact: true }).fill("Jordan Lee");
      const email = form.getByLabel("Email", { exact: true });
      await email.fill("jordan");
      await saveButton(form).click();
      expect(await isValid(email)).toBe(false);
      await expect(form).toBeVisible();
      expect(posts).toHaveLength(0);
    });

    test("an address the schema refuses is explained under the field", async ({
      page,
    }) => {
      const posts = recordRequests(page, call("POST", REFERENCES.path));
      await openSection(page, "References");
      await addButton(page, "Add reference").click();
      const form = sheet(page, "Add reference");
      await form.getByLabel("Name *", { exact: true }).fill("Jordan Lee");
      // The browser accepts an address without a dotted domain.
      await form.getByLabel("Email", { exact: true }).fill("a@b");
      await saveButton(form).click();
      await expect(form).toBeVisible();
      // Validation focuses the field it rejected, so the check below is settled.
      await expect(form.getByLabel("Email", { exact: true })).toBeFocused();
      expect(posts).toHaveLength(0);
      expectedFail(
        "src/app/dashboard/profile/components/sections/references-section.tsx:316: Email has no FormFieldError, so Save does nothing and says nothing",
      );
      await expect(
        form.getByText("Invalid email format", { exact: true }),
      ).toBeVisible({ timeout: 2_000 });
    });

    test("Save is disabled while saving and sends one request", async ({
      page,
    }) => {
      const pending = await hold(page, `**${REFERENCES.path}`);
      await openSection(page, "References");
      await addButton(page, "Add reference").click();
      const form = sheet(page, "Add reference");
      await form.getByLabel("Name *", { exact: true }).fill("Jordan Lee");
      await saveButton(form).click();
      await expect(
        form.getByRole("button", { name: "Saving…", exact: true }),
      ).toBeDisabled();
      expect(pending.requests).toHaveLength(1);
      pending.release();
      await expect(toast(page, "Reference saved")).toBeVisible();
    });

    test("failed saves and deletes keep the form or the row and say so", async ({
      page,
      request,
    }) => {
      await seed(request, REFERENCES);
      await failWrites(page, "references");
      await openSection(page, "References");

      await addButton(page, "Add reference").click();
      const form = sheet(page, "Add reference");
      await form.getByLabel("Name *", { exact: true }).fill("Sam Example");
      await saveButton(form).click();
      await expect(
        toast(page, "Couldn't save the reference. Try again."),
      ).toBeVisible();
      await expect(form).toBeVisible();
      await form.getByRole("button", { name: "Cancel", exact: true }).click();
      await expect(form).toBeHidden();

      const edit = await openEdit(page, "Jordan Lee", "Edit reference");
      await edit.getByLabel("Name *", { exact: true }).fill("Renamed");
      await saveButton(edit).click();
      await expect(
        toast(page, "Couldn't save the changes. Try again."),
      ).toBeVisible();
      await expect(edit).toBeVisible();
      await edit.getByRole("button", { name: "Cancel", exact: true }).click();
      await expect(edit).toBeHidden();

      await confirmDelete(page, "Jordan Lee");
      await expect(
        toast(page, "Couldn't delete the reference. Try again."),
      ).toBeVisible();
      await expect(entry(page, "Jordan Lee")).toBeVisible();
    });

    test("a stored relationship the form does not offer still lets the page load", async ({
      page,
      request,
      database,
      candidate,
    }) => {
      await seed(request, REFERENCES, { relationship: "manager" });
      // The column has no CHECK constraint, so older rows can hold free text.
      await database
        .update(references)
        .set({ relationship: sql`'former manager'` })
        .where(eq(references.userId, candidate.id));
      const loaded = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === REFERENCES.path &&
          response.request().method() === "GET",
      );
      await page.goto("/dashboard/profile");
      expect((await loaded).status()).toBe(200);
      expectedFail(
        'src/app/api/profile/validators.ts:308: the client parses references with the form\'s relationship enum, so one stored "former manager" fails the query and the whole page shows "Your profile didn\'t load"',
      );
      await expect(sectionButton(page, "References")).toBeVisible({
        timeout: 5_000,
      });
    });
  },
);

for (const kind of KINDS) {
  test.describe(`${kind.label} API contract`, { tag: kind.tag }, () => {
    test("bodies, malformed JSON and ids are validated", async ({
      request,
    }) => {
      for (const { data, message, path } of kind.invalid) {
        const response = await request.post(kind.path, { data });
        expect(response.status(), JSON.stringify(data).slice(0, 80)).toBe(400);
        const body = await errorBody(response);
        expect(body.error).toBe("Invalid request data");
        if (message) expect(body.messages).toContain(message);
        if (path)
          expect(body.details?.map((issue) => issue.path.join("."))).toContain(
            path,
          );
      }
      const malformed = await request.post(kind.path, MALFORMED_JSON);
      expect(malformed.status()).toBe(400);
      expect(await malformed.json()).toEqual({
        error: "Request body must be valid JSON",
      });

      const id = await seed(request, kind);
      const malformedUpdate = await request.put(
        `${kind.path}/${id}`,
        MALFORMED_JSON,
      );
      expect(malformedUpdate.status()).toBe(400);
      // Updates are partial, so an empty body changes nothing and succeeds.
      expect(
        (await request.put(`${kind.path}/${id}`, { data: {} })).status(),
      ).toBe(200);

      // parseInt would read "12abc" as 12; anything past PostgreSQL's integer
      // range would fail in the query instead.
      for (const bad of ["abc", "12abc", "-1", "1.5", "2147483648"]) {
        const url = `${kind.path}/${bad}`;
        for (const response of [
          await request.get(url),
          await request.put(url, { data: kind.body }),
          await request.delete(url),
        ]) {
          expect(response.status(), url).toBe(400);
          expect(await response.json()).toEqual({ error: "Invalid ID" });
        }
      }
      for (const unknown of ["0", "2147483647"]) {
        const url = `${kind.path}/${unknown}`;
        for (const response of [
          await request.get(url),
          await request.put(url, { data: kind.body }),
          await request.delete(url),
        ]) {
          expect(response.status(), url).toBe(404);
          expect(await response.json()).toEqual({ error: kind.notFound });
        }
      }
    });

    test("another account's entries cannot be read, changed or deleted", async ({
      request,
      createCandidate,
      playwright,
      extraHTTPHeaders,
    }) => {
      const other = await createCandidate();
      const otherRequest = await otherAccount(
        playwright,
        other.storageState,
        extraHTTPHeaders,
      );
      try {
        const id = await seed(otherRequest, kind);
        const url = `${kind.path}/${id}`;
        for (const response of [
          await request.get(url),
          await request.put(url, { data: { displayOrder: 7 } }),
          await request.delete(url),
        ]) {
          expect(response.status()).toBe(404);
          expect(await response.json()).toEqual({ error: kind.notFound });
        }
        expect(await listed(request, kind.path)).toEqual([]);
        expect(await listed(otherRequest, kind.path)).toEqual([
          { id, displayOrder: 0 },
        ]);
      } finally {
        await otherRequest.dispose();
      }
    });

    test("every endpoint requires a session", async ({
      playwright,
      extraHTTPHeaders,
    }) => {
      const anonymous = await anonymousRequest(playwright, extraHTTPHeaders);
      try {
        for (const response of [
          await anonymous.get(kind.path),
          await anonymous.post(kind.path, { data: kind.body }),
          await anonymous.get(`${kind.path}/1`),
          await anonymous.put(`${kind.path}/1`, { data: kind.body }),
          await anonymous.delete(`${kind.path}/1`),
          await anonymous.put(`${kind.path}/order`, {
            data: { items: [{ id: 1, displayOrder: 0 }] },
          }),
        ]) {
          expect(response.status(), response.url()).toBe(401);
          expect(await response.json()).toEqual({ error: "Unauthorized" });
        }
      } finally {
        await anonymous.dispose();
      }
    });
  });

  test.describe(
    `${kind.label} list query and order`,
    { tag: "@profile-entries-api-list-order" },
    () => {
      test("the order endpoint reorders the list, and the query sorts it", async ({
        request,
      }) => {
        const first = await seed(request, kind);
        const second = await seed(request, kind);
        const order = await request.put(`${kind.path}/order`, {
          data: {
            items: [
              { id: first, displayOrder: 1 },
              { id: second, displayOrder: 0 },
            ],
          },
        });
        expect(order.status()).toBe(200);
        expect(await order.json()).toEqual({ success: true });
        expect(
          await listed(request, `${kind.path}?orderBy=displayOrder&order=asc`),
        ).toEqual([
          { id: second, displayOrder: 0 },
          { id: first, displayOrder: 1 },
        ]);
        expect(
          (
            await listed(
              request,
              `${kind.path}?orderBy=displayOrder&order=desc`,
            )
          ).map((item) => item.id),
        ).toEqual([first, second]);
        expect(
          (await listed(request, `${kind.path}?limit=1&offset=1`)).map(
            (item) => item.id,
          ),
        ).toEqual([first]);
      });

      test("bad queries and order lists are refused", async ({ request }) => {
        for (const query of [
          "limit=0",
          "limit=101",
          "limit=abc",
          "offset=-1",
          "orderBy=title",
          "order=sideways",
        ]) {
          const response = await request.get(`${kind.path}?${query}`);
          expect(response.status(), query).toBe(400);
          expect((await errorBody(response)).error).toBe(
            "Invalid request data",
          );
        }
        const id = await seed(request, kind);
        for (const items of [
          [],
          Array.from({ length: 501 }, () => ({ id, displayOrder: 0 })),
          [{ id, displayOrder: -1 }],
        ]) {
          const response = await request.put(`${kind.path}/order`, {
            data: { items },
          });
          expect(response.status()).toBe(400);
          expect((await errorBody(response)).error).toBe(
            "Invalid request data",
          );
        }
        const malformed = await request.put(
          `${kind.path}/order`,
          MALFORMED_JSON,
        );
        expect(malformed.status()).toBe(400);
        expect(await malformed.json()).toEqual({
          error: "Request body must be valid JSON",
        });
      });

      test("another account's ids in an order list are left alone", async ({
        request,
        createCandidate,
        playwright,
        extraHTTPHeaders,
      }) => {
        const other = await createCandidate();
        const otherRequest = await otherAccount(
          playwright,
          other.storageState,
          extraHTTPHeaders,
        );
        try {
          const id = await seed(otherRequest, kind);
          const response = await request.put(`${kind.path}/order`, {
            data: { items: [{ id, displayOrder: 9 }] },
          });
          expect(response.status()).toBe(200);
          expect(await listed(otherRequest, kind.path)).toEqual([
            { id, displayOrder: 0 },
          ]);
        } finally {
          await otherRequest.dispose();
        }
      });
    },
  );
}

test.describe(
  "A failed entry list replaces the profile with an error",
  { tag: "@profile-load-failure" },
  () => {
    test("a rejected projects list shows its message, and Try again recovers", async ({
      page,
    }) => {
      const matcher = listGet(PROJECTS.path);
      await page.route(matcher, (route) =>
        route.request().method() === "GET"
          ? route.fulfill({
              status: 400,
              json: { error: "Failed to fetch projects" },
            })
          : route.fallback(),
      );
      await page.goto("/dashboard/profile");
      const main = page.getByRole("main");
      const notice = main.getByRole("alert");
      await expect(notice).toContainText("Your profile didn't load");
      await expect(notice).toContainText("Failed to fetch projects");
      await expect(
        main.getByRole("heading", { name: "No projects yet" }),
      ).toHaveCount(0);

      await page.unroute(matcher);
      await notice
        .getByRole("button", { name: "Try again", exact: true })
        .click();
      await expect(sectionButton(page, "Projects")).toBeVisible();
      await expect(notice).toHaveCount(0);
    });

    for (const kind of [CERTIFICATIONS, ACHIEVEMENTS, REFERENCES])
      test(`a failed ${kind.label.toLowerCase()} list fails the whole page`, async ({
        page,
      }) => {
        await page.route(listGet(kind.path), (route) =>
          route.request().method() === "GET"
            ? route.fulfill({ status: 403, json: { error: "Stubbed failure" } })
            : route.fallback(),
        );
        await page.goto("/dashboard/profile");
        const notice = page.getByRole("main").getByRole("alert");
        await expect(notice).toContainText("Your profile didn't load");
        await expect(notice).toContainText("Stubbed failure");
      });

    test("a malformed references list is reported at once", async ({
      page,
    }) => {
      await page.route(listGet(REFERENCES.path), (route) =>
        route.request().method() === "GET"
          ? route.fulfill({ json: [{ id: "x" }] })
          : route.fallback(),
      );
      await page.goto("/dashboard/profile");
      const notice = page.getByRole("main").getByRole("alert");
      await expect(notice).toContainText("Your profile didn't load");
      await expect(notice).toContainText(INVALID_RESPONSE);
    });
  },
);
