import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  env: { GROQ_API_KEY: "test-only", GROQ_MODEL: "qwen/qwen3.8-27b" },
}));
vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("ai")>()),
  generateText: vi.fn(),
}));

import { generateText } from "ai";
import { ResumeImportService } from "./service";

const blankProfile = {
  firstName: "Alex",
  lastName: "Example",
  email: "alex@example.test",
  phone: "+1 555 0100",
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

function modelReturns(output: Record<string, unknown>) {
  vi.mocked(generateText).mockResolvedValue(
    // Only `output` is read by the service.
    { output: { ...blankProfile, ...output } } as never,
  );
}

const importText = () =>
  new ResumeImportService().importProfileFromResume({
    arrayBuffer: new TextEncoder().encode("Alex Example\nEngineer").buffer,
    mimeType: "text/plain",
  });

beforeEach(() => {
  vi.mocked(generateText).mockReset();
});

describe("profile details read by the model", () => {
  // Resumes usually print links without a scheme, and the profile schema
  // rejects those. The import used to fail outright with a 500.
  test("links without a scheme are completed instead of failing the import", async () => {
    modelReturns({
      linkedinUrl: "linkedin.com/in/alex-example",
      githubUrl: "https://github.com/alex-example",
      portfolioUrl: "not a link at all",
    });
    const result = await importText();
    expect(result.profile.linkedinUrl).toBe("https://linkedin.com/in/alex-example");
    expect(result.profile.githubUrl).toBe("https://github.com/alex-example");
    expect(result.profile.portfolioUrl).toBeNull();
  });

  test("an unreadable email is dropped and reported", async () => {
    modelReturns({ email: "alex at example dot test" });
    const result = await importText();
    expect(result.profile.email).toBeNull();
    expect(result.warnings).toContain("Email address was not detected.");
  });

  test("a mailto link is reduced to its address", async () => {
    modelReturns({ email: "mailto:alex@example.test" });
    expect((await importText()).profile.email).toBe("alex@example.test");
  });
});

describe("dates read by the model", () => {
  test("month names are stored as YYYY-MM in every server time zone", async () => {
    modelReturns({
      workExperiences: [
        {
          jobTitle: "Engineer", company: "Example Company", location: null,
          startDate: "Jan 2020", endDate: "Present", isCurrent: null,
          description: null, technologies: [],
        },
      ],
      certifications: [
        {
          name: "Example Certificate", issuingOrganization: "Example Board",
          issueDate: "03/2021", expirationDate: null, credentialId: null,
          credentialUrl: "example.test/cert/1",
        },
      ],
    });
    const original = process.env.TZ;
    try {
      for (const zone of ["UTC", "Asia/Singapore"]) {
        process.env.TZ = zone;
        const result = await importText();
        expect(result.workExperiences[0]).toMatchObject({
          startDate: "2020-01",
          endDate: null,
          isCurrent: true,
        });
        expect(result.certifications[0]).toMatchObject({
          issueDate: "2021-03",
          credentialUrl: "https://example.test/cert/1",
        });
      }
    } finally {
      if (original === undefined) delete process.env.TZ;
      else process.env.TZ = original;
    }
  });
});

describe("when the model is unavailable", () => {
  test("the text fallback still returns a valid profile", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(generateText).mockRejectedValue(new Error("model unavailable"));
    const result = await new ResumeImportService().importProfileFromResume({
      arrayBuffer: new TextEncoder().encode(
        "Alex Example\nalex@example.test\nhttps://linkedin.com/in/alex-example\n",
      ).buffer,
      mimeType: "text/plain",
    });
    expect(result.profile).toMatchObject({
      firstName: "Alex",
      lastName: "Example",
      email: "alex@example.test",
      linkedinUrl: "https://linkedin.com/in/alex-example",
    });
    expect(result.warnings.join(" ")).toMatch(/AI parsing failed/);
  });
});
