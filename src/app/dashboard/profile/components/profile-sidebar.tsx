"use client";

import { useRef, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
	User,
	Briefcase,
	GraduationCap,
	Code,
	FolderOpen,
	Award,
	Trophy,
	Users,
	Upload,
	FileText,
	Loader2,
} from "lucide-react";
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
	icon: React.ElementType;
}

const sections: SectionItem[] = [
	{ id: "personal", label: "Personal Info", icon: User },
	{ id: "experience", label: "Work Experience", icon: Briefcase },
	{ id: "education", label: "Education", icon: GraduationCap },
	{ id: "skills", label: "Skills", icon: Code },
	{ id: "projects", label: "Projects", icon: FolderOpen },
	{ id: "certifications", label: "Certifications", icon: Award },
	{ id: "achievements", label: "Achievements", icon: Trophy },
	{ id: "references", label: "References", icon: Users },
];

interface ProfileSidebarProps {
	counts: Record<ProfileSection, number>;
	onImportPreview: (data: ResumeImportResponse) => void;
}

export function ProfileSidebar({ counts, onImportPreview }: ProfileSidebarProps) {
	const router = useRouter();
	const activeSection = useProfileUIStore((state) => state.activeSection);
	const setActiveSection = useProfileUIStore((state) => state.setActiveSection);
	const importResumeMutation = useImportResume();
	const fileInputRef = useRef<HTMLInputElement | null>(null);

	const pendingCounts = {
		experience: useImportReviewStore((state) => state.workExperiences.length),
		education: useImportReviewStore((state) => state.education.length),
		skills: useImportReviewStore((state) => state.skills.length),
		projects: useImportReviewStore((state) => state.projects.length),
		certifications: useImportReviewStore((state) => state.certifications.length),
		achievements: useImportReviewStore((state) => state.achievements.length),
		references: useImportReviewStore((state) => state.references.length),
		personal: 0,
	};

	const handleResumeImportClick = () => {
		fileInputRef.current?.click();
	};

	const handleResumeFileChange = (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) {
			return;
		}

		if (file.size > MAX_FILE_SIZE_BYTES) {
			toast.error("Resume is too large. Please upload a file under 8 MB.");
			event.target.value = "";
			return;
		}

		importResumeMutation.mutate(file, {
			onSuccess: (payload) => {
				onImportPreview(payload);
				toast.success("Resume imported. Review the pending details below before saving.");
			},
			onError: (error) => {
				console.error("Resume import failed:", error);
				toast.error(error.message || "Failed to import resume. Please try again.");
			},
			onSettled: () => {
				event.target.value = "";
			},
		});
	};

	return (
		<div className="flex h-full w-64 flex-col border-r bg-muted/30">
			<div className="p-4 border-b">
				<h2 className="text-lg font-semibold">Profile</h2>
				<p className="text-sm text-muted-foreground">Manage your information</p>
			</div>

			<ScrollArea className="flex-1">
				<nav className="flex flex-col gap-1 p-2">
					{sections.map((section) => {
						const Icon = section.icon;
						const count = counts[section.id] + pendingCounts[section.id];
						const isActive = activeSection === section.id;
						const hasPending = pendingCounts[section.id] > 0;

						return (
							<button
								key={section.id}
								onClick={() => setActiveSection(section.id)}
								className={cn(
									"flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors",
									"hover:bg-accent hover:text-accent-foreground",
									isActive && "bg-accent text-accent-foreground"
								)}
							>
								<div className="flex items-center gap-3">
									<Icon className="h-4 w-4" />
									<span>{section.label}</span>
								</div>
								<div className="flex items-center gap-1.5">
									{hasPending && (
										<span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
									)}
									<span
										className={cn(
											"min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-center text-xs",
											isActive
												? "bg-primary text-primary-foreground"
												: "bg-muted text-muted-foreground"
										)}
									>
										{count}
									</span>
								</div>
							</button>
						);
					})}
				</nav>
			</ScrollArea>

			<div className="border-t p-3 space-y-2">
				<input
					ref={fileInputRef}
					type="file"
					accept=".pdf,.doc,.docx,.txt"
					className="hidden"
					onChange={handleResumeFileChange}
				/>
				<Button
					variant="outline"
					size="sm"
					className="w-full justify-start"
					onClick={handleResumeImportClick}
					disabled={importResumeMutation.isPending}
				>
					{importResumeMutation.isPending ? (
						<Loader2 className="mr-2 h-4 w-4 animate-spin" />
					) : (
						<Upload className="mr-2 h-4 w-4" />
					)}
					{importResumeMutation.isPending ? "Importing..." : "Import Resume"}
				</Button>
				<Button
					variant="default"
					size="sm"
					className="w-full justify-start"
					onClick={() => router.push("/dashboard/resumes/generate")}
				>
					<FileText className="mr-2 h-4 w-4" />
					Generate Resume
				</Button>
			</div>
		</div>
	);
}
