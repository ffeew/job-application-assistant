"use client";

import { useRef, type ChangeEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Upload, FileText, Loader2 } from "lucide-react";
import {
	useProfileUIStore,
	type ProfileSection,
} from "@/app/dashboard/profile/store/profile-ui-store";
import { useImportResume } from "@/app/dashboard/profile/mutations/use-import-resume";
import { useImportReviewStore } from "@/app/dashboard/profile/store/import-review-store";
import type { ResumeImportResponse } from "@/app/api/profile/resume-import/validators";
import { toast } from "sonner";

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;

interface SectionItem {
	id: ProfileSection;
	label: string;
}

const sections: SectionItem[] = [
	{ id: "personal", label: "Personal information" },
	{ id: "experience", label: "Work experience" },
	{ id: "education", label: "Education" },
	{ id: "skills", label: "Skills" },
	{ id: "projects", label: "Projects" },
	{ id: "certifications", label: "Certifications" },
	{ id: "achievements", label: "Achievements" },
	{ id: "references", label: "References" },
	{ id: "files", label: "Imported files" },
];

interface SectionIndexProps {
	counts: Record<ProfileSection, number>;
}

export function SectionIndex({ counts }: SectionIndexProps) {
	const activeSection = useProfileUIStore((state) => state.activeSection);
	const setActiveSection = useProfileUIStore((state) => state.setActiveSection);

	const pendingCounts = {
		experience: useImportReviewStore((state) => state.workExperiences.length),
		education: useImportReviewStore((state) => state.education.length),
		skills: useImportReviewStore((state) => state.skills.length),
		projects: useImportReviewStore((state) => state.projects.length),
		certifications: useImportReviewStore((state) => state.certifications.length),
		achievements: useImportReviewStore((state) => state.achievements.length),
		references: useImportReviewStore((state) => state.references.length),
		personal: 0,
		files: 0,
	};

	return (
		<nav aria-label="Profile sections" className="max-lg:-mx-5 max-lg:overflow-x-auto max-lg:px-5 sm:max-lg:-mx-8 sm:max-lg:px-8">
			<ul className="flex gap-1 lg:flex-col lg:gap-0.5">
				{sections.map((section) => {
					const count = counts[section.id] + pendingCounts[section.id];
					const isActive = activeSection === section.id;
					const hasPending = pendingCounts[section.id] > 0;

					return (
						<li key={section.id} className="shrink-0">
							<button
								type="button"
								aria-current={isActive ? "true" : undefined}
								onClick={() => setActiveSection(section.id)}
								className={cn(
									"flex min-h-10 w-full items-center justify-between gap-3 rounded-md px-3 text-left text-sm whitespace-nowrap transition-colors",
									isActive
										? "bg-card border-input border font-semibold"
										: "text-muted-foreground hover:bg-accent hover:text-foreground border border-transparent",
								)}
							>
								{section.label}
								<span className="flex items-center gap-1.5 tabular-nums">
									{hasPending && (
										<>
											<span aria-hidden="true" className="bg-link size-2 rounded-full" />
											<span className="sr-only">has imported items to review,</span>
										</>
									)}
									{/* Personal information is one record, so a count would only ever say 0 or 1. */}
									{section.id !== "personal" && count}
								</span>
							</button>
						</li>
					);
				})}
			</ul>
		</nav>
	);
}

interface ProfileActionsProps {
	onImportPreview: (data: ResumeImportResponse) => void;
}

export function ProfileActions({ onImportPreview }: ProfileActionsProps) {
	const importResumeMutation = useImportResume();
	const fileInputRef = useRef<HTMLInputElement | null>(null);

	const handleResumeFileChange = (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) {
			return;
		}

		if (file.size > MAX_FILE_SIZE_BYTES) {
			toast.error("That file is over 8 MB. Choose a smaller one.");
			event.target.value = "";
			return;
		}

		importResumeMutation.mutate(file, {
			onSuccess: (payload) => {
				onImportPreview(payload);
				toast.success("Resume imported. Review each section before saving.");
			},
			onError: (error) => {
				toast.error(error.message || "Couldn't import that resume. Try again.");
			},
			onSettled: () => {
				event.target.value = "";
			},
		});
	};

	return (
		<>
			<input
				ref={fileInputRef}
				type="file"
				accept=".pdf,.docx,.txt"
				className="hidden"
				onChange={handleResumeFileChange}
			/>
			<Button
				variant="outline"
				onClick={() => fileInputRef.current?.click()}
				disabled={importResumeMutation.isPending}
			>
				{importResumeMutation.isPending ? (
					<Loader2 className="animate-spin" />
				) : (
					<Upload />
				)}
				{importResumeMutation.isPending ? "Importing…" : "Import resume"}
			</Button>
			<Button asChild>
				<Link href="/dashboard/resumes/generate">
					<FileText />
					Generate resume
				</Link>
			</Button>
		</>
	);
}
