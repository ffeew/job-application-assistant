import type {
  CreateAchievementRequest,
  CreateCertificationRequest,
  CreateEducationRequest,
  CreateProjectRequest,
  CreateReferenceRequest,
  CreateSkillRequest,
  CreateWorkExperienceRequest,
} from "@/app/api/profile/validators";
import type {
  ResumeImportAchievement,
  ResumeImportCertification,
  ResumeImportEducation,
  ResumeImportProject,
  ResumeImportReference,
  ResumeImportResponse,
  ResumeImportSkill,
  ResumeImportWorkExperience,
} from "@/app/api/profile/resume-import/validators";

const RESUME_DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;
const YEAR_REGEX = /^\d{4}$/;

const generateId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 11);
};

export type PendingReviewItem<T> = {
  id: string;
  request: T;
  warnings: string[];
};

export type PendingSectionResult<T> = {
  items: PendingReviewItem<T>[];
  warnings: string[];
};

export const safeString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const joinStringArray = (values: string[] | undefined): string | null => {
  if (!values || values.length === 0) {
    return null;
  }

  const parts = values
    .map((value) => safeString(value))
    .filter((value): value is string => Boolean(value));

  return parts.length > 0 ? parts.join(", ") : null;
};

export const normalizeDate = (value: string | null | undefined): string | null => {
  const sanitized = safeString(value);
  if (!sanitized) {
    return null;
  }

  if (RESUME_DATE_REGEX.test(sanitized)) {
    return sanitized;
  }

  if (YEAR_REGEX.test(sanitized)) {
    return `${sanitized}-01`;
  }

  if (/present|current/i.test(sanitized)) {
    return null;
  }

  const parsed = new Date(sanitized);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const year = parsed.getUTCFullYear();
  const month = (parsed.getUTCMonth() + 1).toString().padStart(2, "0");
  return `${year}-${month}`;
};

export const sanitizeUrl = (value: string | null | undefined): string | null => {
  const urlString = safeString(value);
  if (!urlString) {
    return null;
  }

  const candidate = /^[a-zA-Z]+:\/\//.test(urlString) ? urlString : `https://${urlString}`;
  try {
    return new URL(candidate).toString();
  } catch {
    return null;
  }
};

export const normalizeYearsOfExperience = (
  value: number | null | undefined,
): number | null => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }

  const rounded = Math.max(0, Math.round(value));
  return Number.isFinite(rounded) ? rounded : null;
};

export const normalizeRelationship = (
  value: string | null | undefined,
): CreateReferenceRequest["relationship"] => {
  const sanitized = safeString(value)?.toLowerCase();
  if (!sanitized) {
    return null;
  }

  const allowed: CreateReferenceRequest["relationship"][] = [
    "manager",
    "colleague",
    "client",
    "professor",
    "mentor",
    "other",
  ];
  return allowed.includes(sanitized as CreateReferenceRequest["relationship"])
    ? (sanitized as CreateReferenceRequest["relationship"])
    : null;
};

const normalizeWorkExperience = (
  item: ResumeImportWorkExperience,
  displayOrder: number,
): { request: CreateWorkExperienceRequest | null; warnings: string[] } => {
  const warnings: string[] = [];

  const jobTitle = safeString(item.jobTitle);
  const company = safeString(item.company);
  const startDate = normalizeDate(item.startDate);

  if (!jobTitle) {
    warnings.push("Missing job title.");
  }
  if (!company) {
    warnings.push("Missing company.");
  }
  if (!startDate) {
    warnings.push("Missing or invalid start date.");
  }

  if (!jobTitle || !company || !startDate) {
    return { request: null, warnings };
  }

  const endDateRaw = safeString(item.endDate);
  const endDate = normalizeDate(endDateRaw);
  const isCurrent =
    typeof item.isCurrent === "boolean"
      ? item.isCurrent
      : endDate === null && !!endDateRaw && /present|current/i.test(endDateRaw);

  return {
    request: {
      jobTitle,
      company,
      location: safeString(item.location),
      startDate,
      endDate,
      isCurrent: isCurrent ?? false,
      description: safeString(item.description),
      technologies: joinStringArray(item.technologies),
      displayOrder,
    },
    warnings,
  };
};

const normalizeEducation = (
  item: ResumeImportEducation,
  displayOrder: number,
): { request: CreateEducationRequest | null; warnings: string[] } => {
  const warnings: string[] = [];

  const degree = safeString(item.degree);
  const institution = safeString(item.institution);

  if (!degree) {
    warnings.push("Missing degree.");
  }
  if (!institution) {
    warnings.push("Missing institution.");
  }

  if (!degree || !institution) {
    return { request: null, warnings };
  }

  return {
    request: {
      degree,
      fieldOfStudy: safeString(item.fieldOfStudy),
      institution,
      location: safeString(item.location),
      startDate: normalizeDate(item.startDate),
      endDate: normalizeDate(item.endDate),
      gpa: safeString(item.gpa),
      honors: safeString(item.honors),
      relevantCoursework: joinStringArray(item.relevantCoursework),
      displayOrder,
    },
    warnings,
  };
};

const normalizeSkill = (
  item: ResumeImportSkill,
  displayOrder: number,
): { request: CreateSkillRequest | null; warnings: string[] } => {
  const warnings: string[] = [];
  const name = safeString(item.name);

  if (!name) {
    warnings.push("Missing skill name.");
    return { request: null, warnings };
  }

  const category = safeString(item.category)?.toLowerCase();
  const allowedCategories: CreateSkillRequest["category"][] = [
    "technical",
    "soft",
    "language",
    "tool",
    "framework",
    "other",
  ];
  const normalizedCategory = allowedCategories.includes(category as CreateSkillRequest["category"])
    ? (category as CreateSkillRequest["category"])
    : "technical";

  const proficiency = safeString(item.proficiencyLevel)?.toLowerCase();
  const allowedLevels: NonNullable<CreateSkillRequest["proficiencyLevel"]>[] = [
    "beginner",
    "intermediate",
    "advanced",
    "expert",
  ];
  const normalizedLevel = allowedLevels.includes(proficiency as NonNullable<CreateSkillRequest["proficiencyLevel"]>)
    ? (proficiency as NonNullable<CreateSkillRequest["proficiencyLevel"]>)
    : null;

  return {
    request: {
      name,
      category: normalizedCategory,
      proficiencyLevel: normalizedLevel,
      yearsOfExperience: normalizeYearsOfExperience(item.yearsOfExperience ?? null),
      displayOrder,
    },
    warnings,
  };
};

const normalizeProject = (
  item: ResumeImportProject,
  displayOrder: number,
): { request: CreateProjectRequest | null; warnings: string[] } => {
  const warnings: string[] = [];
  const title = safeString(item.title);

  if (!title) {
    warnings.push("Missing project title.");
    return { request: null, warnings };
  }

  const endDateRaw = safeString(item.endDate);
  const endDate = normalizeDate(endDateRaw);
  const isOngoing =
    typeof item.isOngoing === "boolean"
      ? item.isOngoing
      : !endDate && !!endDateRaw && /present|current/i.test(endDateRaw);

  return {
    request: {
      title,
      description: safeString(item.description),
      technologies: joinStringArray(item.technologies),
      projectUrl: sanitizeUrl(item.projectUrl),
      githubUrl: sanitizeUrl(item.githubUrl),
      startDate: normalizeDate(item.startDate),
      endDate,
      isOngoing: isOngoing ?? false,
      displayOrder,
    },
    warnings,
  };
};

const normalizeCertification = (
  item: ResumeImportCertification,
  displayOrder: number,
): { request: CreateCertificationRequest | null; warnings: string[] } => {
  const warnings: string[] = [];
  const name = safeString(item.name);
  const issuingOrganization = safeString(item.issuingOrganization);

  if (!name) {
    warnings.push("Missing certification name.");
  }
  if (!issuingOrganization) {
    warnings.push("Missing issuing organization.");
  }

  if (!name || !issuingOrganization) {
    return { request: null, warnings };
  }

  return {
    request: {
      name,
      issuingOrganization,
      issueDate: normalizeDate(item.issueDate),
      expirationDate: normalizeDate(item.expirationDate),
      credentialId: safeString(item.credentialId),
      credentialUrl: sanitizeUrl(item.credentialUrl),
      displayOrder,
    },
    warnings,
  };
};

const normalizeAchievement = (
  item: ResumeImportAchievement,
  displayOrder: number,
): { request: CreateAchievementRequest | null; warnings: string[] } => {
  const warnings: string[] = [];
  const title = safeString(item.title);

  if (!title) {
    warnings.push("Missing achievement title.");
    return { request: null, warnings };
  }

  return {
    request: {
      title,
      description: safeString(item.description),
      organization: safeString(item.organization),
      date: normalizeDate(item.date),
      url: sanitizeUrl(item.url),
      displayOrder,
    },
    warnings,
  };
};

const normalizeReference = (
  item: ResumeImportReference,
  displayOrder: number,
): { request: CreateReferenceRequest | null; warnings: string[] } => {
  const warnings: string[] = [];
  const name = safeString(item.name);

  if (!name) {
    warnings.push("Missing reference name.");
    return { request: null, warnings };
  }

  return {
    request: {
      name,
      title: safeString(item.title),
      company: safeString(item.company),
      email: safeString(item.email),
      phone: safeString(item.phone),
      relationship: normalizeRelationship(item.relationship),
      displayOrder,
    },
    warnings,
  };
};

const aggregateWarnings = (
  label: string,
  index: number,
  warnings: string[],
): string[] => warnings.map((warning) => `${label} #${index + 1}: ${warning}`);

export const buildWorkExperienceItems = (
  items: ResumeImportResponse["workExperiences"],
  existingCount: number,
): PendingSectionResult<CreateWorkExperienceRequest> => {
  const pendingItems: PendingReviewItem<CreateWorkExperienceRequest>[] = [];
  const warnings: string[] = [];

  items.forEach((item, index) => {
    const result = normalizeWorkExperience(item, existingCount + pendingItems.length);
    if (result.warnings.length > 0) {
      warnings.push(...aggregateWarnings("Work experience", index, result.warnings));
    }
    if (result.request) {
      pendingItems.push({
        id: generateId(),
        request: result.request,
        warnings: result.warnings,
      });
    }
  });

  return { items: pendingItems, warnings };
};

export const buildEducationItems = (
  items: ResumeImportResponse["education"],
  existingCount: number,
): PendingSectionResult<CreateEducationRequest> => {
  const pendingItems: PendingReviewItem<CreateEducationRequest>[] = [];
  const warnings: string[] = [];

  items.forEach((item, index) => {
    const result = normalizeEducation(item, existingCount + pendingItems.length);
    if (result.warnings.length > 0) {
      warnings.push(...aggregateWarnings("Education", index, result.warnings));
    }
    if (result.request) {
      pendingItems.push({
        id: generateId(),
        request: result.request,
        warnings: result.warnings,
      });
    }
  });

  return { items: pendingItems, warnings };
};

export const buildSkillItems = (
  items: ResumeImportResponse["skills"],
  existingCount: number,
): PendingSectionResult<CreateSkillRequest> => {
  const pendingItems: PendingReviewItem<CreateSkillRequest>[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();

  items.forEach((item, index) => {
    const result = normalizeSkill(item, existingCount + pendingItems.length);
    if (result.warnings.length > 0) {
      warnings.push(...aggregateWarnings("Skill", index, result.warnings));
    }
    if (result.request) {
      const key = result.request.name.toLowerCase();
      if (seen.has(key)) {
        return;
      }
      seen.add(key);

      pendingItems.push({
        id: generateId(),
        request: result.request,
        warnings: result.warnings,
      });
    }
  });

  return { items: pendingItems, warnings };
};

export const buildProjectItems = (
  items: ResumeImportResponse["projects"],
  existingCount: number,
): PendingSectionResult<CreateProjectRequest> => {
  const pendingItems: PendingReviewItem<CreateProjectRequest>[] = [];
  const warnings: string[] = [];

  items.forEach((item, index) => {
    const result = normalizeProject(item, existingCount + pendingItems.length);
    if (result.warnings.length > 0) {
      warnings.push(...aggregateWarnings("Project", index, result.warnings));
    }
    if (result.request) {
      pendingItems.push({
        id: generateId(),
        request: result.request,
        warnings: result.warnings,
      });
    }
  });

  return { items: pendingItems, warnings };
};

export const buildCertificationItems = (
  items: ResumeImportResponse["certifications"],
  existingCount: number,
): PendingSectionResult<CreateCertificationRequest> => {
  const pendingItems: PendingReviewItem<CreateCertificationRequest>[] = [];
  const warnings: string[] = [];

  items.forEach((item, index) => {
    const result = normalizeCertification(item, existingCount + pendingItems.length);
    if (result.warnings.length > 0) {
      warnings.push(...aggregateWarnings("Certification", index, result.warnings));
    }
    if (result.request) {
      pendingItems.push({
        id: generateId(),
        request: result.request,
        warnings: result.warnings,
      });
    }
  });

  return { items: pendingItems, warnings };
};

export const buildAchievementItems = (
  items: ResumeImportResponse["achievements"],
  existingCount: number,
): PendingSectionResult<CreateAchievementRequest> => {
  const pendingItems: PendingReviewItem<CreateAchievementRequest>[] = [];
  const warnings: string[] = [];

  items.forEach((item, index) => {
    const result = normalizeAchievement(item, existingCount + pendingItems.length);
    if (result.warnings.length > 0) {
      warnings.push(...aggregateWarnings("Achievement", index, result.warnings));
    }
    if (result.request) {
      pendingItems.push({
        id: generateId(),
        request: result.request,
        warnings: result.warnings,
      });
    }
  });

  return { items: pendingItems, warnings };
};

export const buildReferenceItems = (
  items: ResumeImportResponse["references"],
  existingCount: number,
): PendingSectionResult<CreateReferenceRequest> => {
  const pendingItems: PendingReviewItem<CreateReferenceRequest>[] = [];
  const warnings: string[] = [];

  items.forEach((item, index) => {
    const result = normalizeReference(item, existingCount + pendingItems.length);
    if (result.warnings.length > 0) {
      warnings.push(...aggregateWarnings("Reference", index, result.warnings));
    }
    if (result.request) {
      pendingItems.push({
        id: generateId(),
        request: result.request,
        warnings: result.warnings,
      });
    }
  });

  return { items: pendingItems, warnings };
};
