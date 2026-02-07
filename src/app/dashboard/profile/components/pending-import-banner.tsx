"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useImportReviewStore } from "@/app/dashboard/profile/store/import-review-store";
import { useCreateWorkExperience } from "@/app/dashboard/profile/mutations/use-create-work-experience";
import { useCreateEducation } from "@/app/dashboard/profile/mutations/use-create-education";
import { useCreateSkill } from "@/app/dashboard/profile/mutations/use-create-skill";
import { useCreateProject } from "@/app/dashboard/profile/mutations/use-create-project";
import { useCreateCertification } from "@/app/dashboard/profile/mutations/use-create-certification";
import { useCreateAchievement } from "@/app/dashboard/profile/mutations/use-create-achievement";
import { useCreateReference } from "@/app/dashboard/profile/mutations/use-create-reference";

export function PendingImportBanner() {
	const [isSaving, setIsSaving] = useState(false);

	const clearImport = useImportReviewStore((state) => state.clear);
	const pendingWorkExperiences = useImportReviewStore((state) => state.workExperiences);
	const pendingEducation = useImportReviewStore((state) => state.education);
	const pendingSkills = useImportReviewStore((state) => state.skills);
	const pendingProjects = useImportReviewStore((state) => state.projects);
	const pendingCertifications = useImportReviewStore((state) => state.certifications);
	const pendingAchievements = useImportReviewStore((state) => state.achievements);
	const pendingReferences = useImportReviewStore((state) => state.references);
	const globalWarnings = useImportReviewStore((state) => state.warnings);

	const createWorkExperienceMutation = useCreateWorkExperience();
	const createEducationMutation = useCreateEducation();
	const createSkillMutation = useCreateSkill();
	const createProjectMutation = useCreateProject();
	const createCertificationMutation = useCreateCertification();
	const createAchievementMutation = useCreateAchievement();
	const createReferenceMutation = useCreateReference();

	const pendingCounts = useMemo(
		() => ({
			workExperiences: pendingWorkExperiences.length,
			education: pendingEducation.length,
			skills: pendingSkills.length,
			projects: pendingProjects.length,
			certifications: pendingCertifications.length,
			achievements: pendingAchievements.length,
			references: pendingReferences.length,
		}),
		[
			pendingWorkExperiences.length,
			pendingEducation.length,
			pendingSkills.length,
			pendingProjects.length,
			pendingCertifications.length,
			pendingAchievements.length,
			pendingReferences.length,
		]
	);

	const totalPendingItems = Object.values(pendingCounts).reduce(
		(sum, count) => sum + count,
		0
	);

	const pendingSummary = useMemo(() => {
		const summary: string[] = [];
		if (pendingCounts.workExperiences) {
			summary.push(
				`${pendingCounts.workExperiences} experience${pendingCounts.workExperiences === 1 ? "" : "s"}`
			);
		}
		if (pendingCounts.education) {
			summary.push(
				`${pendingCounts.education} education`
			);
		}
		if (pendingCounts.skills) {
			summary.push(
				`${pendingCounts.skills} skill${pendingCounts.skills === 1 ? "" : "s"}`
			);
		}
		if (pendingCounts.projects) {
			summary.push(
				`${pendingCounts.projects} project${pendingCounts.projects === 1 ? "" : "s"}`
			);
		}
		if (pendingCounts.certifications) {
			summary.push(
				`${pendingCounts.certifications} certification${pendingCounts.certifications === 1 ? "" : "s"}`
			);
		}
		if (pendingCounts.achievements) {
			summary.push(
				`${pendingCounts.achievements} achievement${pendingCounts.achievements === 1 ? "" : "s"}`
			);
		}
		if (pendingCounts.references) {
			summary.push(
				`${pendingCounts.references} reference${pendingCounts.references === 1 ? "" : "s"}`
			);
		}
		return summary;
	}, [pendingCounts]);

	const handleDiscard = () => {
		clearImport();
		toast.message("Imported data discarded");
	};

	const handleSaveAll = async () => {
		if (totalPendingItems === 0) {
			toast.info("No pending items to save.");
			return;
		}

		setIsSaving(true);

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
				summaryMessages.push(
					`${pendingSkills.length} skill${pendingSkills.length === 1 ? "" : "s"}`
				);
			}

			for (const item of pendingProjects) {
				await createProjectMutation.mutateAsync(item.request);
			}
			if (pendingProjects.length > 0) {
				summaryMessages.push(
					`${pendingProjects.length} project${pendingProjects.length === 1 ? "" : "s"}`
				);
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
				summaryMessages.push(
					`${pendingReferences.length} reference${pendingReferences.length === 1 ? "" : "s"}`
				);
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
			toast.error("Failed to save imported data. Please try again.");
		} finally {
			setIsSaving(false);
		}
	};

	if (totalPendingItems === 0) {
		return null;
	}

	return (
		<div className="sticky bottom-0 left-0 right-0 z-20 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
			<div className="flex flex-col gap-3 px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="space-y-1">
					<p className="text-sm font-medium">
						{totalPendingItems} imported item{totalPendingItems !== 1 ? "s" : ""} pending
					</p>
					<p className="text-xs text-muted-foreground">
						{pendingSummary.join(", ")}
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={handleDiscard}
						disabled={isSaving}
					>
						Discard All
					</Button>
					<Button size="sm" onClick={handleSaveAll} disabled={isSaving}>
						{isSaving ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Saving...
							</>
						) : (
							"Save All"
						)}
					</Button>
				</div>
			</div>
		</div>
	);
}
