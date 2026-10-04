import { expect, test } from "bun:test";
import { buildResumeDocument, type ResumeData } from "./resume-data";
import { resumeContentSelectionSchema } from "@/app/api/profile/validators";
import { saveTailoredResumeRequestSchema } from "@/app/api/applications/[id]/resume/validators";

const metadata = {
  userId: "synthetic-user",
  createdAt: new Date(0),
  updatedAt: new Date(0),
  displayOrder: 0,
};
const data: ResumeData = {
  profile: null,
  workExperiences: [1, 2].map((id) => ({
    ...metadata,
    id,
    company: `Example ${id}`,
    jobTitle: "Engineer",
    location: null,
    startDate: "2024-01",
    endDate: null,
    isCurrent: true,
    description: "• First achievement\n- Second achievement",
    technologies: "TypeScript",
  })),
  education: [
    {
      ...metadata,
      id: 1,
      degree: "BSc",
      institution: "Example University",
      fieldOfStudy: "Computing",
      location: null,
      startDate: "2020-01",
      endDate: "2023-12",
      gpa: "4.5 / 5",
      honors: "Honours",
      relevantCoursework: null,
    },
  ],
  skills: [
    {
      ...metadata,
      id: 1,
      name: "TypeScript",
      category: "technical",
      proficiencyLevel: null,
      yearsOfExperience: null,
    },
    {
      ...metadata,
      id: 2,
      name: "Collaboration",
      category: "soft",
      proficiencyLevel: null,
      yearsOfExperience: null,
    },
  ],
  projects: [],
  certifications: [],
  achievements: [],
  references: [],
};

test("profile selection keeps chosen entries, category filters, bullet provenance, and dates", () => {
  const selected = resumeContentSelectionSchema.parse({
    workExperienceIds: [2],
    skillCategories: ["technical"],
  });
  const result = buildResumeDocument(data, selected, "Synthetic resume");
  const work = result.sections.find((section) => section.kind === "work");
  expect(work?.entries).toHaveLength(1);
  expect(work?.entries[0]?.sourceId).toBe("work:2");
  expect(work?.entries[0]?.dates).toBe("Jan 2024 -- Present");
  expect(work?.entries[0]?.bullets[0]).toEqual({
    sourceId: "work:2:bullet:0",
    text: "First achievement",
  });
  expect(
    result.sections.find((section) => section.kind === "skills")?.entries[0]
      ?.subheading,
  ).toBe("TypeScript");
  expect(
    result.sections.find((section) => section.kind === "education")?.entries[0]
      ?.details,
  ).toContain("GPA: 4.5 / 5");
});

test("disabled and explicitly empty sections do not leak into the document", () => {
  const selected = resumeContentSelectionSchema.parse({
    includeEducation: false,
    workExperienceIds: [],
    includeSkills: false,
  });
  const result = buildResumeDocument(data, selected, "Synthetic resume");
  expect(result.sections).toHaveLength(0);
});

test("saving accepts existing JSON records and rejects malformed versioned snapshots", () => {
  expect(
    saveTailoredResumeRequestSchema.safeParse({
      title: "Legacy",
      content: JSON.stringify({ html: "<p>Legacy</p>" }),
    }).success,
  ).toBe(true);
  expect(
    saveTailoredResumeRequestSchema.safeParse({
      title: "Broken",
      content: JSON.stringify({ schemaVersion: 2, renderer: "latex" }),
    }).success,
  ).toBe(false);
  expect(
    saveTailoredResumeRequestSchema.safeParse({
      title: "Broken",
      content: "invalid JSON",
    }).success,
  ).toBe(false);
});
