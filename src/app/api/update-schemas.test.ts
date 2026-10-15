import { expect, test } from "vitest";
import {
  createApplicationSchema,
  updateApplicationSchema,
} from "./applications/validators";
import {
  createCoverLetterSchema,
  generateCoverLetterSchema,
  updateCoverLetterSchema,
} from "./cover-letters/validators";
import {
  bulkUpdateOrderSchema,
  createWorkExperienceSchema,
  updateAchievementSchema,
  updateCertificationSchema,
  updateEducationSchema,
  updateProjectSchema,
  updateReferenceSchema,
  updateSkillSchema,
  updateWorkExperienceSchema,
} from "./profile/validators";
import { createResumeSchema, updateResumeSchema } from "./resumes/validators";

test("partial updates leave omitted defaulted fields untouched", () => {
  expect(updateResumeSchema.parse({ title: "Resume" })).toEqual({
    title: "Resume",
  });
  expect(updateCoverLetterSchema.parse({ title: "Letter" })).toEqual({
    title: "Letter",
  });
  expect(updateApplicationSchema.parse({ notes: "Called" })).toEqual({
    notes: "Called",
  });
  for (const schema of [
    updateWorkExperienceSchema,
    updateEducationSchema,
    updateSkillSchema,
    updateProjectSchema,
    updateCertificationSchema,
    updateAchievementSchema,
    updateReferenceSchema,
  ])
    expect(schema.parse({})).toEqual({});
});

test("partial updates still accept and validate defaulted fields", () => {
  expect(
    updateResumeSchema.parse({ isDefault: true, isTailored: true }),
  ).toEqual({ isDefault: true, isTailored: true });
  expect(updateApplicationSchema.parse({ status: "offer" })).toEqual({
    status: "offer",
  });
  expect(updateApplicationSchema.safeParse({ status: "unknown" }).success).toBe(
    false,
  );
  expect(updateSkillSchema.safeParse({ displayOrder: -1 }).success).toBe(false);
});

test("create schemas keep their defaults", () => {
  expect(
    createResumeSchema.parse({ title: "Resume", content: "{}" }),
  ).toMatchObject({ isDefault: false, isTailored: false });
  expect(
    createCoverLetterSchema.parse({ title: "Letter", content: "Text" }),
  ).toMatchObject({ isAiGenerated: false });
  expect(
    createApplicationSchema.parse({ company: "Example", position: "Engineer" }),
  ).toMatchObject({ status: "applied" });
  expect(
    createWorkExperienceSchema.safeParse({ displayOrder: 0 }).success,
  ).toBe(false);
});

test("application dates and links are validated, and a cleared date is accepted", () => {
  const application = { company: "Example", position: "Engineer" };
  for (const appliedAt of ["", "2026-10-13", "2026-10-13T00:00:00Z"]) {
    expect(
      createApplicationSchema.safeParse({ ...application, appliedAt }).success,
    ).toBe(true);
  }
  expect(
    createApplicationSchema.safeParse({
      ...application,
      appliedAt: "next week",
    }).success,
  ).toBe(false);
  expect(updateApplicationSchema.parse({ appliedAt: "" })).toEqual({
    appliedAt: "",
  });
  expect(
    createApplicationSchema.safeParse({
      ...application,
      jobUrl: "javascript:alert(1)",
    }).success,
  ).toBe(false);
  expect(
    createApplicationSchema.safeParse({
      ...application,
      jobUrl: "https://example.test/jobs/1",
    }).success,
  ).toBe(true);
  expect(
    createApplicationSchema.safeParse({ ...application, jobUrl: "" }).success,
  ).toBe(true);
});

test("requests that feed the model or fan out into queries are bounded", () => {
  const letter = { company: "Example", position: "Engineer" };
  expect(
    generateCoverLetterSchema.safeParse({
      ...letter,
      resumeContent: { summary: "x".repeat(1_000) },
    }).success,
  ).toBe(true);
  expect(
    generateCoverLetterSchema.safeParse({
      ...letter,
      resumeContent: { summary: "x".repeat(200_000) },
    }).success,
  ).toBe(false);
  expect(
    generateCoverLetterSchema.safeParse({
      ...letter,
      jobDescription: "x".repeat(60_000),
    }).success,
  ).toBe(false);

  const items = (count: number) =>
    Array.from({ length: count }, (_, id) => ({ id, displayOrder: id }));
  expect(bulkUpdateOrderSchema.safeParse({ items: items(500) }).success).toBe(
    true,
  );
  expect(bulkUpdateOrderSchema.safeParse({ items: items(501) }).success).toBe(
    false,
  );
});
