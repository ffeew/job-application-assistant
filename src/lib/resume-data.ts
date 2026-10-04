import type {
  AchievementResponse,
  CertificationResponse,
  EducationResponse,
  ProjectResponse,
  ReferenceResponse,
  ResumeContentSelection,
  SkillResponse,
  UserProfileResponse,
  WorkExperienceResponse,
} from "@/app/api/profile/validators";
import type { ResumeDocument, ResumeEntry } from "./resume-document";
import { formatMonthYear } from "./format-month-year";

export interface ResumeData {
  profile: UserProfileResponse | null;
  workExperiences: WorkExperienceResponse[];
  education: EducationResponse[];
  skills: SkillResponse[];
  projects: ProjectResponse[];
  certifications: CertificationResponse[];
  achievements: AchievementResponse[];
  references: ReferenceResponse[];
}

const dateRange = (start: string | null, end: string | null, current = false) =>
  [formatMonthYear(start), current ? "Present" : formatMonthYear(end)]
    .filter(Boolean)
    .join(" -- ");
const details = (...values: (string | null | undefined)[]) =>
  values.filter((value): value is string => Boolean(value?.trim()));
const bullets = (sourceId: string, value: string | null) =>
  (value ?? "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-•*]\s+/, "").trim())
    .filter(Boolean)
    .map((text, index) => ({ sourceId: `${sourceId}:bullet:${index}`, text }));
const selected = <T extends { id: number }>(
  values: T[],
  enabled: boolean,
  ids?: number[],
) => (enabled ? values.filter((value) => !ids || ids.includes(value.id)) : []);
const entry = (
  sourceId: string,
  heading: string,
  subheading: string,
  dates: string,
  extra: Partial<Pick<ResumeEntry, "bullets" | "links" | "details">> = {},
): ResumeEntry => ({
  sourceId,
  heading,
  subheading,
  dates,
  details: [],
  links: [],
  bullets: [],
  ...extra,
});

export function buildResumeDocument(
  data: ResumeData,
  selection: ResumeContentSelection,
  title: string,
): ResumeDocument {
  const profile = data.profile;
  const contacts: ResumeDocument["contacts"] = [];
  if (selection.includePersonalInfo && profile) {
    if (profile.email)
      contacts.push({
        label: "Email",
        text: profile.email,
        url: `mailto:${profile.email}`,
      });
    if (profile.phone) contacts.push({ label: "Mobile", text: profile.phone });
    const location = details(profile.city, profile.country).join(", ");
    if (location) contacts.push({ label: "Location", text: location });
    for (const [label, url] of [
      ["GitHub", profile.githubUrl],
      ["LinkedIn", profile.linkedinUrl],
      ["Portfolio", profile.portfolioUrl],
    ]) {
      if (url && label) contacts.push({ label, text: url, url });
    }
  }
  const sections: ResumeDocument["sections"] = [];
  sections.push({
    kind: "work",
    title: "Work Experiences",
    entries: selected(
      data.workExperiences,
      selection.includeWorkExperience,
      selection.workExperienceIds,
    ).map((work) => {
      const id = `work:${work.id}`;
      return entry(
        id,
        `${work.company}, ${work.jobTitle}`,
        work.technologies ?? "",
        dateRange(work.startDate, work.endDate, work.isCurrent),
        {
          details: details(work.location),
          bullets: bullets(id, work.description),
        },
      );
    }),
  });
  sections.push({
    kind: "education",
    title: "Education",
    entries: selected(
      data.education,
      selection.includeEducation,
      selection.educationIds,
    ).map((education) =>
      entry(
        `education:${education.id}`,
        education.institution,
        details(education.degree, education.fieldOfStudy).join(", "),
        dateRange(education.startDate, education.endDate),
        {
          details: details(
            education.location,
            education.gpa ? `GPA: ${education.gpa}` : null,
            education.honors,
            education.relevantCoursework,
          ),
        },
      ),
    ),
  });
  const skillGroups = new Map<string, string[]>();
  for (const skill of selected(data.skills, selection.includeSkills)) {
    if (
      selection.skillCategories &&
      !selection.skillCategories.includes(skill.category)
    )
      continue;
    skillGroups.set(skill.category, [
      ...(skillGroups.get(skill.category) ?? []),
      skill.name,
    ]);
  }
  sections.push({
    kind: "skills",
    title: "Skills",
    entries: [...skillGroups].map(([category, names]) =>
      entry(
        `skills:${category}`,
        category.charAt(0).toUpperCase() + category.slice(1),
        names.join(", "),
        "",
      ),
    ),
  });
  sections.push({
    kind: "projects",
    title: "Projects",
    entries: selected(
      data.projects,
      selection.includeProjects,
      selection.projectIds,
    ).map((project) => {
      const id = `project:${project.id}`;
      const links: ResumeEntry["links"] = [];
      if (project.projectUrl)
        links.push({
          label: "Project",
          text: "Project",
          url: project.projectUrl,
        });
      if (project.githubUrl)
        links.push({ label: "GitHub", text: "GitHub", url: project.githubUrl });
      return entry(
        id,
        `*${project.title}*`,
        project.technologies ?? "",
        dateRange(project.startDate, project.endDate, project.isOngoing),
        { links, bullets: bullets(id, project.description) },
      );
    }),
  });
  sections.push({
    kind: "certifications",
    title: "Certifications",
    entries: selected(
      data.certifications,
      selection.includeCertifications,
      selection.certificationIds,
    ).map((certification) =>
      entry(
        `certification:${certification.id}`,
        certification.name,
        certification.issuingOrganization,
        dateRange(certification.issueDate, certification.expirationDate),
        {
          details: details(certification.credentialId),
          links: certification.credentialUrl
            ? [
                {
                  label: "Credential",
                  text: "Credential",
                  url: certification.credentialUrl,
                },
              ]
            : [],
        },
      ),
    ),
  });
  sections.push({
    kind: "achievements",
    title: "Achievements",
    entries: selected(
      data.achievements,
      selection.includeAchievements,
      selection.achievementIds,
    ).map((achievement) => {
      const id = `achievement:${achievement.id}`;
      return entry(
        id,
        achievement.title,
        achievement.organization ?? "",
        formatMonthYear(achievement.date),
        {
          bullets: bullets(id, achievement.description),
          links: achievement.url
            ? [{ label: "Details", text: "Details", url: achievement.url }]
            : [],
        },
      );
    }),
  });
  sections.push({
    kind: "references",
    title: "References",
    entries: selected(
      data.references,
      selection.includeReferences,
      selection.referenceIds,
    ).map((reference) =>
      entry(
        `reference:${reference.id}`,
        reference.name,
        details(reference.title, reference.company).join(", "),
        "",
        {
          details: details(
            reference.email,
            reference.phone,
            reference.relationship,
          ),
        },
      ),
    ),
  });
  return {
    title,
    name:
      selection.includePersonalInfo && profile
        ? details(profile.firstName, profile.lastName).join(" ")
        : "",
    contacts,
    summary: selection.includeSummary
      ? profile?.professionalSummary?.trim() || null
      : null,
    sections: sections.filter((section) => section.entries.length > 0),
  };
}
