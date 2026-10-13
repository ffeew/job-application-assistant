import { describe, expect, test } from "vitest";
import {
  jobApplicationResumeRequestSchema,
  type IntelligentContentSelection,
} from "../profile/validators";
import {
  chooseApplicationContent,
  type SelectableProfile,
} from "./application-selection";

const ids = (count: number) =>
  Array.from({ length: count }, (_, index) => ({ id: index + 1 }));

const profile: SelectableProfile = {
  workExperiences: ids(6),
  education: ids(2),
  skills: ids(15),
  projects: ids(5),
  certifications: ids(3),
  achievements: ids(4),
};

const request = (overrides: Record<string, unknown> = {}) =>
  jobApplicationResumeRequestSchema.parse({
    applicationId: "application-fixture",
    title: "Tailored resume",
    ...overrides,
  });

const aiPick: IntelligentContentSelection = {
  selectedWorkExperiences: [2, 5],
  selectedEducation: [1],
  selectedSkills: [3, 4, 9],
  selectedProjects: [1],
  selectedCertifications: [],
  selectedAchievements: [2],
  relevanceScores: [],
  overallStrategy: "Synthetic strategy",
  keyMatchingPoints: [],
};

describe("content for a tailored resume", () => {
  test("includes the whole profile when matching is turned off", () => {
    const chosen = chooseApplicationContent(
      profile,
      request({ useAISelection: false }),
      null,
    );
    expect(chosen.workIds).toHaveLength(6);
    expect(chosen.skillIds).toHaveLength(15);
    expect(chosen.projectIds).toHaveLength(5);
    expect(chosen.educationIds).toHaveLength(2);
    expect(chosen.certificationIds).toHaveLength(3);
    expect(chosen.achievementIds).toHaveLength(4);
  });

  test("keeps the limits as the fallback when matching was requested but failed", () => {
    const chosen = chooseApplicationContent(profile, request(), null);
    expect(chosen.workIds).toEqual([1, 2, 3, 4]);
    expect(chosen.projectIds).toEqual([1, 2, 3]);
    expect(chosen.skillIds).toHaveLength(12);
    expect(chosen.educationIds).toHaveLength(2);
  });

  test("uses the AI's pick when there is one", () => {
    const chosen = chooseApplicationContent(profile, request(), aiPick);
    expect(chosen.workIds).toEqual([2, 5]);
    expect(chosen.skillIds).toEqual([3, 4, 9]);
    expect(chosen.certificationIds).toEqual([]);
  });

  test("a manual choice overrides only its own section", () => {
    const chosen = chooseApplicationContent(
      profile,
      request({ manualOverrides: { workExperienceIds: [6] } }),
      aiPick,
    );
    expect(chosen.workIds).toEqual([6]);
    expect(chosen.skillIds).toEqual([3, 4, 9]);
    expect(chosen.projectIds).toEqual([1]);
  });
});
