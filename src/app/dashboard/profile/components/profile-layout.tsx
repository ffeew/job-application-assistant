"use client";

import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Menu, X } from "lucide-react";
import { ProfileSidebar } from "./profile-sidebar";
import { ProfilePageSkeleton } from "./profile-page-skeleton";
import { PersonalInfoSection } from "./sections/personal-info-section";
import { ExperienceSection } from "./sections/experience-section";
import { EducationSection } from "./sections/education-section";
import { SkillsSection } from "./sections/skills-section";
import { ProjectsSection } from "./sections/projects-section";
import { CertificationsSection } from "./sections/certifications-section";
import { AchievementsSection } from "./sections/achievements-section";
import { ReferencesSection } from "./sections/references-section";
import { PendingImportBanner } from "./pending-import-banner";
import {
	useProfileUIStore,
	type ProfileSection,
} from "@/app/dashboard/profile/store/profile-ui-store";
import { useImportReviewStore } from "@/app/dashboard/profile/store/import-review-store";
import type { ImportContextCounts } from "@/app/dashboard/profile/store/import-review-store";
import type { ResumeImportResponse } from "@/app/api/profile/resume-import/validators";

// Queries
import { useUserProfile } from "@/app/dashboard/profile/queries/use-user-profile";
import { useWorkExperiences } from "@/app/dashboard/profile/queries/use-work-experiences";
import { useEducation } from "@/app/dashboard/profile/queries/use-education";
import { useSkills } from "@/app/dashboard/profile/queries/use-skills";
import { useProjects } from "@/app/dashboard/profile/queries/use-projects";
import { useCertifications } from "@/app/dashboard/profile/queries/use-certifications";
import { useAchievements } from "@/app/dashboard/profile/queries/use-achievements";
import { useReferences } from "@/app/dashboard/profile/queries/use-references";

export function ProfileLayout() {
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);
	const activeSection = useProfileUIStore((state) => state.activeSection);

	// Data queries
	const { data: userProfile, isLoading: profileLoading } = useUserProfile();
	const { data: workExperiences = [], isLoading: workLoading } = useWorkExperiences({
		orderBy: "displayOrder",
		order: "asc",
	});
	const { data: education = [], isLoading: educationLoading } = useEducation({
		orderBy: "displayOrder",
		order: "asc",
	});
	const { data: skills = [], isLoading: skillsLoading } = useSkills({
		orderBy: "displayOrder",
		order: "asc",
	});
	const { data: projects = [], isLoading: projectsLoading } = useProjects({
		orderBy: "displayOrder",
		order: "asc",
	});
	const { data: certifications = [], isLoading: certificationsLoading } = useCertifications({
		orderBy: "displayOrder",
		order: "asc",
	});
	const { data: achievements = [], isLoading: achievementsLoading } = useAchievements({
		orderBy: "displayOrder",
		order: "asc",
	});
	const { data: references = [], isLoading: referencesLoading } = useReferences({
		orderBy: "displayOrder",
		order: "asc",
	});

	// Import store
	const initializeImport = useImportReviewStore((state) => state.initialize);

	// Section counts
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
		]
	);

	const handleImportPreview = useCallback(
		(payload: ResumeImportResponse) => {
			const context: ImportContextCounts = {
				workExperiences: workExperiences.length,
				education: education.length,
				skills: skills.length,
				projects: projects.length,
				certifications: certifications.length,
				achievements: achievements.length,
				references: references.length,
			};
			initializeImport(payload, context);
		},
		[
			initializeImport,
			workExperiences.length,
			education.length,
			skills.length,
			projects.length,
			certifications.length,
			achievements.length,
			references.length,
		]
	);

	if (profileLoading) {
		return <ProfilePageSkeleton />;
	}

	const renderSection = () => {
		switch (activeSection) {
			case "personal":
				return (
					<PersonalInfoSection
						profile={userProfile || null}
						onImportPreview={handleImportPreview}
					/>
				);
			case "experience":
				return (
					<ExperienceSection experiences={workExperiences} isLoading={workLoading} />
				);
			case "education":
				return <EducationSection education={education} isLoading={educationLoading} />;
			case "skills":
				return <SkillsSection skills={skills} isLoading={skillsLoading} />;
			case "projects":
				return <ProjectsSection projects={projects} isLoading={projectsLoading} />;
			case "certifications":
				return (
					<CertificationsSection
						certifications={certifications}
						isLoading={certificationsLoading}
					/>
				);
			case "achievements":
				return (
					<AchievementsSection achievements={achievements} isLoading={achievementsLoading} />
				);
			case "references":
				return <ReferencesSection references={references} isLoading={referencesLoading} />;
			default:
				return null;
		}
	};

	return (
		<div className="flex h-[calc(100vh-4rem)] overflow-hidden">
			{/* Mobile sidebar toggle */}
			<Button
				variant="ghost"
				size="icon"
				className="fixed left-4 top-20 z-50 lg:hidden"
				onClick={() => setIsSidebarOpen(!isSidebarOpen)}
			>
				{isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
			</Button>

			{/* Sidebar - hidden on mobile unless open */}
			<div
				className={`fixed inset-y-0 left-0 z-40 transform transition-transform duration-200 lg:relative lg:translate-x-0 ${
					isSidebarOpen ? "translate-x-0" : "-translate-x-full"
				}`}
			>
				<ProfileSidebar counts={counts} onImportPreview={handleImportPreview} />
			</div>

			{/* Overlay for mobile */}
			{isSidebarOpen && (
				<div
					className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm lg:hidden"
					onClick={() => setIsSidebarOpen(false)}
				/>
			)}

			{/* Main content */}
			<div className="flex-1 flex flex-col overflow-hidden">
				<ScrollArea className="flex-1">
					<div className="p-6 lg:p-8 max-w-4xl mx-auto">
						{renderSection()}
					</div>
				</ScrollArea>
				<PendingImportBanner />
			</div>
		</div>
	);
}
