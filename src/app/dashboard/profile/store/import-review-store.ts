import { create } from "zustand";
import type {
  CreateAchievementRequest,
  CreateCertificationRequest,
  CreateEducationRequest,
  CreateProjectRequest,
  CreateReferenceRequest,
  CreateSkillRequest,
  CreateUserProfileRequest,
  CreateWorkExperienceRequest,
} from "@/app/api/profile/validators";
import type { ResumeImportResponse } from "@/app/api/profile/resume-import/validators";
import {
  buildAchievementItems,
  buildCertificationItems,
  buildEducationItems,
  buildProjectItems,
  buildReferenceItems,
  buildSkillItems,
  buildWorkExperienceItems,
  type PendingReviewItem,
} from "@/app/dashboard/profile/utils/import-normalizers";

export type ImportSectionKey =
  | "workExperiences"
  | "education"
  | "skills"
  | "projects"
  | "certifications"
  | "achievements"
  | "references";

export type ImportContextCounts = Record<ImportSectionKey, number>;

type SectionState<T> = PendingReviewItem<T>[];

type ImportReviewState = {
  profile: {
    data: CreateUserProfileRequest | null;
    warnings: string[];
  };
  workExperiences: SectionState<CreateWorkExperienceRequest>;
  education: SectionState<CreateEducationRequest>;
  skills: SectionState<CreateSkillRequest>;
  projects: SectionState<CreateProjectRequest>;
  certifications: SectionState<CreateCertificationRequest>;
  achievements: SectionState<CreateAchievementRequest>;
  references: SectionState<CreateReferenceRequest>;
  warnings: string[];
  lastImportedAt: number | null;
  initialize: (payload: ResumeImportResponse, context: ImportContextCounts) => void;
  clear: () => void;
  updateProfileDraft: (data: CreateUserProfileRequest, warnings?: string[]) => void;
  updateWorkExperienceDraft: (id: string, request: CreateWorkExperienceRequest) => void;
  removeWorkExperienceDraft: (id: string) => void;
  updateEducationDraft: (id: string, request: CreateEducationRequest) => void;
  removeEducationDraft: (id: string) => void;
  updateSkillDraft: (id: string, request: CreateSkillRequest) => void;
  removeSkillDraft: (id: string) => void;
  updateProjectDraft: (id: string, request: CreateProjectRequest) => void;
  removeProjectDraft: (id: string) => void;
  updateCertificationDraft: (id: string, request: CreateCertificationRequest) => void;
  removeCertificationDraft: (id: string) => void;
  updateAchievementDraft: (id: string, request: CreateAchievementRequest) => void;
  removeAchievementDraft: (id: string) => void;
  updateReferenceDraft: (id: string, request: CreateReferenceRequest) => void;
  removeReferenceDraft: (id: string) => void;
};

const initialState = {
  profile: {
    data: null,
    warnings: [],
  },
  workExperiences: [] as SectionState<CreateWorkExperienceRequest>,
  education: [] as SectionState<CreateEducationRequest>,
  skills: [] as SectionState<CreateSkillRequest>,
  projects: [] as SectionState<CreateProjectRequest>,
  certifications: [] as SectionState<CreateCertificationRequest>,
  achievements: [] as SectionState<CreateAchievementRequest>,
  references: [] as SectionState<CreateReferenceRequest>,
  warnings: [] as string[],
  lastImportedAt: null as number | null,
};

const updateDraft = <T,>(
  items: SectionState<T>,
  id: string,
  request: T,
): SectionState<T> =>
  items.map((item) =>
    item.id === id
      ? {
          ...item,
          request,
          warnings: [],
        }
      : item
  );

const removeDraft = <T,>(items: SectionState<T>, id: string): SectionState<T> =>
  items.filter((item) => item.id !== id);

export const useImportReviewStore = create<ImportReviewState>((set) => ({
  ...initialState,
  initialize: (payload, context) => {
    const workExperiences = buildWorkExperienceItems(
      payload.workExperiences,
      context.workExperiences,
    );
    const education = buildEducationItems(payload.education, context.education);
    const skills = buildSkillItems(payload.skills, context.skills);
    const projects = buildProjectItems(payload.projects, context.projects);
    const certifications = buildCertificationItems(
      payload.certifications,
      context.certifications,
    );
    const achievements = buildAchievementItems(
      payload.achievements,
      context.achievements,
    );
    const references = buildReferenceItems(payload.references, context.references);

    const aggregatedWarnings = [
      ...(payload.warnings ?? []),
      ...workExperiences.warnings,
      ...education.warnings,
      ...skills.warnings,
      ...projects.warnings,
      ...certifications.warnings,
      ...achievements.warnings,
      ...references.warnings,
    ];

    set({
      profile: {
        data: payload.profile,
        warnings: payload.warnings ?? [],
      },
      workExperiences: workExperiences.items,
      education: education.items,
      skills: skills.items,
      projects: projects.items,
      certifications: certifications.items,
      achievements: achievements.items,
      references: references.items,
      warnings: Array.from(new Set(aggregatedWarnings)),
      lastImportedAt: Date.now(),
    });
  },
  clear: () => {
    set({
      ...initialState,
    });
  },
  updateProfileDraft: (data, warnings = []) =>
    set(() => ({
      profile: {
        data,
        warnings,
      },
    })),
  updateWorkExperienceDraft: (id, request) =>
    set((state) => ({
      workExperiences: updateDraft(state.workExperiences, id, request),
    })),
  removeWorkExperienceDraft: (id) =>
    set((state) => ({
      workExperiences: removeDraft(state.workExperiences, id),
    })),
  updateEducationDraft: (id, request) =>
    set((state) => ({
      education: updateDraft(state.education, id, request),
    })),
  removeEducationDraft: (id) =>
    set((state) => ({
      education: removeDraft(state.education, id),
    })),
  updateSkillDraft: (id, request) =>
    set((state) => ({
      skills: updateDraft(state.skills, id, request),
    })),
  removeSkillDraft: (id) =>
    set((state) => ({
      skills: removeDraft(state.skills, id),
    })),
  updateProjectDraft: (id, request) =>
    set((state) => ({
      projects: updateDraft(state.projects, id, request),
    })),
  removeProjectDraft: (id) =>
    set((state) => ({
      projects: removeDraft(state.projects, id),
    })),
  updateCertificationDraft: (id, request) =>
    set((state) => ({
      certifications: updateDraft(state.certifications, id, request),
    })),
  removeCertificationDraft: (id) =>
    set((state) => ({
      certifications: removeDraft(state.certifications, id),
    })),
  updateAchievementDraft: (id, request) =>
    set((state) => ({
      achievements: updateDraft(state.achievements, id, request),
    })),
  removeAchievementDraft: (id) =>
    set((state) => ({
      achievements: removeDraft(state.achievements, id),
    })),
  updateReferenceDraft: (id, request) =>
    set((state) => ({
      references: updateDraft(state.references, id, request),
    })),
  removeReferenceDraft: (id) =>
    set((state) => ({
      references: removeDraft(state.references, id),
    })),
}));
