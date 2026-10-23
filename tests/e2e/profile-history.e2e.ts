import type { APIRequestContext, Page } from "@playwright/test";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { education, skills, workExperiences } from "../../src/lib/db/schema";
import type {
  CreateEducationRequest,
  CreateSkillRequest,
  CreateWorkExperienceRequest,
} from "../../src/app/api/profile/validators";
import { test, expect } from "./support/fixtures";
import type { FakeAI } from "./support/fake-ai";
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
  importReply,
  importResume,
  isValid,
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
const BAD_MONTH = "Date must be in YYYY-MM format";
const SEEDED_EXPERIENCE = "Software Engineer at Example Co";

const EXPERIENCE = {
  jobTitle: "Data Analyst",
  company: "Acme",
  location: null,
  startDate: "2019-03",
  endDate: null,
  isCurrent: false,
  description: null,
  technologies: null,
  displayOrder: 0,
} satisfies CreateWorkExperienceRequest;

const EDUCATION = {
  degree: "MSc Data Science",
  fieldOfStudy: null,
  institution: "Imperial",
  location: null,
  startDate: null,
  endDate: null,
  gpa: null,
  honors: null,
  relevantCoursework: null,
  displayOrder: 0,
} satisfies CreateEducationRequest;

const SKILL = {
  name: "Go",
  category: "technical",
  proficiencyLevel: null,
  yearsOfExperience: null,
  displayOrder: 0,
} satisfies CreateSkillRequest;

/** One history API, described for the shared contract tests. */
interface HistoryKind {
  label: string;
  /** Where its schema declares displayOrder, for the overflow cause. */
  displayOrderLine: number;
  tag: string;
  path: string;
  notFound: string;
  body: Record<string, unknown>;
  invalid: Record<string, unknown>[];
}

const WORK: HistoryKind = {
  label: "Work experience",
  displayOrderLine: 47,
  tag: "@experience-create",
  path: "/api/profile/work-experiences",
  notFound: "Work experience not found",
  body: EXPERIENCE,
  invalid: [
    { jobTitle: "X", company: "Y", startDate: "2024-01" },
    { ...EXPERIENCE, startDate: "2024-13" },
    { ...EXPERIENCE, startDate: "2024-1" },
    { ...EXPERIENCE, isCurrent: "yes" },
    { ...EXPERIENCE, displayOrder: -1 },
    { ...EXPERIENCE, displayOrder: 1.5 },
    { ...EXPERIENCE, jobTitle: "" },
  ],
};

const EDUCATIONS: HistoryKind = {
  label: "Education",
  displayOrderLine: 77,
  tag: "@education-crud",
  path: "/api/profile/education",
  notFound: "Education not found",
  body: EDUCATION,
  invalid: [
    { degree: "X", institution: "Y" },
    { ...EDUCATION, startDate: "2020-1" },
    { ...EDUCATION, gpa: "g".repeat(301) },
    { ...EDUCATION, honors: "h".repeat(20_001) },
    { ...EDUCATION, degree: "" },
  ],
};

const SKILLS: HistoryKind = {
  label: "Skills",
  displayOrderLine: 106,
  tag: "@skills-crud",
  path: "/api/profile/skills",
  notFound: "Skill not found",
  body: SKILL,
  invalid: [
    { ...SKILL, category: "hobby" },
    { ...SKILL, proficiencyLevel: "guru" },
    { ...SKILL, yearsOfExperience: -1 },
    { ...SKILL, yearsOfExperience: 1.5 },
    { name: "Go", category: "technical" },
    { ...SKILL, name: "" },
  ],
};

const KINDS = [WORK, EDUCATIONS, SKILLS];

const idSchema = z.object({ id: z.number() });
const listSchema = z.array(
  z.object({
    id: z.number(),
    userId: z.string(),
    displayOrder: z.number(),
  }),
);

async function seed(
  request: APIRequestContext,
  kind: HistoryKind,
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

function emptyHeading(page: Page, name: string) {
  return page.getByRole("main").getByRole("heading", { name, level: 2 });
}

/** A saved skill's chip, found by its group heading. */
function skillGroup(page: Page, category: string) {
  return page
    .getByRole("main")
    .getByRole("heading", { name: category, level: 3, exact: true })
    .locator("..");
}

async function chooseOption(page: Page, label: string, option: string) {
  await page.getByLabel(label, { exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

test.describe("Add work experience", { tag: "@experience-create" }, () => {
  test("a past role and a current one are added, newest first", async ({
    page,
    database,
    candidate,
  }) => {
    await openSection(page, "Work experience");
    const seeded = entry(page, "Software Engineer");
    await expect(seeded).toContainText("Example Co");
    await expect(
      seeded.getByText("Jan 2024 to present", { exact: true }),
    ).toBeVisible();
    await expect(seeded.getByText("TypeScript", { exact: true })).toBeVisible();

    await addButton(page, "Add experience").click();
    const form = sheet(page, "Add work experience");
    await expect(form).toContainText(
      "Appears in the Work Experiences section of your resumes.",
    );
    await form.getByLabel("Job title *", { exact: true }).fill("Data Analyst");
    await form.getByLabel("Company *", { exact: true }).fill("Acme");
    await form.getByLabel("Location", { exact: true }).fill("Remote");
    await form.getByLabel("Start date *", { exact: true }).fill("2019-03");
    await form.getByLabel("End date", { exact: true }).fill("2023-12");
    await form
      .getByLabel("What you did", { exact: true })
      .fill("Built dashboards.\nCut reporting time by half.");
    await form.getByLabel("Technologies", { exact: true }).fill("SQL, Python");
    await saveButton(form).click();
    await expect(toast(page, "Work experience saved")).toBeVisible();
    await expect(form).toBeHidden();
    const analyst = entry(page, "Data Analyst");
    await expect(analyst).toContainText("Acme");
    await expect(
      analyst.getByText("Mar 2019 to Dec 2023", { exact: true }),
    ).toBeVisible();
    await expect(analyst.getByText("Remote", { exact: true })).toBeVisible();
    await expect(analyst).toContainText("Cut reporting time by half.");
    for (const tag of ["SQL", "Python"])
      await expect(analyst.getByText(tag, { exact: true })).toBeVisible();

    await addButton(page, "Add experience").click();
    await form.getByLabel("Job title *", { exact: true }).fill("Founder");
    await form.getByLabel("Company *", { exact: true }).fill("Startup");
    await form.getByLabel("Start date *", { exact: true }).fill("2025-02");
    const end = form.getByLabel("End date", { exact: true });
    await end.fill("2025-06");
    const current = form.getByLabel("I currently work here", { exact: true });
    await current.check();
    await expect(end).toBeDisabled();
    await expect(end).toHaveValue("");
    await current.uncheck();
    await expect(end).toBeEnabled();
    await expect(end).toHaveValue("");
    await current.check();
    await saveButton(form).click();
    await expect(form).toBeHidden();
    await expect(
      entry(page, "Founder").getByText("Feb 2025 to present", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(entryTitles(page)).toHaveText([
      "Founder",
      "Software Engineer",
      "Data Analyst",
    ]);
    await expect(sectionButton(page, "Work experience")).toHaveText(
      /^Work experience\s*3$/,
    );
    expect(
      await database
        .select({
          jobTitle: workExperiences.jobTitle,
          isCurrent: workExperiences.isCurrent,
          endDate: workExperiences.endDate,
        })
        .from(workExperiences)
        .where(eq(workExperiences.userId, candidate.id)),
    ).toEqual(
      expect.arrayContaining([
        { jobTitle: "Data Analyst", isCurrent: false, endDate: "2023-12" },
        { jobTitle: "Founder", isCurrent: true, endDate: null },
      ]),
    );
  });

  test("required fields and lengths are checked without a request", async ({
    page,
  }) => {
    const posts = recordRequests(page, call("POST", WORK.path));
    await openSection(page, "Work experience");
    await addButton(page, "Add experience").click();
    const form = sheet(page, "Add work experience");
    await saveButton(form).click();
    await expect(
      form.getByText("Job title is required", { exact: true }),
    ).toBeVisible();
    await expect(
      form.getByText("Company is required", { exact: true }),
    ).toBeVisible();
    // An empty month fails the format check; there is no separate message.
    await expect(form.getByText(BAD_MONTH, { exact: true })).toBeVisible();

    for (const label of ["Job title *", "Company *", "Location"])
      await form.getByLabel(label, { exact: true }).fill("a".repeat(301));
    await form.getByLabel("Start date *", { exact: true }).fill("2020-01");
    for (const label of ["What you did", "Technologies"])
      await form.getByLabel(label, { exact: true }).fill("b".repeat(20_001));
    await saveButton(form).click();
    await expect(form.getByText(TOO_LONG, { exact: true })).toHaveCount(3);
    await expect(form.getByText(TOO_LONG_TEXT, { exact: true })).toHaveCount(2);
    expect(posts).toHaveLength(0);
  });

  test("a job title of only spaces is refused like an empty one", async ({
    page,
    database,
    candidate,
  }) => {
    await openSection(page, "Work experience");
    await addButton(page, "Add experience").click();
    const form = sheet(page, "Add work experience");
    await form.getByLabel("Job title *", { exact: true }).fill("   ");
    await form.getByLabel("Company *", { exact: true }).fill("Acme");
    await form.getByLabel("Start date *", { exact: true }).fill("2020-01");
    const created = responseTo(page, "POST", WORK.path);
    await saveButton(form).click();
    expect((await created).status()).toBe(201);
    expectedFail(
      'src/app/api/profile/validators.ts:39: the job title is min(1) without a trim, so "   " is saved with a blank heading',
    );
    expect(
      await database
        .select({ id: workExperiences.id })
        .from(workExperiences)
        .where(eq(workExperiences.userId, candidate.id)),
    ).toHaveLength(1);
  });

  test("a failed save keeps the form and says so", async ({ page }) => {
    await failWrites(page, "work-experiences");
    await openSection(page, "Work experience");
    await addButton(page, "Add experience").click();
    const form = sheet(page, "Add work experience");
    await form.getByLabel("Job title *", { exact: true }).fill("Data Analyst");
    await form.getByLabel("Company *", { exact: true }).fill("Acme");
    await form.getByLabel("Start date *", { exact: true }).fill("2020-01");
    await saveButton(form).click();
    await expect(
      toast(page, "Couldn't save the work experience. Try again."),
    ).toBeVisible();
    await expect(form.getByLabel("Job title *", { exact: true })).toHaveValue(
      "Data Analyst",
    );
  });

  test("Save is disabled while saving and sends one request", async ({
    page,
  }) => {
    const pending = await hold(page, `**${WORK.path}`);
    await openSection(page, "Work experience");
    await addButton(page, "Add experience").click();
    const form = sheet(page, "Add work experience");
    await form.getByLabel("Job title *", { exact: true }).fill("Data Analyst");
    await form.getByLabel("Company *", { exact: true }).fill("Acme");
    await form.getByLabel("Start date *", { exact: true }).fill("2020-01");
    await saveButton(form).click();
    await expect(
      form.getByRole("button", { name: "Saving…", exact: true }),
    ).toBeDisabled();
    expect(pending.requests).toHaveLength(1);
    pending.release();
    await expect(toast(page, "Work experience saved")).toBeVisible();
  });

  test("Cancel and Escape discard what was typed", async ({ page }) => {
    const posts = recordRequests(page, call("POST", WORK.path));
    await openSection(page, "Work experience");
    const form = sheet(page, "Add work experience");
    const title = form.getByLabel("Job title *", { exact: true });
    for (const dismiss of [
      () => form.getByRole("button", { name: "Cancel", exact: true }).click(),
      () => page.keyboard.press("Escape"),
    ]) {
      await addButton(page, "Add experience").click();
      await expect(title).toHaveValue("");
      await title.fill("Discarded");
      await dismiss();
      await expect(form).toBeHidden();
    }
    await expect(entryTitles(page)).toHaveText(["Software Engineer"]);
    expect(posts).toHaveLength(0);
  });

  test("with no roles the empty state holds the only Add button", async ({
    page,
    database,
    candidate,
  }) => {
    await database
      .delete(workExperiences)
      .where(eq(workExperiences.userId, candidate.id));
    await openSection(page, "Work experience");
    await expect(emptyHeading(page, "No work experience yet")).toBeVisible();
    await expect(addButton(page, "Add experience")).toHaveCount(1);
  });
});

test.describe("Edit work experience", { tag: "@experience-edit" }, () => {
  test("a current role is ended and renamed", async ({
    page,
    database,
    candidate,
  }) => {
    await openSection(page, "Work experience");
    const form = await openEdit(
      page,
      SEEDED_EXPERIENCE,
      "Edit work experience",
    );
    await expect(form.getByLabel("Job title *", { exact: true })).toHaveValue(
      "Software Engineer",
    );
    await expect(form.getByLabel("Company *", { exact: true })).toHaveValue(
      "Example Co",
    );
    await expect(form.getByLabel("Start date *", { exact: true })).toHaveValue(
      "2024-01",
    );
    const current = form.getByLabel("I currently work here", { exact: true });
    await expect(current).toBeChecked();
    const end = form.getByLabel("End date", { exact: true });
    await expect(end).toBeDisabled();
    await current.uncheck();
    await end.fill("2025-06");
    await form
      .getByLabel("Job title *", { exact: true })
      .fill("Senior Software Engineer");
    await saveButton(form).click();
    await expect(toast(page, "Changes saved")).toBeVisible();
    await expect(form).toBeHidden();
    const renamed = entry(page, "Senior Software Engineer");
    await expect(
      renamed.getByText("Jan 2024 to Jun 2025", { exact: true }),
    ).toBeVisible();
    const stored = await database
      .select({
        isCurrent: workExperiences.isCurrent,
        endDate: workExperiences.endDate,
        displayOrder: workExperiences.displayOrder,
      })
      .from(workExperiences)
      .where(eq(workExperiences.userId, candidate.id));
    expect(stored).toEqual([
      { isCurrent: false, endDate: "2025-06", displayOrder: 0 },
    ]);
    await page.reload();
    await expect(renamed).toBeVisible();
  });

  test("cleared required fields are refused without a request", async ({
    page,
  }) => {
    const puts = recordRequests(page, call("PUT", /\/work-experiences\/\d+$/));
    await openSection(page, "Work experience");
    const form = await openEdit(
      page,
      SEEDED_EXPERIENCE,
      "Edit work experience",
    );
    await form.getByLabel("Job title *", { exact: true }).fill("");
    await form.getByLabel("Start date *", { exact: true }).fill("");
    await saveButton(form).click();
    await expect(
      form.getByText("Job title is required", { exact: true }),
    ).toBeVisible();
    await expect(form.getByText(BAD_MONTH, { exact: true })).toBeVisible();
    expect(puts).toHaveLength(0);
  });

  test("a failed save or a role deleted elsewhere keeps the form", async ({
    page,
    database,
    candidate,
  }) => {
    await page.route(/\/api\/profile\/work-experiences\/\d+$/, (route) =>
      route.request().method() === "PUT"
        ? route.fulfill({ status: 500, json: { error: "Bad" } })
        : route.fallback(),
    );
    await openSection(page, "Work experience");
    const form = await openEdit(
      page,
      SEEDED_EXPERIENCE,
      "Edit work experience",
    );
    await form.getByLabel("Job title *", { exact: true }).fill("Renamed");
    await saveButton(form).click();
    await expect(
      toast(page, "Couldn't save the changes. Try again."),
    ).toBeVisible();
    await expect(form).toBeVisible();
    await page.unroute(/\/api\/profile\/work-experiences\/\d+$/);

    await database
      .delete(workExperiences)
      .where(eq(workExperiences.userId, candidate.id));
    const updated = responseTo(page, "PUT", /\/work-experiences\/\d+$/);
    await saveButton(form).click();
    const response = await updated;
    expect(response.status()).toBe(404);
    expect(await response.json()).toEqual({ error: WORK.notFound });
    await expect(form).toBeVisible();
  });

  test("a stored start date that is not a month must be fixed before saving", async ({
    page,
    database,
    candidate,
  }) => {
    await database
      .update(workExperiences)
      .set({ startDate: "2024" })
      .where(eq(workExperiences.userId, candidate.id));
    const puts = recordRequests(page, call("PUT", /\/work-experiences\/\d+$/));
    await openSection(page, "Work experience");
    const card = entry(page, "Software Engineer");
    // A month that cannot be read leaves only the open end of the range.
    await expect(card.getByText("present", { exact: true })).toBeVisible();
    const form = await openEdit(
      page,
      SEEDED_EXPERIENCE,
      "Edit work experience",
    );
    await saveButton(form).click();
    await expect(form.getByText(BAD_MONTH, { exact: true })).toBeVisible();
    expect(puts).toHaveLength(0);
  });

  test("Cancel discards the edits", async ({ page }) => {
    const puts = recordRequests(page, call("PUT", /\/work-experiences\/\d+$/));
    await openSection(page, "Work experience");
    const form = await openEdit(
      page,
      SEEDED_EXPERIENCE,
      "Edit work experience",
    );
    await form.getByLabel("Job title *", { exact: true }).fill("Discarded");
    await form.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(form).toBeHidden();
    await openEdit(page, SEEDED_EXPERIENCE, "Edit work experience");
    await expect(form.getByLabel("Job title *", { exact: true })).toHaveValue(
      "Software Engineer",
    );
    expect(puts).toHaveLength(0);
  });

  test("updates are partial, validated, and keep the owner", async ({
    request,
    candidate,
  }) => {
    const [seeded] = await listed(request, WORK.path);
    if (!seeded) throw new Error("The fixture seeds one work experience.");
    const url = `${WORK.path}/${seeded.id}`;
    expect((await request.put(url, { data: {} })).status()).toBe(200);
    for (const data of [
      { startDate: null },
      { endDate: "garbage" },
      { jobTitle: "" },
      { displayOrder: -1 },
    ]) {
      const response = await request.put(url, { data });
      expect(response.status(), JSON.stringify(data)).toBe(400);
      expect((await errorBody(response)).error).toBe("Invalid request data");
    }
    const takeover = await request.put(url, {
      data: { jobTitle: "Renamed", userId: "someone-else", endDate: "" },
    });
    expect(takeover.status()).toBe(200);
    const raw: unknown = await takeover.json();
    expect(
      z
        .object({
          userId: z.string(),
          jobTitle: z.string(),
          endDate: z.string().nullable(),
        })
        .parse(raw),
    ).toEqual({ userId: candidate.id, jobTitle: "Renamed", endDate: null });
  });
});

test.describe("Delete work experience", { tag: "@experience-delete" }, () => {
  test("deleting the only role leaves the empty state", async ({
    page,
    database,
    candidate,
  }) => {
    await openSection(page, "Work experience");
    await confirmDelete(page, SEEDED_EXPERIENCE);
    await expect(toast(page, "Work experience deleted")).toBeVisible();
    await expect(emptyHeading(page, "No work experience yet")).toBeVisible();
    await expect(sectionButton(page, "Work experience")).toHaveText(
      /^Work experience\s*0$/,
    );
    expect(
      await database
        .select({ id: workExperiences.id })
        .from(workExperiences)
        .where(eq(workExperiences.userId, candidate.id)),
    ).toEqual([]);
    await page.reload();
    await expect(emptyHeading(page, "No work experience yet")).toBeVisible();
  });

  test("Cancel and Escape keep the role", async ({ page }) => {
    const deletes = recordRequests(
      page,
      call("DELETE", /\/work-experiences\/\d+$/),
    );
    await openSection(page, "Work experience");
    const dialog = page.getByRole("alertdialog", {
      name: "Delete this work experience?",
    });
    const remove = page.getByRole("button", {
      name: `Delete ${SEEDED_EXPERIENCE}`,
      exact: true,
    });
    await remove.click();
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(dialog).toBeHidden();
    await remove.click();
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(entry(page, "Software Engineer")).toBeVisible();
    expect(deletes).toHaveLength(0);
  });

  test("a failed delete keeps the role and says so", async ({ page }) => {
    await failWrites(page, "work-experiences");
    await openSection(page, "Work experience");
    await confirmDelete(page, SEEDED_EXPERIENCE);
    await expect(
      toast(page, "Couldn't delete the work experience. Try again."),
    ).toBeVisible();
    await expect(entry(page, "Software Engineer")).toBeVisible();
  });

  test("a role already deleted elsewhere leaves the list", async ({
    page,
    database,
    candidate,
  }) => {
    await openSection(page, "Work experience");
    await expect(entry(page, "Software Engineer")).toBeVisible();
    await database
      .delete(workExperiences)
      .where(eq(workExperiences.userId, candidate.id));
    const deleted = responseTo(page, "DELETE", /\/work-experiences\/\d+$/);
    await confirmDelete(page, SEEDED_EXPERIENCE);
    expect((await deleted).status()).toBe(404);
    await expect(
      toast(page, "Couldn't delete the work experience. Try again."),
    ).toBeVisible();
    expectedFail(
      "src/app/dashboard/profile/mutations/use-delete-work-experience.ts:11: only onSuccess refreshes the list, so after a 404 the deleted role stays listed",
    );
    await expect(emptyHeading(page, "No work experience yet")).toBeVisible({
      timeout: 2_000,
    });
  });
});

test.describe(
  "Education: add, edit and delete",
  { tag: "@education-crud" },
  () => {
    test("an entry is added, the seeded one edited, and the new one deleted", async ({
      page,
      database,
      candidate,
    }) => {
      await openSection(page, "Education");
      const seeded = entry(page, "BSc Computer Science");
      await expect(seeded).toContainText("Example University");
      await expect(
        seeded.getByText("Jan 2020 to Dec 2023", { exact: true }),
      ).toBeVisible();

      await addButton(page, "Add education").click();
      const form = sheet(page, "Add education");
      await form
        .getByLabel("Degree *", { exact: true })
        .fill("MSc Data Science");
      await form
        .getByLabel("Field of study", { exact: true })
        .fill("Machine Learning");
      await form.getByLabel("Institution *", { exact: true }).fill("Imperial");
      await form.getByLabel("Location", { exact: true }).fill("London");
      await form.getByLabel("Start date", { exact: true }).fill("2024-09");
      await form.getByLabel("End date", { exact: true }).fill("2025-09");
      await form.getByLabel("GPA", { exact: true }).fill("3.9/4.0");
      await form.getByLabel("Honors", { exact: true }).fill("Distinction");
      await form
        .getByLabel("Relevant coursework", { exact: true })
        .fill("Statistics");
      await saveButton(form).click();
      await expect(toast(page, "Education entry saved")).toBeVisible();
      await expect(form).toBeHidden();
      const added = entry(page, "MSc Data Science, Machine Learning");
      await expect(added).toContainText("Imperial");
      for (const text of ["Sep 2024 to Sep 2025", "London", "GPA 3.9/4.0"])
        await expect(added.getByText(text, { exact: true })).toBeVisible();
      await expect(entryTitles(page)).toHaveText([
        "MSc Data Science, Machine Learning",
        "BSc Computer Science",
      ]);
      expect(
        await database
          .select({
            degree: education.degree,
            relevantCoursework: education.relevantCoursework,
          })
          .from(education)
          .where(eq(education.userId, candidate.id)),
      ).toEqual(
        expect.arrayContaining([
          { degree: "MSc Data Science", relevantCoursework: "Statistics" },
        ]),
      );

      const edit = await openEdit(
        page,
        "BSc Computer Science",
        "Edit education",
      );
      await expect(
        edit.getByLabel("Institution *", { exact: true }),
      ).toHaveValue("Example University");
      await edit
        .getByLabel("Institution *", { exact: true })
        .fill("Example Univ.");
      await saveButton(edit).click();
      await expect(toast(page, "Changes saved")).toBeVisible();
      await expect(entry(page, "BSc Computer Science")).toContainText(
        "Example Univ.",
      );

      await confirmDelete(page, "MSc Data Science");
      await expect(toast(page, "Education entry deleted")).toBeVisible();
      await expect(entryTitles(page)).toHaveText(["BSc Computer Science"]);
    });

    test("an undated entry is listed last", async ({ page, request }) => {
      await seed(request, EDUCATIONS, { degree: "Undated Course" });
      await openSection(page, "Education");
      await expect(entryTitles(page)).toHaveText([
        "BSc Computer Science",
        "Undated Course",
      ]);
      await expect(entry(page, "Undated Course").getByText(/ to /)).toHaveCount(
        0,
      );
    });

    test("missing required fields are named without a request", async ({
      page,
    }) => {
      const posts = recordRequests(page, call("POST", EDUCATIONS.path));
      await openSection(page, "Education");
      await addButton(page, "Add education").click();
      const form = sheet(page, "Add education");
      await saveButton(form).click();
      await expect(
        form.getByText("Degree is required", { exact: true }),
      ).toBeVisible();
      await expect(
        form.getByText("Institution is required", { exact: true }),
      ).toBeVisible();
      expect(posts).toHaveLength(0);
    });

    test("an over-long optional field is explained under it", async ({
      page,
    }) => {
      const posts = recordRequests(page, call("POST", EDUCATIONS.path));
      await openSection(page, "Education");
      await addButton(page, "Add education").click();
      const form = sheet(page, "Add education");
      await form.getByLabel("Degree *", { exact: true }).fill("MSc");
      await form.getByLabel("Institution *", { exact: true }).fill("Imperial");
      await form.getByLabel("GPA", { exact: true }).fill("g".repeat(301));
      await saveButton(form).click();
      await expect(form).toBeVisible();
      // Validation focuses the field it rejected, so the check below is settled.
      await expect(form.getByLabel("GPA", { exact: true })).toBeFocused();
      expect(posts).toHaveLength(0);
      expectedFail(
        "src/app/dashboard/profile/components/sections/education-section.tsx:335: GPA has no FormFieldError, so Save does nothing and says nothing",
      );
      await expect(form.getByText(TOO_LONG, { exact: true })).toBeVisible({
        timeout: 2_000,
      });
    });

    test("a degree of only spaces is refused like an empty one", async ({
      page,
      database,
      candidate,
    }) => {
      await openSection(page, "Education");
      await addButton(page, "Add education").click();
      const form = sheet(page, "Add education");
      await form.getByLabel("Degree *", { exact: true }).fill("   ");
      await form.getByLabel("Institution *", { exact: true }).fill("Imperial");
      const created = responseTo(page, "POST", EDUCATIONS.path);
      await saveButton(form).click();
      expect((await created).status()).toBe(201);
      expectedFail(
        'src/app/api/profile/validators.ts:68: the degree is min(1) without a trim, so "   " is saved with a blank heading',
      );
      expect(
        await database
          .select({ id: education.id })
          .from(education)
          .where(eq(education.userId, candidate.id)),
      ).toHaveLength(1);
    });

    test("failed saves and deletes keep the form or the row and say so", async ({
      page,
    }) => {
      await failWrites(page, "education");
      await openSection(page, "Education");
      await addButton(page, "Add education").click();
      const form = sheet(page, "Add education");
      await form.getByLabel("Degree *", { exact: true }).fill("MSc");
      await form.getByLabel("Institution *", { exact: true }).fill("Imperial");
      await saveButton(form).click();
      await expect(
        toast(page, "Couldn't save the entry. Try again."),
      ).toBeVisible();
      await expect(form).toBeVisible();
      await form.getByRole("button", { name: "Cancel", exact: true }).click();
      await expect(form).toBeHidden();

      const edit = await openEdit(
        page,
        "BSc Computer Science",
        "Edit education",
      );
      await edit.getByLabel("Degree *", { exact: true }).fill("Renamed");
      await saveButton(edit).click();
      await expect(
        toast(page, "Couldn't save the changes. Try again."),
      ).toBeVisible();
      await edit.getByRole("button", { name: "Cancel", exact: true }).click();
      await expect(edit).toBeHidden();

      await confirmDelete(page, "BSc Computer Science");
      await expect(
        toast(page, "Couldn't delete the entry. Try again."),
      ).toBeVisible();
      await expect(entry(page, "BSc Computer Science")).toBeVisible();
    });

    test("Cancel on the delete confirmation keeps the entry", async ({
      page,
    }) => {
      await openSection(page, "Education");
      await page
        .getByRole("button", {
          name: "Delete BSc Computer Science",
          exact: true,
        })
        .click();
      const dialog = page.getByRole("alertdialog", {
        name: "Delete this education entry?",
      });
      await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
      await expect(dialog).toBeHidden();
      await expect(entry(page, "BSc Computer Science")).toBeVisible();
    });

    test("Save is disabled while saving and sends one request", async ({
      page,
    }) => {
      const pending = await hold(page, `**${EDUCATIONS.path}`);
      await openSection(page, "Education");
      await addButton(page, "Add education").click();
      const form = sheet(page, "Add education");
      await form.getByLabel("Degree *", { exact: true }).fill("MSc");
      await form.getByLabel("Institution *", { exact: true }).fill("Imperial");
      await saveButton(form).click();
      await expect(
        form.getByRole("button", { name: "Saving…", exact: true }),
      ).toBeDisabled();
      expect(pending.requests).toHaveLength(1);
      pending.release();
      await expect(toast(page, "Education entry saved")).toBeVisible();
    });

    test("with no entries the empty state holds the only Add button", async ({
      page,
      database,
      candidate,
    }) => {
      await database
        .delete(education)
        .where(eq(education.userId, candidate.id));
      await openSection(page, "Education");
      await expect(emptyHeading(page, "No education yet")).toBeVisible();
      await expect(addButton(page, "Add education")).toHaveCount(1);
    });
  },
);

test.describe("Skills: add, edit and delete", { tag: "@skills-crud" }, () => {
  test("a skill is added to its category, moved to another, and deleted", async ({
    page,
    database,
    candidate,
  }) => {
    await openSection(page, "Skills");
    await expect(
      skillGroup(page, "Technical").getByRole("button", {
        name: "Edit TypeScript",
        exact: true,
      }),
    ).toBeVisible();

    await addButton(page, "Add skill").click();
    const form = sheet(page, "Add skill");
    await form.getByLabel("Skill name *", { exact: true }).fill("Spanish");
    await chooseOption(page, "Category *", "Languages");
    await chooseOption(page, "Proficiency", "Advanced");
    await form.getByLabel("Years of experience", { exact: true }).fill("3");
    await saveButton(form).click();
    await expect(toast(page, "Skill saved")).toBeVisible();
    await expect(form).toBeHidden();
    const chip = page.getByRole("button", {
      name: "Edit Spanish",
      exact: true,
    });
    await expect(
      skillGroup(page, "Languages").getByRole("button", {
        name: "Edit Spanish",
        exact: true,
      }),
    ).toHaveText(/Spanish\s*Advanced, 3 yr/);

    await chip.click();
    const edit = sheet(page, "Edit skill");
    await chooseOption(page, "Category *", "Soft skills");
    await saveButton(edit).click();
    await expect(toast(page, "Changes saved")).toBeVisible();
    await expect(
      skillGroup(page, "Soft skills").getByRole("button", {
        name: "Edit Spanish",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Languages", level: 3 }),
    ).toHaveCount(0);

    await confirmDelete(page, "Spanish");
    await expect(toast(page, "Skill deleted")).toBeVisible();
    await expect(chip).toHaveCount(0);
    await expect(sectionButton(page, "Skills")).toHaveText(/^Skills\s*1$/);
    expect(
      await database
        .select({ name: skills.name })
        .from(skills)
        .where(eq(skills.userId, candidate.id)),
    ).toEqual([{ name: "TypeScript" }]);
  });

  test("a missing or over-long name is refused without a request", async ({
    page,
  }) => {
    const posts = recordRequests(page, call("POST", SKILLS.path));
    await openSection(page, "Skills");
    await addButton(page, "Add skill").click();
    const form = sheet(page, "Add skill");
    await chooseOption(page, "Category *", "Technical");
    await saveButton(form).click();
    await expect(
      form.getByText("Skill name is required", { exact: true }),
    ).toBeVisible();
    await form
      .getByLabel("Skill name *", { exact: true })
      .fill("s".repeat(301));
    await saveButton(form).click();
    await expect(form.getByText(TOO_LONG, { exact: true })).toBeVisible();
    expect(posts).toHaveLength(0);
  });

  test("negative or fractional years are stopped by the browser", async ({
    page,
  }) => {
    const posts = recordRequests(page, call("POST", SKILLS.path));
    await openSection(page, "Skills");
    await addButton(page, "Add skill").click();
    const form = sheet(page, "Add skill");
    await form.getByLabel("Skill name *", { exact: true }).fill("Go");
    await chooseOption(page, "Category *", "Technical");
    const years = form.getByLabel("Years of experience", { exact: true });
    for (const value of ["-1", "2.5"]) {
      await years.fill(value);
      await saveButton(form).click();
      expect(await isValid(years)).toBe(false);
    }
    expect(posts).toHaveLength(0);
  });

  test("zero years without a level shows only the name", async ({
    page,
    request,
  }) => {
    await seed(request, SKILLS, { yearsOfExperience: 0 });
    await openSection(page, "Skills");
    const chip = page.getByRole("button", { name: "Edit Go", exact: true });
    await expect(chip).toBeVisible();
    expectedFail(
      'src/app/dashboard/profile/components/sections/skills-section.tsx:222: (proficiencyLevel || yearsOfExperience) && … renders the 0 itself, so the chip reads "Go0"',
    );
    await expect(chip).toHaveText("Go", { timeout: 2_000 });
  });

  test("cleared years are saved as none", async ({
    page,
    request,
    database,
    candidate,
  }) => {
    await seed(request, SKILLS, { yearsOfExperience: 3 });
    await openSection(page, "Skills");
    await page.getByRole("button", { name: "Edit Go", exact: true }).click();
    const form = sheet(page, "Edit skill");
    await form.getByLabel("Years of experience", { exact: true }).fill("");
    await saveButton(form).click();
    await expect(toast(page, "Changes saved")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Edit Go", exact: true }),
    ).toHaveText("Go");
    expect(
      await database
        .select({ name: skills.name, years: skills.yearsOfExperience })
        .from(skills)
        .where(eq(skills.userId, candidate.id)),
    ).toEqual(expect.arrayContaining([{ name: "Go", years: null }]));
  });

  test("failed saves and deletes keep the form or the chip and say so", async ({
    page,
  }) => {
    await failWrites(page, "skills");
    await openSection(page, "Skills");
    await addButton(page, "Add skill").click();
    const form = sheet(page, "Add skill");
    await form.getByLabel("Skill name *", { exact: true }).fill("Go");
    await chooseOption(page, "Category *", "Technical");
    await saveButton(form).click();
    await expect(
      toast(page, "Couldn't save the skill. Try again."),
    ).toBeVisible();
    await expect(form).toBeVisible();
    await form.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(form).toBeHidden();

    await page
      .getByRole("button", { name: "Edit TypeScript", exact: true })
      .click();
    const edit = sheet(page, "Edit skill");
    await edit.getByLabel("Skill name *", { exact: true }).fill("Renamed");
    await saveButton(edit).click();
    await expect(
      toast(page, "Couldn't save the changes. Try again."),
    ).toBeVisible();
    await edit.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(edit).toBeHidden();

    await confirmDelete(page, "TypeScript");
    await expect(
      toast(page, "Couldn't delete the skill. Try again."),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Edit TypeScript", exact: true }),
    ).toBeVisible();
  });

  test("a skill deleted elsewhere cannot be saved", async ({
    page,
    database,
    candidate,
  }) => {
    await openSection(page, "Skills");
    await page
      .getByRole("button", { name: "Edit TypeScript", exact: true })
      .click();
    const edit = sheet(page, "Edit skill");
    await database.delete(skills).where(eq(skills.userId, candidate.id));
    await edit.getByLabel("Skill name *", { exact: true }).fill("Renamed");
    const updated = responseTo(page, "PUT", /\/skills\/\d+$/);
    await saveButton(edit).click();
    const response = await updated;
    expect(response.status()).toBe(404);
    expect(await response.json()).toEqual({ error: SKILLS.notFound });
    await expect(
      toast(page, "Couldn't save the changes. Try again."),
    ).toBeVisible();
  });

  test("Cancel on the delete confirmation keeps the skill", async ({
    page,
  }) => {
    await openSection(page, "Skills");
    await page
      .getByRole("button", { name: "Delete TypeScript", exact: true })
      .click();
    const dialog = page.getByRole("alertdialog", {
      name: "Delete this skill?",
    });
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(
      page.getByRole("button", { name: "Edit TypeScript", exact: true }),
    ).toBeVisible();
  });

  test("with no skills the empty state holds the only Add button", async ({
    page,
    database,
    candidate,
  }) => {
    await database.delete(skills).where(eq(skills.userId, candidate.id));
    await openSection(page, "Skills");
    await expect(emptyHeading(page, "No skills yet")).toBeVisible();
    await expect(addButton(page, "Add skill")).toHaveCount(1);
  });

  test("the list filters by category without validating it", async ({
    request,
  }) => {
    expect(
      (await listed(request, `${SKILLS.path}?category=technical`)).length,
    ).toBe(1);
    expect(await listed(request, `${SKILLS.path}?category=bogus`)).toEqual([]);
  });
});

for (const kind of KINDS) {
  test.describe(`${kind.label} API contract`, { tag: kind.tag }, () => {
    test("bodies, malformed JSON and list queries are validated", async ({
      request,
    }) => {
      for (const data of kind.invalid) {
        const response = await request.post(kind.path, { data });
        expect(response.status(), JSON.stringify(data).slice(0, 80)).toBe(400);
        expect((await errorBody(response)).error).toBe("Invalid request data");
      }
      const malformed = await request.post(kind.path, MALFORMED_JSON);
      expect(malformed.status()).toBe(400);
      expect(await malformed.json()).toEqual({
        error: "Request body must be valid JSON",
      });
      for (const query of [
        "limit=0",
        "limit=101",
        "limit=abc",
        "orderBy=foo",
        "order=up",
      ]) {
        const response = await request.get(`${kind.path}?${query}`);
        expect(response.status(), query).toBe(400);
      }
    });

    test("a number past PostgreSQL's integer range is a bad request", async ({
      request,
    }) => {
      const response = await request.post(kind.path, {
        data: { ...kind.body, displayOrder: 3_000_000_000 },
      });
      // A 500 proves the schema let the value through to the database.
      expect(response.status()).toBe(500);
      expectedFail(
        `src/app/api/profile/validators.ts:${kind.displayOrderLine}: displayOrder is int().min(0) with no upper bound, so 3000000000 overflows the integer column and returns 500`,
      );
      expect(response.status()).toBe(400);
    });
  });

  test.describe(
    `${kind.label} ids, ownership and sessions`,
    { tag: "@item-api-guards" },
    () => {
      test("an owned row is returned, and bad or unknown ids are refused", async ({
        request,
        candidate,
      }) => {
        const [own] = await listed(request, kind.path);
        if (!own) throw new Error("The fixture seeds one row of each kind.");
        const got = await request.get(`${kind.path}/${own.id}`);
        expect(got.status()).toBe(200);
        const raw: unknown = await got.json();
        expect(z.object({ userId: z.string() }).parse(raw).userId).toBe(
          candidate.id,
        );
        for (const bad of ["abc", "12abc", "-1", "1.5", "99999999999"]) {
          const url = `${kind.path}/${bad}`;
          for (const response of [
            await request.get(url),
            await request.put(url, { data: {} }),
            await request.delete(url),
          ]) {
            expect(response.status(), url).toBe(400);
            expect(await response.json()).toEqual({ error: "Invalid ID" });
          }
        }
        const unknown = await request.get(`${kind.path}/2147483647`);
        expect(unknown.status()).toBe(404);
        expect(await unknown.json()).toEqual({ error: kind.notFound });
      });

      test("another account's rows cannot be read, changed or deleted", async ({
        request,
        createCandidate,
        playwright,
        extraHTTPHeaders,
      }) => {
        const other = await createCandidate();
        const otherRequest = await playwright.request.newContext({
          baseURL: BASE_URL,
          storageState: other.storageState,
          extraHTTPHeaders,
        });
        try {
          const [theirs] = await listed(otherRequest, kind.path);
          if (!theirs)
            throw new Error("The fixture seeds one row of each kind.");
          const url = `${kind.path}/${theirs.id}`;
          for (const response of [
            await request.get(url),
            await request.put(url, { data: { displayOrder: 5 } }),
            await request.delete(url),
          ]) {
            expect(response.status()).toBe(404);
            expect(await response.json()).toEqual({ error: kind.notFound });
          }
          expect(await listed(otherRequest, kind.path)).toEqual([theirs]);
        } finally {
          await otherRequest.dispose();
        }
      });

      test("every route checks the session before anything else", async ({
        playwright,
        extraHTTPHeaders,
      }) => {
        const anonymous = await anonymousRequest(playwright, extraHTTPHeaders);
        try {
          for (const response of [
            await anonymous.get(kind.path),
            await anonymous.post(kind.path, { data: kind.body }),
            await anonymous.get(`${kind.path}/abc`),
            await anonymous.put(`${kind.path}/abc`, MALFORMED_JSON),
            await anonymous.delete(`${kind.path}/1`),
            await anonymous.put(`${kind.path}/order`, MALFORMED_JSON),
          ]) {
            expect(response.status(), response.url()).toBe(401);
            expect(await response.json()).toEqual({ error: "Unauthorized" });
          }
        } finally {
          await anonymous.dispose();
        }
      });
    },
  );

  test.describe(`${kind.label} order API`, { tag: "@reorder-api" }, () => {
    test("the order endpoint wins over the date order", async ({ request }) => {
      const [seeded] = await listed(request, kind.path);
      if (!seeded) throw new Error("The fixture seeds one row of each kind.");
      const added = await seed(request, kind);
      const response = await request.put(`${kind.path}/order`, {
        data: {
          items: [
            { id: seeded.id, displayOrder: 1 },
            { id: added, displayOrder: 0 },
          ],
        },
      });
      expect(response.status()).toBe(200);
      expect(await response.json()).toEqual({ success: true });
      expect((await listed(request, kind.path)).map((row) => row.id)).toEqual([
        added,
        seeded.id,
      ]);
    });

    test("invalid order lists are refused, and other accounts' ids ignored", async ({
      request,
      createCandidate,
      playwright,
      extraHTTPHeaders,
    }) => {
      const [own] = await listed(request, kind.path);
      if (!own) throw new Error("The fixture seeds one row of each kind.");
      for (const data of [
        { items: [] },
        {
          items: Array.from({ length: 501 }, () => ({
            id: own.id,
            displayOrder: 0,
          })),
        },
        { items: [{ id: own.id, displayOrder: -1 }] },
        { items: [{ id: own.id, displayOrder: 1.5 }] },
        { items: [{ id: "abc", displayOrder: 0 }] },
        {},
      ]) {
        const response = await request.put(`${kind.path}/order`, { data });
        expect(response.status()).toBe(400);
        expect((await errorBody(response)).error).toBe("Invalid request data");
      }
      const malformed = await request.put(`${kind.path}/order`, MALFORMED_JSON);
      expect(malformed.status()).toBe(400);

      const other = await createCandidate();
      const otherRequest = await playwright.request.newContext({
        baseURL: BASE_URL,
        storageState: other.storageState,
        extraHTTPHeaders,
      });
      try {
        const [theirs] = await listed(otherRequest, kind.path);
        if (!theirs) throw new Error("The fixture seeds one row of each kind.");
        const response = await request.put(`${kind.path}/order`, {
          data: { items: [{ id: theirs.id, displayOrder: 9 }] },
        });
        expect(response.status()).toBe(200);
        expect(await listed(otherRequest, kind.path)).toEqual([theirs]);
      } finally {
        await otherRequest.dispose();
      }
    });
  });
}

test.describe(
  "Imported entries waiting in Work experience, Education and Skills",
  { tag: "@pending-import-rows" },
  () => {
    const RESUME = {
      name: "resume.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("Alex Example\nStaff Engineer, Imported Labs\n"),
    };

    async function importDrafts(page: Page, ai: FakeAI) {
      ai.reply(
        importReply({
          workExperiences: [
            {
              jobTitle: "Staff Engineer",
              company: "Imported Labs",
              location: "Remote",
              startDate: "2021-03",
              endDate: "2023-06",
              isCurrent: false,
              description: "Led the billing platform rewrite.",
              technologies: ["Go"],
            },
          ],
          education: [
            {
              degree: "MSc Data Science",
              fieldOfStudy: null,
              institution: "Imperial",
              location: null,
              startDate: null,
              endDate: null,
              gpa: null,
              honors: null,
              relevantCoursework: [],
            },
          ],
          skills: [
            {
              name: "Go",
              category: "technical",
              proficiencyLevel: null,
              yearsOfExperience: null,
            },
            {
              name: "Kafka",
              category: "tool",
              proficiencyLevel: null,
              yearsOfExperience: null,
            },
          ],
        }),
      );
      await page.goto("/dashboard/profile");
      await importResume(page, RESUME);
      await expect(
        toast(page, "Resume imported. Review each section before saving."),
      ).toBeVisible({ timeout: 30_000 });
    }

    test("drafts are edited, saved and discarded where they belong", async ({
      page,
      ai,
    }) => {
      await importDrafts(page, ai);
      // The index counts drafts until they are saved or discarded.
      await expect(sectionButton(page, "Skills")).toHaveText(
        /^Skills\s*has imported items to review,\s*3$/,
      );
      await sectionButton(page, "Work experience").click();
      const main = page.getByRole("main");
      await expect(
        main.getByText("1 work experience from your imported resume", {
          exact: true,
        }),
      ).toBeVisible();

      await main
        .getByRole("button", {
          name: "Edit Staff Engineer at Imported Labs before saving",
          exact: true,
        })
        .click();
      const title = main.getByLabel("Job title", { exact: true });
      await title.fill("");
      await main
        .getByRole("button", { name: "Update draft", exact: true })
        .click();
      await expect(
        main.getByText("Job title is required", { exact: true }),
      ).toBeVisible();
      await main.getByRole("button", { name: "Cancel", exact: true }).click();
      await expect(
        main.getByRole("button", {
          name: "Edit Staff Engineer at Imported Labs before saving",
          exact: true,
        }),
      ).toBeVisible();

      await main
        .getByRole("button", {
          name: "Edit Staff Engineer at Imported Labs before saving",
          exact: true,
        })
        .click();
      await title.fill("Principal Engineer");
      await main
        .getByRole("button", { name: "Update draft", exact: true })
        .click();
      await expect(toast(page, "Draft updated")).toBeVisible();
      await main.getByRole("button", { name: "Save", exact: true }).click();
      await expect(toast(page, "Work experience saved")).toBeVisible();
      await expect(
        main.getByText("1 work experience from your imported resume"),
      ).toHaveCount(0);
      await expect(entry(page, "Principal Engineer")).toContainText(
        "Imported Labs",
      );

      await sectionButton(page, "Skills").click();
      const kafkaPosts = recordRequests(page, call("POST", SKILLS.path));
      await main.getByRole("button", { name: "Save Go", exact: true }).click();
      await expect(toast(page, "Skill saved")).toBeVisible();
      await expect(
        skillGroup(page, "Technical").getByRole("button", {
          name: "Edit Go",
          exact: true,
        }),
      ).toBeVisible();
      const before = kafkaPosts.length;
      await main
        .getByRole("button", { name: "Discard Kafka", exact: true })
        .click();
      await expect(main.getByText("Kafka", { exact: true })).toHaveCount(0);
      expect(kafkaPosts).toHaveLength(before);

      await sectionButton(page, "Education").click();
      await main
        .getByRole("button", { name: "Discard MSc Data Science", exact: true })
        .click();
      await expect(entryTitles(page)).toHaveText(["BSc Computer Science"]);
      await expect(sectionButton(page, "Education")).toHaveText(
        /^Education\s*1$/,
      );
    });

    test("a draft the server refuses stays waiting", async ({ page, ai }) => {
      await importDrafts(page, ai);
      for (const section of ["work-experiences", "education", "skills"])
        await failWrites(page, section);
      const main = page.getByRole("main");

      await sectionButton(page, "Work experience").click();
      await main.getByRole("button", { name: "Save", exact: true }).click();
      await expect(
        toast(page, "Couldn't save the work experience. Try again."),
      ).toBeVisible();
      await expect(
        main.getByText("1 work experience from your imported resume", {
          exact: true,
        }),
      ).toBeVisible();

      await sectionButton(page, "Education").click();
      await main.getByRole("button", { name: "Save", exact: true }).click();
      await expect(
        toast(page, "Couldn't save the entry. Try again."),
      ).toBeVisible();

      await sectionButton(page, "Skills").click();
      await main.getByRole("button", { name: "Save Go", exact: true }).click();
      await expect(
        toast(page, "Couldn't save the skill. Try again."),
      ).toBeVisible();
      await expect(
        main.getByRole("button", { name: "Save Go", exact: true }),
      ).toBeEnabled();
    });
  },
);
