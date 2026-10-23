import type { APIRequestContext, Page } from "@playwright/test";
import { eq } from "drizzle-orm";
import {
  achievements,
  certifications,
  projects,
  references,
  resumeUploads,
} from "../../src/lib/db/schema";
import { resumeUploadsResponseSchema } from "../../src/app/api/profile/resume-uploads/validators";
import {
  buildDocx,
  buildPdf,
} from "../../src/app/api/profile/resume-import/document-fixtures.test-helper";
import { test, expect, type Database } from "./support/fixtures";
import { userPrompt, type FakeAI } from "./support/fake-ai";
import {
  anonymousRequest,
  call,
  entry,
  errorBody,
  expectedFail,
  hold,
  importReply,
  importResume,
  recordRequests,
  responseTo,
  sectionButton,
} from "./support/helpers";

const IMPORT = "/api/profile/resume-import";
const UPLOADS = "/api/profile/resume-uploads";
const IMPORTED = "Resume imported. Review each section before saving.";
const RATE_LIMITED =
  "You're sending requests too quickly. Wait a minute, then try again.";
const TXT = "text/plain";
const PDF = "application/pdf";
const DOCX =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const RESUME_TEXT =
  "Alex Example\nalex@example.test\n+65 6123 4567\nSoftware Engineer at Example Co\n";

const PROJECT = {
  title: "Route Planner",
  description: "Line one\nLine two",
  technologies: ["React", "Node"],
  projectUrl: "example.test/app",
  githubUrl: null,
  startDate: "Jan 2021",
  endDate: "Present",
  isOngoing: null,
};
const CERTIFICATION = {
  name: "CKA",
  issuingOrganization: "CNCF",
  issueDate: "2023-05",
  expirationDate: "2026-05",
  credentialId: "X1",
  credentialUrl: "https://example.test/c",
};
const ACHIEVEMENT = {
  title: "Hackathon winner",
  description: null,
  organization: "Example Org",
  date: "2024-03",
  url: null,
};
const REFERENCE = {
  name: "Jordan Lee",
  title: "Manager",
  company: "Example Co",
  email: "jordan@example.test",
  phone: "+65 6000 0000",
  relationship: "Manager",
};
const ENTRIES = {
  projects: [PROJECT],
  certifications: [CERTIFICATION],
  achievements: [ACHIEVEMENT],
  references: [REFERENCE],
};

interface UploadFile {
  name: string;
  mimeType: string;
  buffer: Buffer;
}

function txt(text = RESUME_TEXT, name = "resume.txt"): UploadFile {
  return { name, mimeType: TXT, buffer: Buffer.from(text) };
}

/** A PDF with enough text that it is not treated as a scan. */
function textPdf(): UploadFile {
  return {
    name: "resume.pdf",
    mimeType: PDF,
    buffer: buildPdf([
      {
        lines: [
          "Alex Example",
          "alex@example.test",
          "Software Engineer at Example Co building reliable applications",
          "Reduced processing time by twenty percent across the platform",
        ],
      },
    ]),
  };
}

function toast(page: Page, text: string) {
  return page.getByText(text, { exact: true });
}

function banner(page: Page) {
  return page.getByRole("status").filter({ hasText: "waiting for review" });
}

async function importWith(
  page: Page,
  ai: FakeAI,
  reply: Record<string, unknown>,
  file: UploadFile = txt(),
) {
  ai.reply(importReply(reply));
  await page.goto("/dashboard/profile");
  await importResume(page, file);
  await expect(toast(page, IMPORTED)).toBeVisible({ timeout: 30_000 });
}

async function uploads(request: APIRequestContext) {
  const response = await request.get(UPLOADS);
  expect(response.status()).toBe(200);
  const raw: unknown = await response.json();
  return resumeUploadsResponseSchema.parse(raw);
}

async function rowCount(database: Database, userId: string) {
  const counts = await Promise.all([
    database.select().from(projects).where(eq(projects.userId, userId)),
    database
      .select()
      .from(certifications)
      .where(eq(certifications.userId, userId)),
    database.select().from(achievements).where(eq(achievements.userId, userId)),
    database.select().from(references).where(eq(references.userId, userId)),
  ]);
  return counts.map((rows) => rows.length);
}

/** Posts a file straight to the import route, counting toward its limit. */
function postImport(request: APIRequestContext, file: UploadFile) {
  return request.post(IMPORT, { multipart: { file } });
}

test.describe(
  "Import a resume through the real route",
  { tag: "@resume-import-real" },
  () => {
    test("a resume the AI reads fills every section for review, and its original is kept", async ({
      page,
      request,
      ai,
    }) => {
      await importWith(page, ai, {
        workExperiences: [
          {
            jobTitle: "Staff Engineer",
            company: "Imported Labs",
            location: null,
            startDate: "2021-03",
            endDate: "2023-06",
            isCurrent: false,
            description: null,
            technologies: [],
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
        ],
        ...ENTRIES,
      });
      const [sent] = ai.requests();
      expect(sent ? userPrompt(sent) : undefined).toContain(
        "Software Engineer at Example Co",
      );
      await expect(banner(page)).toContainText(
        "7 imported items waiting for review",
      );
      await expect(banner(page)).toContainText(
        "1 experience, 1 education, 1 skill, 1 project, 1 certification, 1 achievement, 1 reference",
      );
      for (const label of [
        "Work experience",
        "Education",
        "Skills",
        "Projects",
        "Certifications",
        "Achievements",
        "References",
      ])
        await expect(sectionButton(page, label)).toContainText(
          "has imported items to review,",
        );

      await sectionButton(page, "Imported files").click();
      const main = page.getByRole("main");
      await expect(
        main.getByRole("heading", { name: "resume.txt", level: 3 }),
      ).toBeVisible();
      await expect(
        main.getByText(`${Buffer.byteLength(RESUME_TEXT)} bytes`, {
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        main.getByText(/^Imported [A-Z][a-z]{2} \d{1,2}, \d{4}$/),
      ).toBeVisible();
      expect((await uploads(request)).files).toMatchObject([
        {
          fileName: "resume.txt",
          mimeType: TXT,
          sizeBytes: Buffer.byteLength(RESUME_TEXT),
        },
      ]);
    });

    test("PDF and DOCX resumes are read, and their text reaches the model", async ({
      page,
      request,
      ai,
    }) => {
      await importWith(page, ai, {}, textPdf());
      const docx = {
        name: "resume.docx",
        mimeType: DOCX,
        buffer: buildDocx(["Alex Example", "Platform engineer from a DOCX"]),
      };
      ai.reply(importReply());
      await importResume(page, docx);
      await expect.poll(() => ai.requests().length).toBe(2);
      const [fromPdf, fromDocx] = ai.requests();
      expect(fromPdf ? userPrompt(fromPdf) : undefined).toContain(
        "Reduced processing time by twenty percent",
      );
      expect(fromDocx ? userPrompt(fromDocx) : undefined).toContain(
        "Platform engineer from a DOCX",
      );
      await expect
        .poll(async () =>
          (await uploads(request)).files.map((file) => file.mimeType).sort(),
        )
        .toEqual([PDF, DOCX].sort());
    });

    test("a PDF named as text is still read as a PDF", async ({
      page,
      request,
      ai,
    }) => {
      const pdf = textPdf();
      await importWith(
        page,
        ai,
        {},
        {
          name: "resume.txt",
          mimeType: TXT,
          buffer: pdf.buffer,
        },
      );
      const [sent] = ai.requests();
      expect(sent ? userPrompt(sent) : undefined).toContain(
        "Reduced processing time by twenty percent",
      );
      expect((await uploads(request)).files).toMatchObject([
        { fileName: "resume.txt", mimeType: TXT },
      ]);
    });

    test("when the AI fails, basic extraction is used and says so", async ({
      page,
    }) => {
      // Unscripted, the fake provider refuses the call.
      await page.goto("/dashboard/profile");
      await importResume(page, txt("Alex Example\nalex@example.test\n"));
      await expect(toast(page, IMPORTED)).toBeVisible({ timeout: 30_000 });
      const notice = page
        .getByRole("main")
        .getByText("Check the imported details", { exact: true })
        .locator("..");
      await expect(notice).toBeVisible();
      for (const warning of [
        "AI parsing failed. Populating fields using basic text extraction—please review and edit.",
        "Resume import used heuristic extraction. Double-check the populated fields before saving.",
        "Phone number was not detected.",
      ])
        await expect(notice.getByText(warning, { exact: true })).toBeVisible();
      await expect(banner(page)).toHaveCount(0);
    });

    test("a document longer than a resume is cut short with a warning", async ({
      page,
      ai,
    }) => {
      await importWith(
        page,
        ai,
        {},
        txt(`${RESUME_TEXT}${"Experience line. ".repeat(4_000)}`),
      );
      await expect(
        page
          .getByRole("main")
          .getByText(
            "This document is longer than a resume, so only its first part was read.",
            { exact: true },
          ),
      ).toBeVisible();
    });

    test("an imported email without a phone number is flagged", async ({
      page,
      ai,
    }) => {
      await importWith(page, ai, {
        firstName: "Alex",
        lastName: "Example",
        email: "alex@example.test",
      });
      await expect(
        page
          .getByRole("main")
          .getByText("Phone number was not detected.", { exact: true }),
      ).toBeVisible();
    });
  },
);

test.describe(
  "Import rejections, limits and failures",
  { tag: "@resume-import-rejections" },
  () => {
    test("a file over 8 MB is refused before it is sent", async ({ page }) => {
      const imports = recordRequests(page, call("POST", IMPORT));
      await page.goto("/dashboard/profile");
      await importResume(page, {
        name: "big.txt",
        mimeType: TXT,
        buffer: Buffer.alloc(8 * 1024 * 1024 + 1, "a"),
      });
      await expect(
        toast(page, "That file is over 8 MB. Choose a smaller one."),
      ).toBeVisible();
      expect(imports).toHaveLength(0);
    });

    test("an empty file is refused, nothing is kept, and Import works again", async ({
      page,
      request,
    }) => {
      await page.goto("/dashboard/profile");
      const refused = responseTo(page, "POST", IMPORT);
      await importResume(page, txt(""));
      expect((await refused).status()).toBe(400);
      await expect(
        toast(page, "Uploaded file is empty. Please choose a valid resume."),
      ).toBeVisible();
      await expect(banner(page)).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: "Import resume", exact: true }),
      ).toBeEnabled();
      expect((await uploads(request)).files).toEqual([]);
    });

    test("files that are too big, blank or not documents are refused", async ({
      request,
      ai,
    }) => {
      for (const [file, status, message] of [
        [
          txt("a".repeat(8 * 1024 * 1024 + 1), "big.txt"),
          413,
          "Resume file is too large. Please upload a file under 8MB.",
        ],
        [
          txt("   \n "),
          400,
          "Uploaded text file did not contain readable content.",
        ],
        [
          {
            name: "image.png",
            mimeType: "image/png",
            buffer: Buffer.from("x"),
          },
          415,
          "Unsupported file type. Upload a PDF, DOCX or TXT file.",
        ],
        [
          { name: "fake.pdf", mimeType: PDF, buffer: Buffer.from("hello") },
          415,
          "This file is not a PDF, DOCX or TXT document. Upload a PDF, DOCX or TXT file.",
        ],
        [
          {
            name: "old.doc",
            mimeType: "application/octet-stream",
            buffer: Buffer.from([
              0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0,
            ]),
          },
          415,
          "Legacy .doc files are not supported. Save the document as DOCX or PDF, then upload it again.",
        ],
      ] as const) {
        const response = await postImport(request, file);
        expect(response.status(), file.name).toBe(status);
        expect(await response.json()).toEqual({ error: message });
      }
      expect(ai.requests()).toHaveLength(0);
    });

    test("documents that cannot be read are refused", async ({
      request,
      ai,
    }) => {
      for (const [file, message] of [
        [
          {
            name: "broken.pdf",
            mimeType: PDF,
            buffer: Buffer.from("%PDF-1.4\nnot really a pdf"),
          },
          "This PDF could not be read. Export it again, or upload a DOCX or TXT file.",
        ],
        [
          {
            name: "scan.pdf",
            mimeType: PDF,
            buffer: buildPdf([{ lines: [] }]),
          },
          "This PDF has no selectable text and OCR is not set up on this server. Upload a text-based PDF, DOCX or TXT file.",
        ],
        [
          {
            name: "broken.docx",
            mimeType: DOCX,
            buffer: Buffer.from([0x50, 0x4b, 0x03, 0x04, 1, 2, 3, 4]),
          },
          "This DOCX file could not be read. Save it again from your editor, or upload a PDF.",
        ],
        [
          { name: "empty.docx", mimeType: DOCX, buffer: buildDocx([]) },
          "No readable text was found in this file. Upload a PDF or TXT file instead.",
        ],
      ] as const) {
        const response = await postImport(request, file);
        expect(response.status(), file.name).toBe(422);
        expect(await response.json()).toEqual({ error: message });
      }
      expect(ai.requests()).toHaveLength(0);
    });

    test("a request without a file, or without a session, is refused", async ({
      request,
      playwright,
      extraHTTPHeaders,
    }) => {
      const noFile = await request.post(IMPORT, { multipart: { other: "x" } });
      expect(noFile.status()).toBe(400);
      expect(await noFile.json()).toEqual({
        error: "No resume file uploaded. Please select a file to import.",
      });
      const json = await request.post(IMPORT, { data: { file: "x" } });
      expect(json.status()).toBe(400);
      expect(await json.json()).toEqual({
        error: "Invalid form data. Please try again.",
      });
      const anonymous = await anonymousRequest(playwright, extraHTTPHeaders);
      try {
        const response = await postImport(anonymous, txt());
        expect(response.status()).toBe(401);
        expect(await response.json()).toEqual({ error: "Unauthorized" });
      } finally {
        await anonymous.dispose();
      }
    });

    test("five imports a minute are allowed, then the limit is explained", async ({
      page,
      request,
      ai,
    }) => {
      // Rejected files still count, because the limit is checked first.
      for (let sent = 0; sent < 5; sent += 1)
        expect((await postImport(request, txt(""))).status()).toBe(400);
      const limited = await postImport(request, txt());
      expect(limited.status()).toBe(429);
      expect((await errorBody(limited)).error).toBe(RATE_LIMITED);
      const retryAfter = Number(limited.headers()["retry-after"]);
      expect(retryAfter).toBeGreaterThanOrEqual(1);
      expect(retryAfter).toBeLessThanOrEqual(60);

      await page.goto("/dashboard/profile");
      await importResume(page, txt());
      await expect(toast(page, RATE_LIMITED)).toBeVisible();
      expect(ai.requests()).toHaveLength(0);
    });

    test("an unexpected server error shows its message", async ({ page }) => {
      await page.route(`**${IMPORT}`, (route) =>
        route.fulfill({
          status: 500,
          json: {
            error: "Unexpected error importing resume. Please try again.",
          },
        }),
      );
      await page.goto("/dashboard/profile");
      await importResume(page, txt());
      await expect(
        toast(page, "Unexpected error importing resume. Please try again."),
      ).toBeVisible();
    });

    test("a dropped connection gets the page's own message", async ({
      page,
    }) => {
      let aborted = false;
      await page.route(`**${IMPORT}`, (route) => {
        aborted = true;
        return route.abort("internetdisconnected");
      });
      await page.goto("/dashboard/profile");
      await importResume(page, txt());
      await expect(toast(page, "Failed to fetch")).toBeVisible();
      expect(aborted).toBe(true);
      expectedFail(
        "src/app/dashboard/profile/components/section-index.tsx:133: the browser's TypeError message is shown, because error.message is never empty, so the page's fallback never applies",
      );
      await expect(
        toast(page, "Couldn't import that resume. Try again."),
      ).toBeVisible({ timeout: 2_000 });
    });

    test("a reply the page cannot read is reported", async ({ page }) => {
      await page.route(`**${IMPORT}`, (route) => route.fulfill({ json: {} }));
      await page.goto("/dashboard/profile");
      await importResume(page, txt());
      await expect(
        toast(page, "Received an invalid server response. Please try again."),
      ).toBeVisible();
      await expect(banner(page)).toHaveCount(0);
    });

    test("Import is disabled while reading, and the same file can be picked again", async ({
      page,
    }) => {
      let requests = 0;
      const gate = Promise.withResolvers<undefined>();
      await page.route(`**${IMPORT}`, async (route) => {
        requests += 1;
        await gate.promise;
        await route.fulfill({ status: 400, json: { error: "Nope" } });
      });
      await page.goto("/dashboard/profile");
      await importResume(page, txt());
      await expect(
        page.getByRole("button", { name: "Importing…", exact: true }),
      ).toBeDisabled();
      expect(requests).toBe(1);
      gate.resolve(undefined);
      await expect(toast(page, "Nope")).toBeVisible();
      // The input is cleared after each import, so choosing the same file fires again.
      await importResume(page, txt());
      await expect.poll(() => requests).toBe(2);
    });
  },
);

test.describe(
  "Review imported projects, certifications, achievements and references",
  { tag: "@import-review-per-item" },
  () => {
    test("each entry shows its cleaned details and is saved or discarded on its own", async ({
      page,
      database,
      candidate,
      ai,
    }) => {
      await importWith(page, ai, ENTRIES);
      const main = page.getByRole("main");
      await expect(sectionButton(page, "Projects")).toContainText(
        "has imported items to review,",
      );
      await sectionButton(page, "Projects").click();
      const panel = main
        .locator("section")
        .filter({ hasText: "1 project from your imported resume" });
      await expect(
        panel.getByRole("heading", { name: "Route Planner", level: 4 }),
      ).toBeVisible();
      const description = panel.getByText("Line two");
      await expect(description).toContainText("Line one");
      await expect(description).not.toHaveClass(/line-clamp/);
      await expect(
        panel.getByText("Jan 2021 to present", { exact: true }),
      ).toBeVisible();
      await expect(
        panel.getByRole("link", { name: "Open project", exact: true }),
      ).toHaveAttribute("href", "https://example.test/app");
      for (const tag of ["React", "Node"])
        await expect(panel.getByText(tag, { exact: true })).toBeVisible();
      // A section with only drafts shows no empty state, and Add stays in the header.
      await expect(
        main.getByRole("heading", { name: "No projects yet" }),
      ).toHaveCount(0);
      await expect(
        main.getByRole("button", { name: "Add project", exact: true }),
      ).toBeVisible();

      await panel.getByRole("button", { name: "Save", exact: true }).click();
      await expect(toast(page, "Project saved")).toBeVisible();
      await expect(panel).toHaveCount(0);
      await expect(entry(page, "Route Planner")).toBeVisible();
      const [project] = await database
        .select({
          isOngoing: projects.isOngoing,
          startDate: projects.startDate,
        })
        .from(projects)
        .where(eq(projects.userId, candidate.id));
      expect(project).toEqual({ isOngoing: true, startDate: "2021-01" });

      await sectionButton(page, "Certifications").click();
      await main
        .getByRole("button", { name: "Discard CKA", exact: true })
        .click();
      await expect(
        main.getByText("1 certification from your imported resume"),
      ).toHaveCount(0);
      await expect(banner(page)).toContainText(
        "2 imported items waiting for review",
      );

      await sectionButton(page, "References").click();
      await main.getByRole("button", { name: "Save", exact: true }).click();
      await expect(toast(page, "Reference saved")).toBeVisible();
      const reference = entry(page, "Jordan Lee");
      await expect(
        reference.getByText("Manager, Example Co", { exact: true }),
      ).toBeVisible();
      // The imported "Manager" is stored as the relationship and shown by its label.
      await expect(
        reference.getByText("Manager", { exact: true }),
      ).toBeVisible();
      expect(
        await database
          .select({ relationship: references.relationship })
          .from(references)
          .where(eq(references.userId, candidate.id)),
      ).toEqual([{ relationship: "manager" }]);
      expect(await rowCount(database, candidate.id)).toEqual([1, 0, 0, 1]);
    });

    test("a failed save keeps the entry waiting, and its buttons wait while saving", async ({
      page,
      ai,
    }) => {
      await importWith(page, ai, { projects: [PROJECT] });
      const gate = Promise.withResolvers<undefined>();
      await page.route("**/api/profile/projects", async (route) => {
        if (route.request().method() !== "POST") return route.fallback();
        await gate.promise;
        await route.fulfill({ status: 500, json: { error: "Bad" } });
      });
      await sectionButton(page, "Projects").click();
      const main = page.getByRole("main");
      await main.getByRole("button", { name: "Save", exact: true }).click();
      await expect(
        main.getByRole("button", { name: "Save", exact: true }),
      ).toBeDisabled();
      await expect(
        main.getByRole("button", {
          name: "Discard Route Planner",
          exact: true,
        }),
      ).toBeDisabled();
      gate.resolve(undefined);
      await expect(
        toast(page, "Couldn't save the project. Try again."),
      ).toBeVisible();
      await expect(
        main.getByRole("button", { name: "Save", exact: true }),
      ).toBeEnabled();
      await expect(
        main.getByText("1 project from your imported resume"),
      ).toBeVisible();
    });

    test("entries without their required field are left out, and an unsafe link dropped", async ({
      page,
      database,
      candidate,
      ai,
    }) => {
      await importWith(page, ai, {
        projects: [
          { ...PROJECT, title: null },
          {
            ...PROJECT,
            title: "Safe Project",
            projectUrl: "javascript:alert(1)",
          },
        ],
        certifications: [{ ...CERTIFICATION, issuingOrganization: null }],
        achievements: [{ ...ACHIEVEMENT, title: null }],
        references: [{ ...REFERENCE, name: null }],
      });
      await expect(banner(page)).toContainText(
        "1 imported item waiting for review",
      );
      await sectionButton(page, "Projects").click();
      const main = page.getByRole("main");
      await expect(
        main.getByRole("heading", { name: "Safe Project", level: 4 }),
      ).toBeVisible();
      await expect(
        main.getByRole("link", { name: "Open project" }),
      ).toHaveCount(0);
      await main.getByRole("button", { name: "Save", exact: true }).click();
      await expect(toast(page, "Project saved")).toBeVisible();
      expect(
        await database
          .select({ projectUrl: projects.projectUrl })
          .from(projects)
          .where(eq(projects.userId, candidate.id)),
      ).toEqual([{ projectUrl: null }]);
    });
  },
);

test.describe(
  "The pending import banner",
  { tag: "@import-review-banner" },
  () => {
    test("Save all stores every entry and clears the review", async ({
      page,
      database,
      candidate,
      ai,
    }) => {
      await importWith(page, ai, {
        ...ENTRIES,
        warnings: ["Phone number was not detected."],
      });
      await expect(banner(page)).toContainText(
        "4 imported items waiting for review",
      );
      await expect(banner(page)).toContainText(
        "1 project, 1 certification, 1 achievement, 1 reference",
      );
      const notice = page
        .getByRole("main")
        .getByText("Check the imported details", { exact: true });
      await expect(notice).toBeVisible();
      await sectionButton(page, "Achievements").click();
      await banner(page)
        .getByRole("button", { name: "Save all", exact: true })
        .click();
      await expect(
        toast(
          page,
          "Saved 1 project, 1 certification, 1 achievement, 1 reference.",
        ),
      ).toBeVisible();
      await expect(toast(page, "Phone number was not detected.")).toBeVisible();
      await expect(banner(page)).toHaveCount(0);
      await expect(sectionButton(page, "Projects")).not.toContainText(
        "has imported items to review",
      );
      await sectionButton(page, "Personal information").click();
      await expect(notice).toHaveCount(0);
      expect(await rowCount(database, candidate.id)).toEqual([1, 1, 1, 1]);
    });

    test("a failure part-way stops there, and saving again stores only the rest", async ({
      page,
      database,
      candidate,
      ai,
    }) => {
      await importWith(page, ai, ENTRIES);
      const failing = "**/api/profile/certifications";
      await page.route(failing, (route) =>
        route.request().method() === "POST"
          ? route.fulfill({ status: 500, json: { error: "Bad" } })
          : route.fallback(),
      );
      const saveAll = banner(page).getByRole("button", {
        name: "Save all",
        exact: true,
      });
      await saveAll.click();
      await expect(
        toast(
          page,
          "Couldn't save everything. The entries still listed were not saved; try again.",
        ),
      ).toBeVisible();
      await expect(banner(page)).toContainText(
        "3 imported items waiting for review",
      );
      await expect(banner(page)).toContainText(
        "1 certification, 1 achievement, 1 reference",
      );
      await page.unroute(failing);
      // The error toast sits over the banner, and hovering it pauses its timer.
      await page.mouse.move(0, 0);
      await expect(
        toast(
          page,
          "Couldn't save everything. The entries still listed were not saved; try again.",
        ),
      ).toBeHidden({ timeout: 15_000 });
      await saveAll.click();
      await expect(
        toast(page, "Saved 1 certification, 1 achievement, 1 reference."),
      ).toBeVisible();
      expect(await rowCount(database, candidate.id)).toEqual([1, 1, 1, 1]);
    });

    test("Save all and Discard all wait while saving", async ({ page, ai }) => {
      await importWith(page, ai, { projects: [PROJECT] });
      const pending = await hold(page, "**/api/profile/projects");
      await banner(page)
        .getByRole("button", { name: "Save all", exact: true })
        .click();
      await expect(
        banner(page).getByRole("button", { name: "Saving…", exact: true }),
      ).toBeDisabled();
      await expect(
        banner(page).getByRole("button", { name: "Discard all", exact: true }),
      ).toBeDisabled();
      pending.release();
      await expect(toast(page, "Saved 1 project.")).toBeVisible();
    });

    test("saving a row during Save all does not store it twice", async ({
      page,
      database,
      candidate,
      ai,
    }) => {
      await importWith(page, ai, { projects: [PROJECT] });
      const pending = await hold(page, "**/api/profile/projects");
      await sectionButton(page, "Projects").click();
      await banner(page)
        .getByRole("button", { name: "Save all", exact: true })
        .click();
      await expect.poll(() => pending.requests.length).toBe(1);
      const rowSave = page
        .getByRole("main")
        .locator("section")
        .filter({ hasText: "1 project from your imported resume" })
        .getByRole("button", { name: "Save", exact: true });
      await rowSave.click();
      // Reaching a second request proves the row stayed clickable.
      await expect.poll(() => pending.requests.length).toBe(2);
      pending.release();
      await Promise.all(pending.requests.map((request) => request.response()));
      await expect(toast(page, "Saved 1 project.")).toBeVisible();
      expectedFail(
        "src/app/dashboard/profile/components/pending-import-banner.tsx:110: the banner's isSaving does not disable the rows, so a row Save during Save all posts the same project again",
      );
      expect((await rowCount(database, candidate.id))[0]).toBe(1);
    });

    test("Discard all drops every draft and the warnings", async ({
      page,
      database,
      candidate,
      ai,
    }) => {
      await importWith(page, ai, {
        ...ENTRIES,
        warnings: ["Phone number was not detected."],
      });
      const posts = recordRequests(
        page,
        (request) => request.method() === "POST",
      );
      await banner(page)
        .getByRole("button", { name: "Discard all", exact: true })
        .click();
      await expect(toast(page, "Imported data discarded")).toBeVisible();
      await expect(banner(page)).toHaveCount(0);
      await expect(
        page
          .getByRole("main")
          .getByText("Check the imported details", { exact: true }),
      ).toHaveCount(0);
      expect(posts).toHaveLength(0);
      expect(await rowCount(database, candidate.id)).toEqual([0, 0, 0, 0]);
    });

    test("the review survives moving to another page and back", async ({
      page,
      ai,
    }) => {
      await importWith(page, ai, ENTRIES);
      await sectionButton(page, "References").click();
      const nav = page.getByRole("navigation", { name: "Main" });
      await nav
        .getByRole("link", { name: "Applications", exact: true })
        .click();
      await expect(page).toHaveURL(/\/dashboard\/applications$/);
      await nav.getByRole("link", { name: "Profile", exact: true }).click();
      await expect(banner(page)).toContainText(
        "4 imported items waiting for review",
      );
      await expect(
        page
          .getByRole("main")
          .getByRole("heading", { name: "References", level: 2 }),
      ).toBeVisible();
    });
  },
);

test.describe("Imported files", { tag: "@imported-files" }, () => {
  async function importedFile(page: Page, ai: FakeAI, name = "resume.txt") {
    await importWith(page, ai, {}, txt(RESUME_TEXT, name));
    await sectionButton(page, "Imported files").click();
    await expect(
      page.getByRole("main").getByRole("heading", { name, level: 3 }),
    ).toBeVisible();
  }

  test("Cancel keeps a file, and deleting the last one empties the list", async ({
    page,
    ai,
  }) => {
    await importedFile(page, ai);
    const remove = page.getByRole("button", {
      name: "Delete resume.txt",
      exact: true,
    });
    const dialog = page.getByRole("alertdialog", { name: "Delete this file?" });
    await remove.click();
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(
      page.getByRole("main").getByRole("heading", { name: "resume.txt" }),
    ).toBeVisible();
    await remove.click();
    await dialog.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(toast(page, "File deleted")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "No imported files yet" }),
    ).toBeVisible();
    await expect(sectionButton(page, "Imported files")).toHaveText(
      /^Imported files\s*0$/,
    );
  });

  test("a file gone from storage says so on download and can still be deleted", async ({
    page,
    database,
    candidate,
    ai,
  }) => {
    await importedFile(page, ai);
    await database
      .update(resumeUploads)
      .set({ storageKey: `users/${candidate.id}/uploads/gone` })
      .where(eq(resumeUploads.userId, candidate.id));
    await page
      .getByRole("button", { name: "Download resume.txt", exact: true })
      .click();
    await expect(
      toast(
        page,
        "This file is no longer in storage. Delete it from the list and import it again.",
      ),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Delete resume.txt", exact: true })
      .click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await expect(toast(page, "File deleted")).toBeVisible();
  });

  test("only the ten most recent files are kept", async ({
    page,
    request,
    database,
    candidate,
    ai,
  }) => {
    const start = Date.now() - 60 * 60_000;
    await database.insert(resumeUploads).values(
      Array.from({ length: 10 }, (_, index) => ({
        userId: candidate.id,
        fileName: `old-${index}.txt`,
        mimeType: TXT,
        sizeBytes: 1,
        storageKey: `users/${candidate.id}/uploads/seeded-${index}`,
        createdAt: new Date(start + index * 60_000),
      })),
    );
    await importedFile(page, ai, "newest.txt");
    const { files } = await uploads(request);
    expect(files).toHaveLength(10);
    expect(files[0]?.fileName).toBe("newest.txt");
    expect(files.map((file) => file.fileName)).not.toContain("old-0.txt");
  });

  test("a failed list shows its own notice while the rest of the profile loads", async ({
    page,
  }) => {
    await page.route(
      (url) => url.pathname === UPLOADS,
      (route) =>
        route.fulfill({
          status: 400,
          json: { error: "Failed to fetch imported files" },
        }),
    );
    await page.goto("/dashboard/profile");
    await sectionButton(page, "Imported files").click();
    const notice = page.getByRole("main").getByRole("alert");
    await expect(notice).toContainText("Your imported files didn't load");
    await expect(notice).toContainText("Failed to fetch imported files");
    await expect(
      notice.getByRole("button", { name: "Try again", exact: true }),
    ).toBeVisible();
    await sectionButton(page, "Work experience").click();
    await expect(entry(page, "Software Engineer")).toBeVisible();
  });

  test("without file storage the section says files are not kept", async ({
    page,
  }) => {
    await page.route(
      (url) => url.pathname === UPLOADS,
      (route) => route.fulfill({ json: { available: false, files: [] } }),
    );
    await page.goto("/dashboard/profile");
    await sectionButton(page, "Imported files").click();
    await expect(
      page.getByText("Imported files are not being kept", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "No imported files yet" }),
    ).toHaveCount(0);
  });

  test("storage failures on download and delete show their messages", async ({
    page,
    ai,
  }) => {
    await importedFile(page, ai);
    const gate = Promise.withResolvers<undefined>();
    await page.route(`**${UPLOADS}/*`, async (route) => {
      if (route.request().method() === "GET") {
        await gate.promise;
        return route.fulfill({
          status: 503,
          json: {
            error: "File storage is unavailable. Try again in a moment.",
          },
        });
      }
      return route.fulfill({
        status: 503,
        json: {
          error: "The stored file couldn't be deleted. Try again in a moment.",
        },
      });
    });
    const download = page.getByRole("button", {
      name: "Download resume.txt",
      exact: true,
    });
    await download.click();
    await expect(download).toBeDisabled();
    gate.resolve(undefined);
    await expect(
      toast(page, "File storage is unavailable. Try again in a moment."),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Delete resume.txt", exact: true })
      .click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await expect(
      toast(
        page,
        "The stored file couldn't be deleted. Try again in a moment.",
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("main").getByRole("heading", { name: "resume.txt" }),
    ).toBeVisible();
  });

  test("a file already deleted elsewhere leaves the list", async ({
    page,
    request,
    ai,
  }) => {
    await importedFile(page, ai);
    const [file] = (await uploads(request)).files;
    if (!file) throw new Error("The import keeps its original.");
    expect((await request.delete(`${UPLOADS}/${file.id}`)).status()).toBe(200);
    await page
      .getByRole("button", { name: "Delete resume.txt", exact: true })
      .click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await expect(toast(page, "File not found")).toBeVisible();
    expectedFail(
      "src/app/dashboard/profile/mutations/use-delete-resume-upload.ts:14: only onSuccess refreshes the list, so after a 404 the deleted file stays listed",
    );
    await expect(
      page.getByRole("heading", { name: "No imported files yet" }),
    ).toBeVisible({ timeout: 2_000 });
  });

  test("the files API checks ids, sessions and names, and downloads safely", async ({
    request,
    playwright,
    extraHTTPHeaders,
    ai,
  }) => {
    for (const id of ["not-a-uuid", "00000000-0000-4000-8000-000000000000"]) {
      const response = await request.get(`${UPLOADS}/${id}`);
      expect(response.status()).toBe(404);
      expect(await response.json()).toEqual({ error: "File not found" });
    }
    ai.reply(importReply());
    ai.reply(importReply());
    for (const name of ["../../x/evil.txt", `${"n".repeat(250)}.txt`])
      expect((await postImport(request, txt(RESUME_TEXT, name))).status()).toBe(
        200,
      );
    const { files } = await uploads(request);
    expect(files.map((file) => file.fileName).sort()).toEqual(
      ["evil.txt", "n".repeat(200)].sort(),
    );
    const [kept] = files;
    if (!kept) throw new Error("Both imports keep their originals.");
    const download = await request.get(`${UPLOADS}/${kept.id}`);
    expect(download.status()).toBe(200);
    const headers = download.headers();
    expect(headers["content-disposition"]).toMatch(/^attachment/);
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["cache-control"]).toContain("no-store");
    expect((await download.body()).toString()).toBe(RESUME_TEXT);

    const anonymous = await anonymousRequest(playwright, extraHTTPHeaders);
    try {
      for (const response of [
        await anonymous.get(UPLOADS),
        await anonymous.get(`${UPLOADS}/${kept.id}`),
        await anonymous.delete(`${UPLOADS}/${kept.id}`),
      ]) {
        expect(response.status()).toBe(401);
        expect(await response.json()).toEqual({ error: "Unauthorized" });
      }
    } finally {
      await anonymous.dispose();
    }
  });
});
