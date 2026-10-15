"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { PageHeader } from "@/app/dashboard/components/page-header";
import { ProfileActions, SectionIndex } from "./section-index";
import { ProfilePageSkeleton } from "./profile-page-skeleton";
import { PersonalInfoSection } from "./sections/personal-info-section";
import { ExperienceSection } from "./sections/experience-section";
import { EducationSection } from "./sections/education-section";
import { SkillsSection } from "./sections/skills-section";
import { ProjectsSection } from "./sections/projects-section";
import { CertificationsSection } from "./sections/certifications-section";
import { AchievementsSection } from "./sections/achievements-section";
import { ReferencesSection } from "./sections/references-section";
import { ImportedFilesSection } from "./sections/imported-files-section";
import { PendingImportBanner } from "./pending-import-banner";
import {
  useProfileUIStore,
  type ProfileSection,
} from "@/app/dashboard/profile/store/profile-ui-store";
import { useImportReviewStore } from "@/app/dashboard/profile/store/import-review-store";

import { useUserProfile } from "@/app/dashboard/profile/queries/use-user-profile";
import { useWorkExperiences } from "@/app/dashboard/profile/queries/use-work-experiences";
import { useEducation } from "@/app/dashboard/profile/queries/use-education";
import { useSkills } from "@/app/dashboard/profile/queries/use-skills";
import { useProjects } from "@/app/dashboard/profile/queries/use-projects";
import { useCertifications } from "@/app/dashboard/profile/queries/use-certifications";
import { useAchievements } from "@/app/dashboard/profile/queries/use-achievements";
import { useReferences } from "@/app/dashboard/profile/queries/use-references";
import { useResumeUploads } from "@/app/dashboard/profile/queries/use-resume-uploads";

const listOrder = { orderBy: "displayOrder", order: "asc" } as const;

export function ProfileLayout() {
  const activeSection = useProfileUIStore((state) => state.activeSection);

  const profileQuery = useUserProfile();
  const workQuery = useWorkExperiences(listOrder);
  const educationQuery = useEducation(listOrder);
  const skillsQuery = useSkills(listOrder);
  const projectsQuery = useProjects(listOrder);
  const certificationsQuery = useCertifications(listOrder);
  const achievementsQuery = useAchievements(listOrder);
  const referencesQuery = useReferences(listOrder);
  // Feeds only the index count. The section reports its own loading and
  // errors, so a storage problem never hides the rest of the profile.
  const uploadsQuery = useResumeUploads();

  const userProfile = profileQuery.data;
  const workExperiences = workQuery.data ?? [];
  const education = educationQuery.data ?? [];
  const skills = skillsQuery.data ?? [];
  const projects = projectsQuery.data ?? [];
  const certifications = certificationsQuery.data ?? [];
  const achievements = achievementsQuery.data ?? [];
  const references = referencesQuery.data ?? [];
  const uploadCount = uploadsQuery.data?.files.length ?? 0;

  const initializeImport = useImportReviewStore((state) => state.initialize);

  const counts: Record<ProfileSection, number> = useMemo(
    () => ({
      personal: userProfile ? 1 : 0,
      experience: workExperiences.length,
      education: education.length,
      skills: skills.length,
      projects: projects.length,
      certifications: certifications.length,
      achievements: achievements.length,
      references: references.length,
      files: uploadCount,
    }),
    [
      userProfile,
      workExperiences.length,
      education.length,
      skills.length,
      projects.length,
      certifications.length,
      achievements.length,
      references.length,
      uploadCount,
    ],
  );

  if (profileQuery.isLoading) {
    return <ProfilePageSkeleton />;
  }

  // A section that failed to load must not look like an empty one: someone who
  // sees "No work experience yet" may type everything in again.
  const failedQueries = [
    profileQuery,
    workQuery,
    educationQuery,
    skillsQuery,
    projectsQuery,
    certificationsQuery,
    achievementsQuery,
    referencesQuery,
  ].filter((query) => query.error);
  const loadError = failedQueries[0]?.error;

  if (loadError) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title="Profile" />
        <Notice tone="error" title="Your profile didn't load">
          <p>{loadError.message}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => {
              for (const query of failedQueries) void query.refetch();
            }}
          >
            Try again
          </Button>
        </Notice>
      </div>
    );
  }

  const renderSection = () => {
    switch (activeSection) {
      case "personal":
        return (
          <PersonalInfoSection
            profile={userProfile || null}
            onImportPreview={initializeImport}
          />
        );
      case "experience":
        return (
          <ExperienceSection
            experiences={workExperiences}
            isLoading={workQuery.isLoading}
          />
        );
      case "education":
        return (
          <EducationSection
            education={education}
            isLoading={educationQuery.isLoading}
          />
        );
      case "skills":
        return (
          <SkillsSection skills={skills} isLoading={skillsQuery.isLoading} />
        );
      case "projects":
        return (
          <ProjectsSection
            projects={projects}
            isLoading={projectsQuery.isLoading}
          />
        );
      case "certifications":
        return (
          <CertificationsSection
            certifications={certifications}
            isLoading={certificationsQuery.isLoading}
          />
        );
      case "achievements":
        return (
          <AchievementsSection
            achievements={achievements}
            isLoading={achievementsQuery.isLoading}
          />
        );
      case "references":
        return (
          <ReferencesSection
            references={references}
            isLoading={referencesQuery.isLoading}
          />
        );
      case "files":
        return <ImportedFilesSection />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Profile"
        description="Everything you might put on a resume, kept in one place. Each resume draws from it."
        actions={<ProfileActions onImportPreview={initializeImport} />}
      />

      <div className="grid items-start gap-x-10 gap-y-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
        {/* min-w-0 lets the scrolling index shrink instead of widening the page. */}
        <div className="min-w-0 lg:sticky lg:top-6">
          <SectionIndex counts={counts} />
        </div>
        <div className="min-w-0 max-w-3xl">{renderSection()}</div>
      </div>

      <PendingImportBanner />
    </div>
  );
}
