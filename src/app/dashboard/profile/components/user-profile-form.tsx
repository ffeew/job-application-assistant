"use client";

import { type ChangeEvent, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Loader2, Save, Upload, User } from "lucide-react";
import { toast } from "sonner";
import { useCreateUserProfile } from "@/app/dashboard/profile/mutations/use-create-user-profile";
import { useUpdateUserProfile } from "@/app/dashboard/profile/mutations/use-update-user-profile";
import { useImportResume } from "@/app/dashboard/profile/mutations/use-import-resume";
import { createUserProfileSchema } from "@/app/api/profile/validators";
import type {
	CreateAchievementRequest,
	CreateCertificationRequest,
	CreateEducationRequest,
	CreateProjectRequest,
	CreateReferenceRequest,
	CreateSkillRequest,
	CreateUserProfileRequest,
	CreateWorkExperienceRequest,
	UserProfileResponse,
} from "@/app/api/profile/validators";
import type { ResumeImportResponse } from "@/app/api/profile/resume-import/validators";
import { useImportReviewStore } from "@/app/dashboard/profile/store/import-review-store";
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;

const formatSummary = (
	...parts: Array<string | null | undefined>
): string | null => {
	const filtered = parts
		.map((part) => (typeof part === "string" ? part.trim() : ""))
		.filter((part) => part.length > 0);

	if (filtered.length === 0) {
		return null;
	}

	return filtered.join(" · ");
};

type PreviewInput = {
	workExperiences: CreateWorkExperienceRequest[];
	education: CreateEducationRequest[];
	skills: CreateSkillRequest[];
	projects: CreateProjectRequest[];
	certifications: CreateCertificationRequest[];
	achievements: CreateAchievementRequest[];
	references: CreateReferenceRequest[];
};

const buildPreviewSections = (data: PreviewInput) => {
	const sections = [
		{
			label: "Work Experience",
			items: data.workExperiences
				.map((experience) =>
					formatSummary(
						experience.jobTitle,
						experience.company,
						experience.location ?? undefined,
					)
				)
				.filter((item): item is string => Boolean(item)),
		},
		{
			label: "Education",
			items: data.education
				.map((education) =>
					formatSummary(
						education.degree,
						education.institution,
						education.fieldOfStudy ?? undefined,
					)
				)
				.filter((item): item is string => Boolean(item)),
		},
		{
			label: "Skills",
			items: data.skills
				.map((skill, index) =>
					formatSummary(
						skill.name || `Skill ${index + 1}`,
						skill.category,
						skill.proficiencyLevel ?? undefined,
					)
				)
				.filter((item): item is string => Boolean(item)),
		},
		{
			label: "Projects",
			items: data.projects
				.map((project) =>
					formatSummary(
						project.title,
						project.description ?? undefined,
						project.technologies ?? undefined,
					)
				)
				.filter((item): item is string => Boolean(item)),
		},
		{
			label: "Certifications",
			items: data.certifications
				.map((certification) =>
					formatSummary(
						certification.name,
						certification.issuingOrganization,
					)
				)
				.filter((item): item is string => Boolean(item)),
		},
		{
			label: "Achievements",
			items: data.achievements
				.map((achievement) =>
					formatSummary(
						achievement.title,
						achievement.organization ?? undefined,
					)
				)
				.filter((item): item is string => Boolean(item)),
		},
		{
			label: "References",
			items: data.references
				.map((reference) =>
					formatSummary(
						reference.name,
						reference.company ?? undefined,
						reference.relationship ?? undefined,
					)
				)
				.filter((item): item is string => Boolean(item)),
		},
	];

	return sections.filter((section) => section.items.length > 0);
};

interface UserProfileFormProps {
	profile: UserProfileResponse | null;
	onImportPreview: (data: ResumeImportResponse) => void;
}

export function UserProfileForm({ profile, onImportPreview }: UserProfileFormProps) {
	const createMutation = useCreateUserProfile();
	const updateMutation = useUpdateUserProfile();
	const importResumeMutation = useImportResume();

const form = useForm({
	resolver: zodResolver(createUserProfileSchema),
	defaultValues: {
		firstName: null,
		lastName: null,
		email: null,
		phone: null,
		address: null,
		city: null,
		state: null,
		zipCode: null,
		country: null,
		linkedinUrl: null,
		githubUrl: null,
		portfolioUrl: null,
		professionalSummary: null,
	},
});

const fileInputRef = useRef<HTMLInputElement | null>(null);

	const profileDraft = useImportReviewStore((state) => state.profile);
	const pendingWorkExperiences = useImportReviewStore((state) => state.workExperiences);
	const pendingEducation = useImportReviewStore((state) => state.education);
	const pendingSkills = useImportReviewStore((state) => state.skills);
	const pendingProjects = useImportReviewStore((state) => state.projects);
	const pendingCertifications = useImportReviewStore((state) => state.certifications);
	const pendingAchievements = useImportReviewStore((state) => state.achievements);
	const pendingReferences = useImportReviewStore((state) => state.references);

	const previewSections = buildPreviewSections({
		workExperiences: pendingWorkExperiences.map((item) => item.request),
		education: pendingEducation.map((item) => item.request),
		skills: pendingSkills.map((item) => item.request),
		projects: pendingProjects.map((item) => item.request),
		certifications: pendingCertifications.map((item) => item.request),
		achievements: pendingAchievements.map((item) => item.request),
		references: pendingReferences.map((item) => item.request),
	});
	const hasPreviewSections = previewSections.length > 0;

	const {
		register,
		handleSubmit,
		reset,
		formState: { errors, isSubmitting },
	} = form;

	useEffect(() => {
		if (profile) {
			reset({
				firstName: profile.firstName,
				lastName: profile.lastName,
				email: profile.email,
				phone: profile.phone,
				address: profile.address,
				city: profile.city,
				state: profile.state,
				zipCode: profile.zipCode,
				country: profile.country,
				linkedinUrl: profile.linkedinUrl,
				githubUrl: profile.githubUrl,
				portfolioUrl: profile.portfolioUrl,
				professionalSummary: profile.professionalSummary,
			});
		}
	}, [profile, reset]);

	const onSubmit = async (data: unknown) => {
		const mutation = profile ? updateMutation : createMutation;
		// Data is validated by Zod resolver, safe to cast
		const validatedData = data as CreateUserProfileRequest;

		mutation.mutate(validatedData, {
			onSuccess: () => {
				toast.success(
					profile
						? "Profile updated successfully!"
						: "Profile created successfully!"
				);
				// Success is handled by React Query cache updates
			},
			onError: (error) => {
				console.error("Error saving profile:", error);
				toast.error("Error saving profile. Please try again.");
			},
		});
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
				reset(payload.profile);
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
		<Card>
			<CardHeader className="space-y-4">
				<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
					<CardTitle className="flex items-center gap-2">
						<User className="h-5 w-5" />
						Personal Information
					</CardTitle>
					<div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center md:justify-end">
						<input
							ref={fileInputRef}
							type="file"
							accept=".pdf,.doc,.docx,.txt"
							className="hidden"
							onChange={handleResumeFileChange}
						/>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={handleResumeImportClick}
							disabled={importResumeMutation.isPending}
							className="w-full justify-center md:w-auto"
						>
							{importResumeMutation.isPending ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : (
								<Upload className="mr-2 h-4 w-4" />
							)}
							{importResumeMutation.isPending ? "Importing..." : "Import from Resume"}
						</Button>
						<p className="text-xs text-muted-foreground md:text-right">
							Supports PDF, DOC, and DOCX files.
						</p>
					</div>
		</div>
		<CardDescription>
			Basic personal information for your professional profile
		</CardDescription>
		{profileDraft.warnings.length > 0 && (
			<div className="rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-900 dark:border-yellow-500/60 dark:bg-yellow-950/70 dark:text-yellow-100">
				<p className="font-semibold">Check the imported details:</p>
				<ul className="mt-2 list-disc space-y-1 pl-4">
					{profileDraft.warnings.map((warning) => (
						<li key={warning}>{warning}</li>
					))}
				</ul>
			</div>
		)}
		{hasPreviewSections && (
			<div className="rounded-md border border-muted bg-muted/40 p-3 text-sm text-foreground">
				<p className="font-semibold">Imported resume details pending review</p>
				<p className="mt-1 text-xs text-muted-foreground">
					Nothing has been saved yet. Review the summary below, then switch to each tab to edit and store the entries you want to keep.
				</p>
				<div className="mt-3 space-y-3">
					{previewSections.map((section) => (
						<div key={section.label}>
							<p className="text-xs font-semibold uppercase tracking-wide text-foreground">
								{section.label} ({section.items.length})
							</p>
							<ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
								{section.items.slice(0, 3).map((item, index) => (
									<li key={`${section.label}-${index}`}>{item}</li>
								))}
								{section.items.length > 3 && (
									<li className="italic text-muted-foreground/80">
										+{section.items.length - 3} more…
									</li>
								)}
							</ul>
						</div>
					))}
				</div>
			</div>
		)}
	</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="flex flex-col gap-2">
							<Label htmlFor="firstName">First Name</Label>
							<Input
								id="firstName"
								{...register("firstName")}
								placeholder="John"
							/>
							{errors.firstName && (
								<p className="text-red-500 text-sm mt-1">
									{errors.firstName.message}
								</p>
							)}
						</div>
						<div className="flex flex-col gap-2">
							<Label htmlFor="lastName">Last Name</Label>
							<Input
								id="lastName"
								{...register("lastName")}
								placeholder="Doe"
							/>
							{errors.lastName && (
								<p className="text-red-500 text-sm mt-1">
									{errors.lastName.message}
								</p>
							)}
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="flex flex-col gap-2">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								{...register("email")}
								placeholder="john.doe@example.com"
							/>
							{errors.email && (
								<p className="text-red-500 text-sm mt-1">
									{errors.email.message}
								</p>
							)}
						</div>
						<div className="flex flex-col gap-2">
							<Label htmlFor="phone">Phone</Label>
							<Input
								id="phone"
								{...register("phone")}
								placeholder="+1 (555) 123-4567"
							/>
							{errors.phone && (
								<p className="text-red-500 text-sm mt-1">
									{errors.phone.message}
								</p>
							)}
						</div>
					</div>

					<div className="flex flex-col gap-2">
						<Label htmlFor="address">Address</Label>
						<Input
							id="address"
							{...register("address")}
							placeholder="123 Main Street"
						/>
						{errors.address && (
							<p className="text-red-500 text-sm mt-1">
								{errors.address.message}
							</p>
						)}
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div className="flex flex-col gap-2">
							<Label htmlFor="city">City</Label>
							<Input id="city" {...register("city")} placeholder="New York" />
							{errors.city && (
								<p className="text-red-500 text-sm mt-1">
									{errors.city.message}
								</p>
							)}
						</div>
						<div className="flex flex-col gap-2">
							<Label htmlFor="state">State/Province</Label>
							<Input id="state" {...register("state")} placeholder="NY" />
							{errors.state && (
								<p className="text-red-500 text-sm mt-1">
									{errors.state.message}
								</p>
							)}
						</div>
						<div className="flex flex-col gap-2">
							<Label htmlFor="zipCode">ZIP/Postal Code</Label>
							<Input
								id="zipCode"
								{...register("zipCode")}
								placeholder="10001"
							/>
							{errors.zipCode && (
								<p className="text-red-500 text-sm mt-1">
									{errors.zipCode.message}
								</p>
							)}
						</div>
					</div>

					<div className="flex flex-col gap-2">
						<Label htmlFor="country">Country</Label>
						<Input
							id="country"
							{...register("country")}
							placeholder="United States"
						/>
						{errors.country && (
							<p className="text-red-500 text-sm mt-1">
								{errors.country.message}
							</p>
						)}
					</div>

					<div className="flex flex-col gap-4">
						<h3 className="text-lg font-semibold">Professional Links</h3>

						<div className="flex flex-col gap-2">
							<Label htmlFor="linkedinUrl">LinkedIn URL</Label>
							<Input
								id="linkedinUrl"
								type="url"
								{...register("linkedinUrl")}
								placeholder="https://linkedin.com/in/johndoe"
							/>
							{errors.linkedinUrl && (
								<p className="text-red-500 text-sm mt-1">
									{errors.linkedinUrl.message}
								</p>
							)}
						</div>

						<div className="flex flex-col gap-2">
							<Label htmlFor="githubUrl">GitHub URL</Label>
							<Input
								id="githubUrl"
								type="url"
								{...register("githubUrl")}
								placeholder="https://github.com/johndoe"
							/>
							{errors.githubUrl && (
								<p className="text-red-500 text-sm mt-1">
									{errors.githubUrl.message}
								</p>
							)}
						</div>

						<div className="flex flex-col gap-2">
							<Label htmlFor="portfolioUrl">Portfolio URL</Label>
							<Input
								id="portfolioUrl"
								type="url"
								{...register("portfolioUrl")}
								placeholder="https://johndoe.com"
							/>
							{errors.portfolioUrl && (
								<p className="text-red-500 text-sm mt-1">
									{errors.portfolioUrl.message}
								</p>
							)}
						</div>
					</div>

					<div className="flex flex-col gap-2">
						<Label htmlFor="professionalSummary">Professional Summary</Label>
						<Textarea
							id="professionalSummary"
							{...register("professionalSummary")}
							placeholder="Brief overview of your professional background, skills, and career objectives..."
							rows={4}
						/>
						{errors.professionalSummary && (
							<p className="text-red-500 text-sm mt-1">
								{errors.professionalSummary.message}
							</p>
						)}
					</div>

					<div className="flex justify-end">
						<Button type="submit" disabled={isSubmitting}>
							<Save className="mr-2 h-4 w-4" />
							{isSubmitting
								? "Saving..."
								: profile
								? "Update Profile"
								: "Create Profile"}
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	);
}
