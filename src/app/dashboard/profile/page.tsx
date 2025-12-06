"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Plus,
	User,
	Briefcase,
	GraduationCap,
	Code,
	FolderOpen,
	Award,
	Trophy,
	Users,
} from "lucide-react";
import { useUserProfile } from "@/app/dashboard/profile/queries/use-user-profile";
import { useWorkExperiences } from "@/app/dashboard/profile/queries/use-work-experiences";
import { useEducation } from "@/app/dashboard/profile/queries/use-education";
import { useSkills } from "@/app/dashboard/profile/queries/use-skills";
import { useProjects } from "@/app/dashboard/profile/queries/use-projects";
import { useCertifications } from "@/app/dashboard/profile/queries/use-certifications";
import { useAchievements } from "@/app/dashboard/profile/queries/use-achievements";
import { useReferences } from "@/app/dashboard/profile/queries/use-references";
import { UserProfileForm } from "@/app/dashboard/profile/components/user-profile-form";
import { WorkExperienceList } from "@/app/dashboard/profile/components/work-experience-list-new";
import { EducationList } from "@/app/dashboard/profile/components/education-list";
import { SkillsList } from "@/app/dashboard/profile/components/skills-list";
import { ProjectsList } from "@/app/dashboard/profile/components/projects-list";
import { CertificationsList } from "@/app/dashboard/profile/components/certifications-list";
import { AchievementsList } from "@/app/dashboard/profile/components/achievements-list";
import { ReferencesList } from "@/app/dashboard/profile/components/references-list";
import { ProfilePageSkeleton } from "./components/profile-page-skeleton";
import type { ResumeImportResponse } from "@/app/api/profile/resume-import/validators";
import { useImportReviewStore } from "@/app/dashboard/profile/store/import-review-store";
import type { ImportContextCounts } from "@/app/dashboard/profile/store/import-review-store";
import { useCreateWorkExperience } from "@/app/dashboard/profile/mutations/use-create-work-experience";
import { useCreateEducation } from "@/app/dashboard/profile/mutations/use-create-education";
import { useCreateSkill } from "@/app/dashboard/profile/mutations/use-create-skill";
import { useCreateProject } from "@/app/dashboard/profile/mutations/use-create-project";
import { useCreateCertification } from "@/app/dashboard/profile/mutations/use-create-certification";
import { useCreateAchievement } from "@/app/dashboard/profile/mutations/use-create-achievement";
import { useCreateReference } from "@/app/dashboard/profile/mutations/use-create-reference";
import { toast } from "sonner";

export default function ProfilePage() {
	const router = useRouter();
const [activeTab, setActiveTab] = useState("personal");
const [isSavingImport, setIsSavingImport] = useState(false);

	const { data: userProfile, isLoading: profileLoading } = useUserProfile();
	const { data: workExperiences = [], isLoading: workLoading } =
		useWorkExperiences({ orderBy: "displayOrder", order: "asc" });
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
	const { data: certifications = [], isLoading: certificationsLoading } =
		useCertifications({ orderBy: "displayOrder", order: "asc" });
	const { data: achievements = [], isLoading: achievementsLoading } =
		useAchievements({ orderBy: "displayOrder", order: "asc" });
	const { data: references = [], isLoading: referencesLoading } = useReferences(
		{ orderBy: "displayOrder", order: "asc" }
	);

	const createWorkExperienceMutation = useCreateWorkExperience();
	const createEducationMutation = useCreateEducation();
	const createSkillMutation = useCreateSkill();
	const createProjectMutation = useCreateProject();
	const createCertificationMutation = useCreateCertification();
const createAchievementMutation = useCreateAchievement();
const createReferenceMutation = useCreateReference();

	const initializeImport = useImportReviewStore((state) => state.initialize);
	const clearImport = useImportReviewStore((state) => state.clear);
	const pendingWorkExperiences = useImportReviewStore((state) => state.workExperiences);
	const pendingEducation = useImportReviewStore((state) => state.education);
	const pendingSkills = useImportReviewStore((state) => state.skills);
	const pendingProjects = useImportReviewStore((state) => state.projects);
	const pendingCertifications = useImportReviewStore((state) => state.certifications);
	const pendingAchievements = useImportReviewStore((state) => state.achievements);
	const pendingReferences = useImportReviewStore((state) => state.references);
const globalWarnings = useImportReviewStore((state) => state.warnings);

const pendingCounts = useMemo(() => ({
	workExperiences: pendingWorkExperiences.length,
	education: pendingEducation.length,
	skills: pendingSkills.length,
	projects: pendingProjects.length,
	certifications: pendingCertifications.length,
	achievements: pendingAchievements.length,
	references: pendingReferences.length,
}), [
	pendingWorkExperiences.length,
	pendingEducation.length,
	pendingSkills.length,
	pendingProjects.length,
	pendingCertifications.length,
	pendingAchievements.length,
	pendingReferences.length,
]);

const totalPendingItems = Object.values(pendingCounts).reduce((sum, count) => sum + count, 0);
const hasPendingDrafts = totalPendingItems > 0;

const pendingSummary = useMemo(() => {
	const summary: string[] = [];
	if (pendingCounts.workExperiences) {
		summary.push(`${pendingCounts.workExperiences} work experience${pendingCounts.workExperiences === 1 ? "" : "s"}`);
	}
	if (pendingCounts.education) {
		summary.push(`${pendingCounts.education} education entr${pendingCounts.education === 1 ? "y" : "ies"}`);
	}
	if (pendingCounts.skills) {
		summary.push(`${pendingCounts.skills} skill${pendingCounts.skills === 1 ? "" : "s"}`);
	}
	if (pendingCounts.projects) {
		summary.push(`${pendingCounts.projects} project${pendingCounts.projects === 1 ? "" : "s"}`);
	}
	if (pendingCounts.certifications) {
		summary.push(`${pendingCounts.certifications} certification${pendingCounts.certifications === 1 ? "" : "s"}`);
	}
	if (pendingCounts.achievements) {
		summary.push(`${pendingCounts.achievements} achievement${pendingCounts.achievements === 1 ? "" : "s"}`);
	}
	if (pendingCounts.references) {
		summary.push(`${pendingCounts.references} reference${pendingCounts.references === 1 ? "" : "s"}`);
	}
	return summary;
}, [pendingCounts]);

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
	[initializeImport, workExperiences.length, education.length, skills.length, projects.length, certifications.length, achievements.length, references.length]
);

	const handleDiscardImport = useCallback(() => {
		clearImport();
		toast.message("Imported data discarded");
	}, [clearImport]);

	const handleSaveImportedData = useCallback(async () => {
		if (!hasPendingDrafts) {
			toast.info("No pending items to save.");
			return;
		}

		setIsSavingImport(true);

		try {
			const summaryMessages: string[] = [];
			const warningMessages = [...globalWarnings];

			for (const item of pendingWorkExperiences) {
				await createWorkExperienceMutation.mutateAsync(item.request);
			}
			if (pendingWorkExperiences.length > 0) {
				summaryMessages.push(
					`${pendingWorkExperiences.length} work experience${pendingWorkExperiences.length === 1 ? "" : "s"}`
				);
			}

			for (const item of pendingEducation) {
				await createEducationMutation.mutateAsync(item.request);
			}
			if (pendingEducation.length > 0) {
				summaryMessages.push(
					`${pendingEducation.length} education entr${pendingEducation.length === 1 ? "y" : "ies"}`
				);
			}

			for (const item of pendingSkills) {
				await createSkillMutation.mutateAsync(item.request);
			}
			if (pendingSkills.length > 0) {
				summaryMessages.push(`${pendingSkills.length} skill${pendingSkills.length === 1 ? "" : "s"}`);
			}

			for (const item of pendingProjects) {
				await createProjectMutation.mutateAsync(item.request);
			}
			if (pendingProjects.length > 0) {
				summaryMessages.push(`${pendingProjects.length} project${pendingProjects.length === 1 ? "" : "s"}`);
			}

			for (const item of pendingCertifications) {
				await createCertificationMutation.mutateAsync(item.request);
			}
			if (pendingCertifications.length > 0) {
				summaryMessages.push(
					`${pendingCertifications.length} certification${pendingCertifications.length === 1 ? "" : "s"}`
				);
			}

			for (const item of pendingAchievements) {
				await createAchievementMutation.mutateAsync(item.request);
			}
			if (pendingAchievements.length > 0) {
				summaryMessages.push(
					`${pendingAchievements.length} achievement${pendingAchievements.length === 1 ? "" : "s"}`
				);
			}

			for (const item of pendingReferences) {
				await createReferenceMutation.mutateAsync(item.request);
			}
			if (pendingReferences.length > 0) {
				summaryMessages.push(`${pendingReferences.length} reference${pendingReferences.length === 1 ? "" : "s"}`);
			}

			clearImport();

			if (summaryMessages.length > 0) {
				toast.success(`Saved ${summaryMessages.join(", ")}.`);
			}
			if (warningMessages.length > 0) {
				const [firstWarning, ...restWarnings] = warningMessages;
				toast.warning(firstWarning, {
					description:
						restWarnings.length > 0
							? `+${restWarnings.length} additional warning${restWarnings.length === 1 ? "" : "s"}.`
							: undefined,
				});
			}
		} catch (error) {
			console.error("Failed to save imported resume data:", error);
			toast.error("Failed to save imported resume data. Please try again.");
		} finally {
			setIsSavingImport(false);
		}
	}, [
		hasPendingDrafts,
		pendingWorkExperiences,
		pendingEducation,
		pendingSkills,
		pendingProjects,
		pendingCertifications,
		pendingAchievements,
		pendingReferences,
		createWorkExperienceMutation,
		createEducationMutation,
		createSkillMutation,
		createProjectMutation,
		createCertificationMutation,
		createAchievementMutation,
		createReferenceMutation,
		globalWarnings,
		clearImport,
	]);

	const tabs = [
		{
			value: "personal",
			label: "Personal Info",
			icon: User,
			count: userProfile ? 1 : 0,
			component: (
				<UserProfileForm
					profile={userProfile || null}
					onImportPreview={handleImportPreview}
				/>
			),
		},
		{
			value: "experience",
			label: "Work Experience",
			icon: Briefcase,
			count: workExperiences.length + pendingCounts.workExperiences,
			component: (
				<WorkExperienceList
					experiences={workExperiences}
					isLoading={workLoading}
				/>
			),
		},
		{
			value: "education",
			label: "Education",
			icon: GraduationCap,
			count: education.length + pendingCounts.education,
			component: (
				<EducationList education={education} isLoading={educationLoading} />
			),
		},
		{
			value: "skills",
			label: "Skills",
			icon: Code,
			count: skills.length + pendingCounts.skills,
			component: <SkillsList skills={skills} isLoading={skillsLoading} />,
		},
		{
			value: "projects",
			label: "Projects",
			icon: FolderOpen,
			count: projects.length + pendingCounts.projects,
			component: (
				<ProjectsList projects={projects} isLoading={projectsLoading} />
			),
		},
		{
			value: "certifications",
			label: "Certifications",
			icon: Award,
			count: certifications.length + pendingCounts.certifications,
			component: (
				<CertificationsList
					certifications={certifications}
					isLoading={certificationsLoading}
				/>
			),
		},
		{
			value: "achievements",
			label: "Achievements",
			icon: Trophy,
			count: achievements.length + pendingCounts.achievements,
			component: (
				<AchievementsList
					achievements={achievements}
					isLoading={achievementsLoading}
				/>
			),
		},
		{
			value: "references",
			label: "References",
			icon: Users,
			count: references.length + pendingCounts.references,
			component: (
				<ReferencesList references={references} isLoading={referencesLoading} />
			),
		},
	];

	if (profileLoading) {
		return <ProfilePageSkeleton />;
	}

	return (
		<div className="space-y-6 p-4 sm:p-6">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl sm:text-3xl font-bold">Profile Management</h1>
					<p className="text-muted-foreground text-sm sm:text-base">
						Manage your professional profile information for resume generation
					</p>
				</div>
				<Button
					onClick={() => {
						// Navigate to resume generation with current profile data
						router.push("/dashboard/resumes/generate");
					}}
					className="shrink-0"
				>
					<Plus className="mr-2 h-4 w-4" />
					<span className="hidden sm:inline">Generate Resume</span>
					<span className="sm:hidden">Resume</span>
				</Button>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Profile Sections</CardTitle>
					<CardDescription>
						Complete your profile to generate professional resumes
					</CardDescription>
				</CardHeader>
				<CardContent className="p-4 sm:p-6">
					<Tabs
						value={activeTab}
						onValueChange={setActiveTab}
						className="w-full"
					>
						<TabsList className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 w-full h-auto gap-2">
							{tabs.map((tab) => (
								<TabsTrigger
									key={tab.value}
									value={tab.value}
									className="relative flex flex-col items-center justify-center gap-2 h-auto py-3 px-2 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground "
								>
									<tab.icon className="h-4 w-4 shrink-0" />
									<span className="text-center text-[10px] sm:text-xs leading-tight break-words">
										{tab.label}
									</span>
									<span className="absolute top-1.5 right-1.5 bg-blue-100 text-blue-800 data-[state=active]:bg-primary-foreground data-[state=active]:text-primary text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
										{tab.count}
									</span>
								</TabsTrigger>
							))}
						</TabsList>

						{tabs.map((tab) => (
							<TabsContent
								key={tab.value}
								value={tab.value}
								className="mt-6 px-0"
							>
								<div className="space-y-4">{tab.component}</div>
							</TabsContent>
						))}
					</Tabs>
				</CardContent>
			</Card>

			{hasPendingDrafts && (
				<div className="sticky bottom-0 left-0 right-0 z-20 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
					<div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
						<div className="space-y-1">
							<p className="text-sm font-medium">Imported resume data pending</p>
							<p className="text-xs text-muted-foreground">
								{pendingSummary.length > 0
									? `Drafts ready to review: ${pendingSummary.join(", ")}.`
									: "Review the imported entries, then choose Save to add them to your profile or Discard to start over."}
							</p>
						</div>
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								onClick={handleDiscardImport}
								disabled={isSavingImport}
							>
								Discard
							</Button>
							<Button
								onClick={handleSaveImportedData}
								disabled={isSavingImport}
							>
								{isSavingImport ? "Saving…" : "Save Imported Data"}
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
