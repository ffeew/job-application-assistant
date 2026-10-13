import { describe, expect, test } from "vitest";
import {
  createUserProfileSchema,
  createWorkExperienceSchema,
  updateEducationSchema,
  updateReferenceSchema,
  updateUserProfileSchema,
} from "@/app/api/profile/validators";
import {
  LONG_TEXT_MAX,
  monthSchema,
  normalizeHttpUrl,
  optionalEmail,
  optionalMonth,
  optionalUrl,
  SHORT_TEXT_MAX,
} from "./fields";

describe("optional form fields", () => {
  // An input the user emptied submits "", not null.
  test.each([optionalEmail, optionalMonth, optionalUrl])(
    "a cleared field is stored as null",
    (schema) => {
      expect(schema.parse("")).toBeNull();
      expect(schema.parse("   ")).toBeNull();
      expect(schema.parse(null)).toBeNull();
    },
  );

  test("filled fields are still checked", () => {
    expect(optionalEmail.parse(" alex@example.test ")).toBe("alex@example.test");
    expect(optionalEmail.safeParse("alex at example").success).toBe(false);
    expect(optionalMonth.parse("2024-03")).toBe("2024-03");
    expect(optionalMonth.safeParse("March 2024").success).toBe(false);
    expect(optionalUrl.parse("https://example.test/alex")).toBe(
      "https://example.test/alex",
    );
    expect(optionalUrl.safeParse("example.test/alex").success).toBe(false);
  });

  test("months outside the calendar are rejected", () => {
    expect(monthSchema.safeParse("2024-12").success).toBe(true);
    expect(monthSchema.safeParse("2024-13").success).toBe(false);
    expect(monthSchema.safeParse("2024-00").success).toBe(false);
  });
});

describe("profile schemas", () => {
  test("an emptied email, link, or date can be saved", () => {
    expect(
      updateUserProfileSchema.parse({ email: "", linkedinUrl: "" }),
    ).toEqual({ email: null, linkedinUrl: null });
    expect(updateEducationSchema.parse({ endDate: "" })).toEqual({
      endDate: null,
    });
    expect(updateReferenceSchema.parse({ email: "" })).toEqual({ email: null });
  });

  test("a required start date cannot be blank", () => {
    const experience = {
      jobTitle: "Engineer",
      company: "Example Company",
      location: null,
      endDate: "",
      description: null,
      technologies: null,
    };
    expect(
      createWorkExperienceSchema.parse({ ...experience, startDate: "2023-01" }),
    ).toMatchObject({ startDate: "2023-01", endDate: null });
    expect(
      createWorkExperienceSchema.safeParse({ ...experience, startDate: "" })
        .success,
    ).toBe(false);
  });

  test("a profile with every optional field empty is valid", () => {
    const empty = {
      firstName: null, lastName: null, email: null, phone: null, address: null,
      city: null, state: null, zipCode: null, country: null, linkedinUrl: null,
      githubUrl: null, portfolioUrl: null, professionalSummary: null,
    };
    expect(createUserProfileSchema.parse(empty)).toEqual(empty);
  });
});

describe("links", () => {
  // Every one of these is a valid URL, and none belongs in an anchor or a PDF.
  test.each([
    "javascript:alert(1)",
    "file:///etc/passwd",
    "data:text/html,<script>alert(1)</script>",
    "ftp://example.test/resume.pdf",
    "mailto:alex@example.test",
  ])("only web addresses are accepted: %s", (value) => {
    expect(optionalUrl.safeParse(value).success).toBe(false);
    expect(normalizeHttpUrl(value)).toBeNull();
  });

  test("a link written without its scheme is completed", () => {
    expect(normalizeHttpUrl("linkedin.com/in/alex-example")).toBe(
      "https://linkedin.com/in/alex-example",
    );
    expect(normalizeHttpUrl(" https://github.com/alex-example ")).toBe(
      "https://github.com/alex-example",
    );
    expect(normalizeHttpUrl("http://localhost:3000/portfolio")).toBe(
      "http://localhost:3000/portfolio",
    );
  });

  test("text that is not a link is dropped", () => {
    expect(normalizeHttpUrl("see my portfolio")).toBeNull();
    expect(normalizeHttpUrl("")).toBeNull();
    expect(normalizeHttpUrl(null)).toBeNull();
  });
});

describe("length limits", () => {
  const experience = {
    jobTitle: "Engineer",
    company: "Example Company",
    location: null,
    startDate: "2023-01",
    endDate: null,
    description: null,
    technologies: null,
  };

  test("single-line and free-text fields have separate ceilings", () => {
    expect(
      createWorkExperienceSchema.safeParse({
        ...experience,
        description: "x".repeat(LONG_TEXT_MAX),
      }).success,
    ).toBe(true);
    expect(
      createWorkExperienceSchema.safeParse({
        ...experience,
        description: "x".repeat(LONG_TEXT_MAX + 1),
      }).success,
    ).toBe(false);
    expect(
      createWorkExperienceSchema.safeParse({
        ...experience,
        company: "x".repeat(SHORT_TEXT_MAX + 1),
      }).success,
    ).toBe(false);
  });
});
