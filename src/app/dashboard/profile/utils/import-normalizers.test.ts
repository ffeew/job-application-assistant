import { describe, expect, test } from "vitest";
import {
  buildEducationItems,
  buildSkillItems,
  buildWorkExperienceItems,
} from "./import-normalizers";

const experience = {
  jobTitle: "Engineer",
  company: "Example Company",
  location: null,
  startDate: "Jan 2020",
  endDate: "Mar 2022",
  isCurrent: null,
  description: null,
  technologies: ["TypeScript", " ", "PostgreSQL"],
};

describe("imported work experience", () => {
  test("month names become YYYY-MM without losing a month to the time zone", () => {
    const original = process.env.TZ;
    try {
      process.env.TZ = "Asia/Singapore";
      const { items, warnings } = buildWorkExperienceItems([experience]);
      expect(warnings).toEqual([]);
      expect(items[0]?.request).toMatchObject({
        startDate: "2020-01",
        endDate: "2022-03",
        isCurrent: false,
        technologies: "TypeScript, PostgreSQL",
      });
    } finally {
      if (original === undefined) delete process.env.TZ;
      else process.env.TZ = original;
    }
  });

  test("an open-ended role is current and has no end date", () => {
    const { items } = buildWorkExperienceItems([
      { ...experience, endDate: "Present" },
    ]);
    expect(items[0]?.request).toMatchObject({ endDate: null, isCurrent: true });
  });

  test("an entry without a readable start date is reported, not saved", () => {
    const { items, warnings } = buildWorkExperienceItems([
      { ...experience, startDate: "a while ago" },
    ]);
    expect(items).toEqual([]);
    expect(warnings).toEqual([
      "Work experience #1: Missing or invalid start date.",
    ]);
  });

  // Lists sort entries that share a display order by date, so an import must
  // not number its entries ahead of ones typed in by hand.
  test("imported entries share one display order", () => {
    const { items } = buildWorkExperienceItems([experience, experience]);
    expect(items.map((item) => item.request.displayOrder)).toEqual([0, 0]);
  });
});

describe("other imported sections", () => {
  test("education keeps entries whose dates are missing", () => {
    const { items } = buildEducationItems([
      {
        degree: "BSc", fieldOfStudy: null, institution: "Example University",
        location: null, startDate: null, endDate: "2019", gpa: null,
        honors: null, relevantCoursework: [],
      },
    ]);
    expect(items[0]?.request).toMatchObject({
      startDate: null,
      endDate: "2019-01",
    });
  });

  test("skills are de-duplicated and given a valid category", () => {
    const skill = { name: "TypeScript", category: "Programming", proficiencyLevel: null, yearsOfExperience: null };
    const { items } = buildSkillItems([skill, { ...skill, name: "typescript" }]);
    expect(items).toHaveLength(1);
    expect(items[0]?.request.category).toBe("technical");
  });
});
