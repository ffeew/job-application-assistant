import { describe, expect, test } from "vitest";
import {
  createUserProfileSchema,
  createWorkExperienceSchema,
  updateEducationSchema,
  updateReferenceSchema,
  updateUserProfileSchema,
} from "@/app/api/profile/validators";
import { monthSchema, optionalEmail, optionalMonth, optionalUrl } from "./fields";

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
