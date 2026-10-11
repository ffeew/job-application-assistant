import { expect, test } from "vitest";
import {
  createApplicationSchema,
  updateApplicationSchema,
} from "./applications/validators";
import {
  createCoverLetterSchema,
  updateCoverLetterSchema,
} from "./cover-letters/validators";
import {
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
