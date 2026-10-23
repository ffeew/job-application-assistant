import type { APIRequestContext, APIResponse } from "@playwright/test";
import { eq } from "drizzle-orm";
import { jobApplications, resumes } from "../../src/lib/db/schema";
import { applicationJsonResponseSchema } from "../../src/app/api/applications/validators";
import { applicationResumeInfoResponseSchema } from "../../src/app/api/applications/[id]/resume/validators";
import {
  acceptedGenerationJobSchema,
  generationJobResponseSchema,
} from "../../src/app/api/resume-generation/jobs/validators";
import { test, expect } from "./support/fixtures";
import {
  anonymousRequest,
  errorBody,
  expectedFail,
  MALFORMED_JSON,
} from "./support/helpers";
import { BASE_URL } from "./support/runtime";

const LIST = "/api/applications";
const TOO_LONG = "Keep this under 300 characters";
const INVALID_RESUME_REQUEST =
  "Invalid resume request. Check the selected options.";
const PREVIEW_GONE =
  "That preview is no longer available. Preview again, then save.";
const VALID = { company: "Northwind", position: "Data Engineer" };

async function parsedApplication(response: APIResponse) {
  const raw: unknown = await response.json();
  return applicationJsonResponseSchema.parse(raw);
}

async function enqueue(
  request: APIRequestContext,
  applicationId: string,
  data: object = { title: "API Resume", useAISelection: false },
  query = "",
) {
  return request.post(`${LIST}/${applicationId}/resume${query}`, { data });
}

async function jobPayload(request: APIRequestContext, jobId: string) {
  const response = await request.get(`/api/resume-generation/jobs/${jobId}`);
  expect(response.status()).toBe(200);
  const raw: unknown = await response.json();
  return generationJobResponseSchema.parse(raw).payload;
}

test.describe("Applications API", { tag: "@applications-api" }, () => {
  test("create, filter, update one field and delete", async ({
    request,
    candidate,
  }) => {
    const created = await request.post(LIST, { data: VALID });
    expect(created.status()).toBe(201);
    const application = await parsedApplication(created);
    expect(application).toMatchObject({
      ...VALID,
      status: "applied",
      userId: candidate.id,
    });

    const filtered = await request.get(`${LIST}?status=applied&limit=1`);
    expect(filtered.status()).toBe(200);
    const filteredRaw: unknown = await filtered.json();
    expect(
      applicationJsonResponseSchema.array().parse(filteredRaw),
    ).toHaveLength(1);

    const url = `${LIST}/${application.id}`;
    await request.put(url, {
      data: { jobDescription: "Pipelines.", appliedAt: "2026-02-03" },
    });
    const updated = await request.put(url, { data: { status: "offer" } });
    expect(updated.status()).toBe(200);
    expect(await parsedApplication(updated)).toMatchObject({
      ...VALID,
      status: "offer",
      jobDescription: "Pipelines.",
      appliedAt: "2026-02-03T00:00:00.000Z",
    });

    const deleted = await request.delete(url);
    expect(deleted.status()).toBe(200);
    expect(await deleted.json()).toEqual({ success: true });
    const again = await request.delete(url);
    expect(again.status()).toBe(404);
    expect(await again.json()).toEqual({ error: "Application not found" });
  });

  test("bad list queries are refused", async ({ request }) => {
    for (const query of [
      "status=pending",
      "limit=0",
      "limit=101",
      "limit=abc",
      "offset=-1",
      `company=${"a".repeat(301)}`,
    ]) {
      const response = await request.get(`${LIST}?${query}`);
      expect(response.status(), query.slice(0, 30)).toBe(400);
      expect((await errorBody(response)).error).toBe(
        "Invalid query parameters",
      );
    }
  });

  test("bodies that are not JSON objects are refused", async ({
    request,
    candidate,
  }) => {
    for (const response of [
      await request.post(LIST, MALFORMED_JSON),
      await request.put(`${LIST}/${candidate.applicationId}`, MALFORMED_JSON),
    ]) {
      expect(response.status()).toBe(400);
      expect(await response.json()).toEqual({
        error: "Request body must be valid JSON",
      });
    }
    for (const data of [null, [], "x"]) {
      const response = await request.post(LIST, {
        headers: { "Content-Type": "application/json" },
        data: Buffer.from(JSON.stringify(data)),
      });
      expect(response.status(), JSON.stringify(data)).toBe(400);
      expect((await errorBody(response)).error).toBe("Invalid request data");
    }
  });

  test("each field rule has its message", async ({ request }) => {
    const cases: [Record<string, unknown>, string | undefined][] = [
      [{ ...VALID, company: "" }, "Company is required"],
      [{ position: "X" }, undefined],
      ...[
        "company",
        "position",
        "location",
        "salaryRange",
        "contactName",
        "recruiterId",
      ].map((field): [Record<string, unknown>, string] => [
        { ...VALID, [field]: "a".repeat(301) },
        TOO_LONG,
      ]),
      [
        { ...VALID, jobDescription: "j".repeat(50_001) },
        "Keep this under 50,000 characters",
      ],
      [
        { ...VALID, notes: "n".repeat(20_001) },
        "Keep this under 20,000 characters",
      ],
      [{ ...VALID, jobUrl: "ftp://x" }, "Enter a link starting with https://"],
      [{ ...VALID, jobUrl: `https://x.test/${"a".repeat(2_000)}` }, undefined],
      [{ ...VALID, contactEmail: "x" }, "Invalid email"],
      [{ ...VALID, status: "pending" }, undefined],
      [{ ...VALID, appliedAt: "not-a-date" }, "Enter a valid date"],
      [{ ...VALID, appliedAt: "2026-02-30" }, "Enter a valid date"],
    ];
    for (const [data, message] of cases) {
      const response = await request.post(LIST, { data });
      expect(response.status(), JSON.stringify(data).slice(0, 60)).toBe(400);
      const body = await errorBody(response);
      expect(body.error).toBe("Invalid request data");
      if (message) expect(body.messages).toContain(message);
    }
    for (const appliedAt of ["2026-02-03T10:00:00Z", ""]) {
      const response = await request.post(LIST, {
        data: { ...VALID, appliedAt },
      });
      expect(response.status(), appliedAt).toBe(201);
    }
  });

  test("unknown keys cannot set the owner or the id", async ({
    request,
    candidate,
    createCandidate,
  }) => {
    const other = await createCandidate();
    const response = await request.post(LIST, {
      data: { ...VALID, userId: other.id, id: "fixed-id" },
    });
    expect(response.status()).toBe(201);
    const application = await parsedApplication(response);
    expect(application.userId).toBe(candidate.id);
    expect(application.id).not.toBe("fixed-id");
  });

  test("another account's or an unknown application is not found", async ({
    request,
    database,
    createCandidate,
  }) => {
    const other = await createCandidate();
    for (const id of [other.applicationId, "does-not-exist"]) {
      const url = `${LIST}/${id}`;
      for (const response of [
        await request.get(url),
        await request.put(url, { data: { company: "Hijacked" } }),
        await request.delete(url),
      ]) {
        expect(response.status(), id).toBe(404);
        expect(await response.json()).toEqual({
          error: "Application not found",
        });
      }
    }
    expect(
      await database
        .select({ company: jobApplications.company })
        .from(jobApplications)
        .where(eq(jobApplications.id, other.applicationId)),
    ).toEqual([{ company: "Example Industries" }]);
  });

  test("updates are partial and validated", async ({ request, candidate }) => {
    const url = `${LIST}/${candidate.applicationId}`;
    for (const data of [
      { company: "" },
      { status: null },
      { appliedAt: "bad" },
    ]) {
      const response = await request.put(url, { data });
      expect(response.status(), JSON.stringify(data)).toBe(400);
      expect((await errorBody(response)).error).toBe("Invalid request data");
    }
    const before = await parsedApplication(await request.get(url));
    const unchanged = await request.put(url, { data: {} });
    expect(unchanged.status()).toBe(200);
    expect(await parsedApplication(unchanged)).toMatchObject({
      company: before.company,
      position: before.position,
      jobDescription: before.jobDescription,
      status: before.status,
    });
    await request.put(url, { data: { appliedAt: "2026-02-03" } });
    const cleared = await request.put(url, { data: { appliedAt: "" } });
    expect((await parsedApplication(cleared)).appliedAt).toBeUndefined();
  });

  test("an id with a NUL byte is simply not found", async ({ request }) => {
    const response = await request.get(`${LIST}/%00`);
    // A 500 proves the id reached the database query.
    expect(response.status()).toBe(500);
    expectedFail(
      "src/app/api/applications/[id]/route.ts:20: the id goes to PostgreSQL unchecked, and a NUL byte makes the query throw, so the route answers 500",
    );
    expect(response.status()).toBe(404);
  });

  test("every endpoint requires a session", async ({
    playwright,
    extraHTTPHeaders,
    candidate,
  }) => {
    const anonymous = await anonymousRequest(playwright, extraHTTPHeaders);
    try {
      const url = `${LIST}/${candidate.applicationId}`;
      for (const response of [
        await anonymous.get(LIST),
        await anonymous.post(LIST, { data: VALID }),
        await anonymous.get(url),
        await anonymous.put(url, { data: VALID }),
        await anonymous.delete(url),
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
  "Application resume API",
  { tag: "@application-resume-api" },
  () => {
    test("info describes the application, and a preview is queued", async ({
      request,
      candidate,
    }) => {
      const id = candidate.applicationId;
      const info = await request.get(`${LIST}/${id}/resume`);
      expect(info.status()).toBe(200);
      const infoRaw: unknown = await info.json();
      expect(applicationResumeInfoResponseSchema.parse(infoRaw)).toMatchObject({
        id,
        hasJobDescription: true,
        status: "applied",
        tailoredResume: null,
      });

      const queued = await enqueue(request, id);
      expect(queued.status()).toBe(202);
      expect(queued.headers()["cache-control"]).toBe("no-store");
      const queuedRaw: unknown = await queued.json();
      const job = acceptedGenerationJobSchema.parse(queuedRaw);
      expect(job.status).toBe("queued");
      expect(await jobPayload(request, job.jobId)).toMatchObject({
        kind: "application",
        intent: "preview",
      });

      const pdf = await enqueue(request, id, undefined, "?format=pdf");
      expect(pdf.status()).toBe(202);
      const pdfRaw: unknown = await pdf.json();
      expect(
        await jobPayload(
          request,
          acceptedGenerationJobSchema.parse(pdfRaw).jobId,
        ),
      ).toMatchObject({ intent: "download" });
    });

    test("enqueue bodies and formats are validated", async ({
      request,
      candidate,
    }) => {
      const id = candidate.applicationId;
      const malformed = await request.post(
        `${LIST}/${id}/resume`,
        MALFORMED_JSON,
      );
      expect(malformed.status()).toBe(400);
      expect(await malformed.json()).toEqual({ error: INVALID_RESUME_REQUEST });
      for (const data of [
        [],
        {},
        { title: "x", maxSkills: 4 },
        { title: "x", targetPages: 3 },
        { title: "x", intent: "bogus" },
      ]) {
        const response = await enqueue(request, id, data);
        expect(response.status(), JSON.stringify(data)).toBe(400);
        expect(await response.json()).toEqual({
          error: INVALID_RESUME_REQUEST,
        });
      }
      const docx = await enqueue(request, id, undefined, "?format=docx");
      expect(docx.status()).toBe(400);
      expect(await docx.json()).toEqual({
        error: "Use PDF or preview format.",
      });
    });

    test("another account's application is not found, and the path id wins", async ({
      request,
      candidate,
      createCandidate,
      playwright,
      extraHTTPHeaders,
    }) => {
      const other = await createCandidate();
      const otherUrl = `${LIST}/${other.applicationId}/resume`;
      for (const response of [
        await request.get(otherUrl),
        await enqueue(request, other.applicationId),
        await request.put(otherUrl, {
          data: { title: "x", jobId: crypto.randomUUID() },
        }),
      ]) {
        expect(response.status()).toBe(404);
        expect(await response.json()).toEqual({
          error: "Application not found",
        });
      }

      const own = await enqueue(request, candidate.applicationId, {
        title: "x",
        useAISelection: false,
        applicationId: other.applicationId,
      });
      expect(own.status()).toBe(202);
      const ownRaw: unknown = await own.json();
      const payload = await jobPayload(
        request,
        acceptedGenerationJobSchema.parse(ownRaw).jobId,
      );
      expect(payload).toMatchObject({
        kind: "application",
        request: { applicationId: candidate.applicationId },
      });

      // Another account's queued job cannot be saved from here either.
      const otherRequest = await playwright.request.newContext({
        baseURL: BASE_URL,
        storageState: other.storageState,
        extraHTTPHeaders,
      });
      try {
        const theirs = await enqueue(otherRequest, other.applicationId);
        const theirsRaw: unknown = await theirs.json();
        const response = await request.put(
          `${LIST}/${candidate.applicationId}/resume`,
          {
            data: {
              title: "x",
              jobId: acceptedGenerationJobSchema.parse(theirsRaw).jobId,
            },
          },
        );
        expect(response.status()).toBe(404);
        expect(await response.json()).toEqual({ error: PREVIEW_GONE });
      } finally {
        await otherRequest.dispose();
      }
    });

    test("saving needs a finished preview and a valid body", async ({
      request,
      database,
      candidate,
    }) => {
      const url = `${LIST}/${candidate.applicationId}/resume`;
      for (const data of [
        { title: "", jobId: crypto.randomUUID() },
        { title: "x", jobId: "abc" },
        { title: "t".repeat(301), jobId: crypto.randomUUID() },
      ]) {
        const response = await request.put(url, { data });
        expect(response.status()).toBe(400);
        expect((await errorBody(response)).error).toBe("Invalid request data");
      }
      const malformed = await request.put(url, MALFORMED_JSON);
      expect(malformed.status()).toBe(400);
      expect(await malformed.json()).toEqual({
        error: "Request body must be valid JSON",
      });

      const queued = await enqueue(request, candidate.applicationId);
      const queuedRaw: unknown = await queued.json();
      for (const jobId of [
        crypto.randomUUID(),
        acceptedGenerationJobSchema.parse(queuedRaw).jobId,
      ]) {
        const response = await request.put(url, {
          data: { title: "x", jobId },
        });
        expect(response.status()).toBe(404);
        expect(await response.json()).toEqual({ error: PREVIEW_GONE });
      }
      expect(
        await database
          .select({ id: resumes.id })
          .from(resumes)
          .where(eq(resumes.userId, candidate.id)),
      ).toEqual([]);
    });

    test("matching needs a job description", async ({
      request,
      database,
      candidate,
    }) => {
      await database
        .update(jobApplications)
        .set({ jobDescription: null })
        .where(eq(jobApplications.id, candidate.applicationId));
      const response = await enqueue(request, candidate.applicationId, {
        title: "x",
      });
      expect(response.status()).toBe(400);
      expect(await response.json()).toEqual({
        error: "Job description is required for AI-powered resume generation",
      });
    });

    test("a fourth job is refused while three are waiting", async ({
      request,
      candidate,
    }) => {
      for (let queued = 0; queued < 3; queued += 1)
        expect((await enqueue(request, candidate.applicationId)).status()).toBe(
          202,
        );
      const limited = await enqueue(request, candidate.applicationId);
      expect(limited.status()).toBe(429);
      expect(await limited.json()).toEqual({
        error:
          "You already have resumes being generated. Wait for one to finish, then try again.",
      });
    });

    test("every endpoint requires a session", async ({
      playwright,
      extraHTTPHeaders,
      candidate,
    }) => {
      const anonymous = await anonymousRequest(playwright, extraHTTPHeaders);
      try {
        const url = `${LIST}/${candidate.applicationId}/resume`;
        for (const response of [
          await anonymous.get(url),
          await anonymous.post(url, { data: { title: "x" } }),
          await anonymous.put(url, {
            data: { title: "x", jobId: crypto.randomUUID() },
          }),
        ]) {
          expect(response.status()).toBe(401);
          expect(await response.json()).toEqual({ error: "Unauthorized" });
        }
      } finally {
        await anonymous.dispose();
      }
    });
  },
);
