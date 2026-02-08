"use client";

import { type ChangeEvent, useEffect, useRef } from "react";
import { useForm, type UseFormRegister, type UseFormHandleSubmit, type FieldValues, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import {
	Loader2,
	Save,
	Upload,
	User,
	Mail,
	Phone,
	MapPin,
	Globe,
	Github,
	Linkedin,
	Edit,
} from "lucide-react";
import { toast } from "sonner";
import { useCreateUserProfile } from "@/app/dashboard/profile/mutations/use-create-user-profile";
import { useUpdateUserProfile } from "@/app/dashboard/profile/mutations/use-update-user-profile";
import { useImportResume } from "@/app/dashboard/profile/mutations/use-import-resume";
import { createUserProfileSchema } from "@/app/api/profile/validators";
import type { CreateUserProfileRequest, UserProfileResponse } from "@/app/api/profile/validators";
import type { ResumeImportResponse } from "@/app/api/profile/resume-import/validators";
import { FormFieldError } from "@/components/ui/form-field-error";
import { useImportReviewStore } from "@/app/dashboard/profile/store/import-review-store";
import { useProfileUIStore } from "@/app/dashboard/profile/store/profile-ui-store";

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;

interface PersonalInfoSectionProps {
	profile: UserProfileResponse | null;
	onImportPreview: (data: ResumeImportResponse) => void;
}

export function PersonalInfoSection({ profile, onImportPreview }: PersonalInfoSectionProps) {
	const createMutation = useCreateUserProfile();
	const updateMutation = useUpdateUserProfile();
	const importResumeMutation = useImportResume();
	const fileInputRef = useRef<HTMLInputElement | null>(null);

	const editingState = useProfileUIStore((state) => state.editingState);
	const isSheetOpen = useProfileUIStore((state) => state.isSheetOpen);
	const startEditing = useProfileUIStore((state) => state.startEditing);
	const startAdding = useProfileUIStore((state) => state.startAdding);
	const cancelEditing = useProfileUIStore((state) => state.cancelEditing);

	const isEditing =
		isSheetOpen && editingState?.section === "personal";

	const profileDraft = useImportReviewStore((state) => state.profile);

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
		const validatedData = data as CreateUserProfileRequest;

		mutation.mutate(validatedData, {
			onSuccess: () => {
				toast.success(profile ? "Profile updated successfully!" : "Profile created successfully!");
				cancelEditing();
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
		if (!file) return;

		if (file.size > MAX_FILE_SIZE_BYTES) {
			toast.error("Resume is too large. Please upload a file under 8 MB.");
			event.target.value = "";
			return;
		}

		importResumeMutation.mutate(file, {
			onSuccess: (payload) => {
				reset(payload.profile);
				onImportPreview(payload);
				toast.success("Resume imported. Review the pending details before saving.");
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

	const handleEditClick = () => {
		if (profile) {
			startEditing("personal", profile.id);
		} else {
			startAdding("personal");
		}
	};

	// Empty state
	if (!profile) {
		return (
			<>
				<div className="flex flex-col gap-6">
					<div>
						<h1 className="text-2xl font-bold">Personal Information</h1>
						<p className="text-muted-foreground">Your basic contact and professional information</p>
					</div>

					<Card className="border-dashed">
						<CardContent className="flex flex-col items-center justify-center py-12 text-center">
							<User className="h-12 w-12 text-muted-foreground mb-4" />
							<h3 className="text-lg font-semibold mb-2">No profile created yet</h3>
							<p className="text-muted-foreground mb-6 max-w-md">
								Add your personal information to get started building your professional profile.
							</p>
							<div className="flex gap-3">
								<input
									ref={fileInputRef}
									type="file"
									accept=".pdf,.doc,.docx,.txt"
									className="hidden"
									onChange={handleResumeFileChange}
								/>
								<Button variant="outline" onClick={handleResumeImportClick} disabled={importResumeMutation.isPending}>
									{importResumeMutation.isPending ? (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									) : (
										<Upload className="mr-2 h-4 w-4" />
									)}
									Import from Resume
								</Button>
								<Button onClick={handleEditClick}>
									<User className="mr-2 h-4 w-4" />
									Add Profile
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>

				<Sheet open={isEditing} onOpenChange={(open) => !open && cancelEditing()}>
					<SheetContent className="w-full sm:max-w-lg overflow-y-auto">
						<SheetHeader>
							<SheetTitle>Create Profile</SheetTitle>
							<SheetDescription>Add your personal and professional information</SheetDescription>
						</SheetHeader>
						<ProfileForm
							register={register as unknown as UseFormRegister<FieldValues>}
							errors={errors as FieldErrors<FieldValues>}
							isSubmitting={isSubmitting}
							handleSubmit={handleSubmit as UseFormHandleSubmit<FieldValues>}
							onSubmit={onSubmit}
							onCancel={cancelEditing}
							submitLabel="Create Profile"
						/>
					</SheetContent>
				</Sheet>
			</>
		);
	}

	// Display existing profile
	const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ");
	const location = [profile.city, profile.state, profile.country].filter(Boolean).join(", ");

	return (
		<>
			<div className="flex flex-col gap-6">
				<div className="flex items-start justify-between">
					<div>
						<h1 className="text-2xl font-bold">Personal Information</h1>
						<p className="text-muted-foreground">Your basic contact and professional information</p>
					</div>
					<Button variant="outline" size="sm" onClick={handleEditClick}>
						<Edit className="mr-2 h-4 w-4" />
						Edit
					</Button>
				</div>

				{profileDraft.warnings.length > 0 && (
					<Card className="border-yellow-300 bg-yellow-50 dark:border-yellow-500/60 dark:bg-yellow-950/70">
						<CardContent className="pt-4">
							<p className="font-semibold text-yellow-900 dark:text-yellow-100">
								Check the imported details:
							</p>
							<ul className="mt-2 flex list-disc flex-col gap-1 pl-4 text-sm text-yellow-800 dark:text-yellow-200">
								{profileDraft.warnings.map((warning) => (
									<li key={warning}>{warning}</li>
								))}
							</ul>
						</CardContent>
					</Card>
				)}

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<User className="h-5 w-5" />
							{fullName || "Your Name"}
						</CardTitle>
						{profile.professionalSummary && (
							<CardDescription className="text-base whitespace-pre-wrap">
								{profile.professionalSummary}
							</CardDescription>
						)}
					</CardHeader>
					<CardContent className="flex flex-col gap-4">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{profile.email && (
								<div className="flex items-center gap-2 text-sm">
									<Mail className="h-4 w-4 text-muted-foreground" />
									<span>{profile.email}</span>
								</div>
							)}
							{profile.phone && (
								<div className="flex items-center gap-2 text-sm">
									<Phone className="h-4 w-4 text-muted-foreground" />
									<span>{profile.phone}</span>
								</div>
							)}
							{location && (
								<div className="flex items-center gap-2 text-sm">
									<MapPin className="h-4 w-4 text-muted-foreground" />
									<span>{location}</span>
								</div>
							)}
						</div>

						{(profile.linkedinUrl || profile.githubUrl || profile.portfolioUrl) && (
							<div className="flex flex-wrap gap-3 pt-2 border-t">
								{profile.linkedinUrl && (
									<a
										href={profile.linkedinUrl}
										target="_blank"
										rel="noopener noreferrer"
										className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
									>
										<Linkedin className="h-4 w-4" />
										<span>LinkedIn</span>
									</a>
								)}
								{profile.githubUrl && (
									<a
										href={profile.githubUrl}
										target="_blank"
										rel="noopener noreferrer"
										className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
									>
										<Github className="h-4 w-4" />
										<span>GitHub</span>
									</a>
								)}
								{profile.portfolioUrl && (
									<a
										href={profile.portfolioUrl}
										target="_blank"
										rel="noopener noreferrer"
										className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
									>
										<Globe className="h-4 w-4" />
										<span>Portfolio</span>
									</a>
								)}
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			<Sheet open={isEditing} onOpenChange={(open) => !open && cancelEditing()}>
				<SheetContent className="w-full sm:max-w-lg overflow-y-auto">
					<SheetHeader>
						<SheetTitle>Edit Profile</SheetTitle>
						<SheetDescription>Update your personal and professional information</SheetDescription>
					</SheetHeader>
					<ProfileForm
						register={register as unknown as UseFormRegister<FieldValues>}
						errors={errors as FieldErrors<FieldValues>}
						isSubmitting={isSubmitting}
						handleSubmit={handleSubmit as UseFormHandleSubmit<FieldValues>}
						onSubmit={onSubmit}
						onCancel={cancelEditing}
						submitLabel="Save Changes"
					/>
				</SheetContent>
			</Sheet>
		</>
	);
}

// Extracted form component to avoid repetition
interface ProfileFormProps {
	register: UseFormRegister<FieldValues>;
	errors: FieldErrors<FieldValues>;
	isSubmitting: boolean;
	handleSubmit: UseFormHandleSubmit<FieldValues>;
	onSubmit: (data: unknown) => Promise<void>;
	onCancel: () => void;
	submitLabel: string;
}

function ProfileForm({
	register,
	errors,
	isSubmitting,
	handleSubmit,
	onSubmit,
	onCancel,
	submitLabel,
}: ProfileFormProps) {
	const getErrorMessage = (field: string) => {
		const error = errors[field];
		return error?.message ? String(error.message) : null;
	};

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6 p-4 pt-2">
			<div className="flex flex-col gap-4">
				<h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
					Basic Information
				</h3>
				<div className="grid grid-cols-2 gap-4">
					<div className="flex flex-col gap-2">
						<Label htmlFor="firstName">First Name</Label>
						<Input id="firstName" {...register("firstName")} placeholder="John" />
						{getErrorMessage("firstName") && (
							<FormFieldError message={getErrorMessage("firstName") ?? undefined} />
						)}
					</div>
					<div className="flex flex-col gap-2">
						<Label htmlFor="lastName">Last Name</Label>
						<Input id="lastName" {...register("lastName")} placeholder="Doe" />
						{getErrorMessage("lastName") && (
							<FormFieldError message={getErrorMessage("lastName") ?? undefined} />
						)}
					</div>
				</div>
				<div className="grid grid-cols-2 gap-4">
					<div className="flex flex-col gap-2">
						<Label htmlFor="email">Email</Label>
						<Input id="email" type="email" {...register("email")} placeholder="john@example.com" />
						{getErrorMessage("email") && <FormFieldError message={getErrorMessage("email") ?? undefined} />}
					</div>
					<div className="flex flex-col gap-2">
						<Label htmlFor="phone">Phone</Label>
						<Input id="phone" {...register("phone")} placeholder="+1 (555) 123-4567" />
						{getErrorMessage("phone") && <FormFieldError message={getErrorMessage("phone") ?? undefined} />}
					</div>
				</div>
			</div>

			<div className="flex flex-col gap-4">
				<h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
					Location
				</h3>
				<div className="flex flex-col gap-2">
					<Label htmlFor="address">Address</Label>
					<Input id="address" {...register("address")} placeholder="123 Main Street" />
					{getErrorMessage("address") && <FormFieldError message={getErrorMessage("address") ?? undefined} />}
				</div>
				<div className="grid grid-cols-3 gap-4">
					<div className="flex flex-col gap-2">
						<Label htmlFor="city">City</Label>
						<Input id="city" {...register("city")} placeholder="New York" />
						{getErrorMessage("city") && <FormFieldError message={getErrorMessage("city") ?? undefined} />}
					</div>
					<div className="flex flex-col gap-2">
						<Label htmlFor="state">State</Label>
						<Input id="state" {...register("state")} placeholder="NY" />
						{getErrorMessage("state") && <FormFieldError message={getErrorMessage("state") ?? undefined} />}
					</div>
					<div className="flex flex-col gap-2">
						<Label htmlFor="zipCode">ZIP</Label>
						<Input id="zipCode" {...register("zipCode")} placeholder="10001" />
						{getErrorMessage("zipCode") && <FormFieldError message={getErrorMessage("zipCode") ?? undefined} />}
					</div>
				</div>
				<div className="flex flex-col gap-2">
					<Label htmlFor="country">Country</Label>
					<Input id="country" {...register("country")} placeholder="United States" />
					{getErrorMessage("country") && <FormFieldError message={getErrorMessage("country") ?? undefined} />}
				</div>
			</div>

			<div className="flex flex-col gap-4">
				<h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
					Professional Links
				</h3>
				<div className="flex flex-col gap-2">
					<Label htmlFor="linkedinUrl">LinkedIn URL</Label>
					<Input
						id="linkedinUrl"
						type="url"
						{...register("linkedinUrl")}
						placeholder="https://linkedin.com/in/johndoe"
					/>
					{getErrorMessage("linkedinUrl") && (
						<FormFieldError message={getErrorMessage("linkedinUrl") ?? undefined} />
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
					{getErrorMessage("githubUrl") && <FormFieldError message={getErrorMessage("githubUrl") ?? undefined} />}
				</div>
				<div className="flex flex-col gap-2">
					<Label htmlFor="portfolioUrl">Portfolio URL</Label>
					<Input
						id="portfolioUrl"
						type="url"
						{...register("portfolioUrl")}
						placeholder="https://johndoe.com"
					/>
					{getErrorMessage("portfolioUrl") && (
						<FormFieldError message={getErrorMessage("portfolioUrl") ?? undefined} />
					)}
				</div>
			</div>

			<div className="flex flex-col gap-4">
				<h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
					Professional Summary
				</h3>
				<div className="flex flex-col gap-2">
					<Textarea
						id="professionalSummary"
						{...register("professionalSummary")}
						placeholder="Brief overview of your professional background..."
						rows={4}
					/>
					{getErrorMessage("professionalSummary") && (
						<FormFieldError message={getErrorMessage("professionalSummary") ?? undefined} />
					)}
				</div>
			</div>

			<div className="flex justify-end gap-3 pt-4 border-t">
				<Button type="button" variant="outline" onClick={onCancel}>
					Cancel
				</Button>
				<Button type="submit" disabled={isSubmitting}>
					<Save className="mr-2 h-4 w-4" />
					{isSubmitting ? "Saving..." : submitLabel}
				</Button>
			</div>
		</form>
	);
}
