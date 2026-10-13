import type {
  IntelligentContentSelection,
  JobApplicationResumeRequest,
} from "../profile/validators";

type Identified = { id: number }[];

/** The profile sections a tailored resume chooses from; only their IDs are read. */
export interface SelectableProfile {
  workExperiences: Identified;
  education: Identified;
  skills: Identified;
  projects: Identified;
  certifications: Identified;
  achievements: Identified;
}

export interface ApplicationContentIds {
  workIds: number[];
  educationIds: number[];
  skillIds: number[];
  projectIds: number[];
  certificationIds: number[];
  achievementIds: number[];
}

/**
 * Decides which profile entries a tailored resume carries. Each section takes
 * the manual choice if there is one, then the AI's pick, then the profile.
 *
 * The limits describe how much the matching step may pick. They also bound its
 * fallback when matching was requested but failed. A resume requested without
 * matching includes everything, because the limits are not offered then.
 */
export function chooseApplicationContent(
  data: SelectableProfile,
  request: JobApplicationResumeRequest,
  aiSelection: IntelligentContentSelection | null,
): ApplicationContentIds {
  const manual = request.manualOverrides;
  const ids = (items: Identified) => items.map((item) => item.id);
  const limited = (items: Identified, max: number) =>
    ids(request.useAISelection ? items.slice(0, max) : items);

  return {
    workIds:
      manual?.workExperienceIds ??
      aiSelection?.selectedWorkExperiences ??
      limited(data.workExperiences, request.maxWorkExperiences),
    educationIds:
      manual?.educationIds ??
      aiSelection?.selectedEducation ??
      ids(data.education),
    skillIds:
      manual?.skillIds ??
      aiSelection?.selectedSkills ??
      limited(data.skills, request.maxSkills),
    projectIds:
      manual?.projectIds ??
      aiSelection?.selectedProjects ??
      limited(data.projects, request.maxProjects),
    certificationIds:
      manual?.certificationIds ??
      aiSelection?.selectedCertifications ??
      ids(data.certifications),
    achievementIds:
      manual?.achievementIds ??
      aiSelection?.selectedAchievements ??
      ids(data.achievements),
  };
}
