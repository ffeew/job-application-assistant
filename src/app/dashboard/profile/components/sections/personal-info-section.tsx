"use client";

import { withAsyncHandler } from "@/lib/async-action";
import { type ChangeEvent, useEffect, useRef } from "react";
import { useForm, type UseFormRegister, type UseFormHandleSubmit, type FieldValues, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { Loader2, Pencil, Upload } from "lucide-react";
import { toast } from "sonner";
import { useCreateUserProfile } from "@/app/dashboard/profile/mutations/use-create-user-profile";
import { useUpdateUserProfile } from "@/app/dashboard/profile/mutations/use-update-user-profile";
import { useImportResume } from "@/app/dashboard/profile/mutations/use-import-resume";
import { createUserProfileSchema } from "@/app/api/profile/validators";
import type { CreateUserProfileRequest, UserProfileJsonResponse } from "@/app/api/profile/validators";
import type { ResumeImportResponse } from "@/app/api/profile/resume-import/validators";
import { FormFieldError } from "@/components/ui/form-field-error";
import { useImportReviewStore } from "@/app/dashboard/profile/store/import-review-store";
import { useProfileUIStore } from "@/app/dashboard/profile/store/profile-ui-store";
import {
	EntrySheet,
	FormActions,
	SectionEmpty,
	SectionHeader,
} from "../section-parts";

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;

interface PersonalInfoSectionProps {
	profile: UserProfileJsonResponse | null;
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
			// Keep field refs registered when React Compiler memoizes registration props.
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
			}, { keepFieldsRef: true });
		}
	}, [profile, reset]);

	const onSubmit = (data: unknown) => {
		const mutation = profile ? updateMutation : createMutation;
		const validatedData = data as CreateUserProfileRequest;

		mutation.mutate(validatedData, {
			onSuccess: () => {
				toast.success(profile ? "Changes saved" : "Profile saved");
				cancelEditing();
			},
			onError: (error) => {
				console.error("Error saving profile:", error);
				toast.error("Couldn't save your profile. Try again.");
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
			toast.error("That file is over 8 MB. Choose a smaller one.");
			event.target.value = "";
			return;
		}

		importResumeMutation.mutate(file, {
			onSuccess: (payload) => {
				// Keep field refs registered when React Compiler memoizes registration props.
				reset(payload.profile, { keepFieldsRef: true });
				onImportPreview(payload);
				toast.success("Resume imported. Review each section before saving.");
			},
			onError: (error) => {
				console.error("Resume import failed:", error);
				toast.error(error.message || "Couldn't import that resume. Try again.");
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

	const profileSheet = (
		<EntrySheet
			open={isEditing}
			onClose={cancelEditing}
			title={profile ? "Edit profile" : "Add your details"}
			description="Your name and contact details head every resume."
		>
			<ProfileForm
				register={register as unknown as UseFormRegister<FieldValues>}
				errors={errors}
				isSubmitting={isSubmitting}
				handleSubmit={handleSubmit as UseFormHandleSubmit<FieldValues>}
				onSubmit={onSubmit}
				onCancel={cancelEditing}
				submitLabel={profile ? "Save changes" : "Save profile"}
			/>
		</EntrySheet>
	);

	if (!profile) {
		return (
			<>
				<div className="flex flex-col gap-6">
					<SectionHeader
						title="Personal information"
						description="Your name, contact details and summary."
					/>

					<SectionEmpty
						title="No details yet"
						action={
							<>
								<input
									ref={fileInputRef}
									type="file"
									accept=".pdf,.docx,.txt"
									className="hidden"
									onChange={handleResumeFileChange}
								/>
								<Button onClick={handleEditClick}>Add your details</Button>
								<Button variant="outline" onClick={handleResumeImportClick} disabled={importResumeMutation.isPending}>
									{importResumeMutation.isPending ? (
										<Loader2 className="animate-spin" />
									) : (
										<Upload />
									)}
									{importResumeMutation.isPending ? "Importing…" : "Import a resume"}
								</Button>
							</>
						}
					>
						Type your details in, or import an existing resume (PDF, Word
						or text, up to 8 MB) and review what it finds.
					</SectionEmpty>
				</div>

				{profileSheet}
			</>
		);
	}

	const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ");
	const location = [profile.city, profile.state, profile.country].filter(Boolean).join(", ");
	const links = [
		{ label: "LinkedIn", href: profile.linkedinUrl },
		{ label: "GitHub", href: profile.githubUrl },
		{ label: "Portfolio", href: profile.portfolioUrl },
	].filter((link) => link.href);

	return (
		<>
			<div className="flex flex-col gap-6">
				<SectionHeader
					title="Personal information"
					description="Your name, contact details and summary."
					action={
						<Button variant="outline" onClick={handleEditClick}>
							<Pencil />
							Edit
						</Button>
					}
				/>

				{profileDraft.warnings.length > 0 && (
					<Notice tone="warning" title="Check the imported details">
						<ul className="flex list-disc flex-col gap-1 pl-4">
							{profileDraft.warnings.map((warning) => (
								<li key={warning}>{warning}</li>
							))}
						</ul>
					</Notice>
				)}

				<Card layout="flush" className="flex flex-col gap-5 p-6">
					<div className="flex flex-col gap-2">
						<h3 className="text-xl font-semibold">{fullName || "No name yet"}</h3>
						{profile.professionalSummary && (
							<p className="text-muted-foreground max-w-[65ch] whitespace-pre-wrap">
								{profile.professionalSummary}
							</p>
						)}
					</div>

					<dl className="grid gap-x-8 gap-y-3 border-t pt-5 text-sm sm:grid-cols-2">
						{profile.email && (
							<div>
								<dt className="text-muted-foreground">Email</dt>
								<dd>{profile.email}</dd>
							</div>
						)}
						{profile.phone && (
							<div>
								<dt className="text-muted-foreground">Phone</dt>
								<dd>{profile.phone}</dd>
							</div>
						)}
						{location && (
							<div>
								<dt className="text-muted-foreground">Location</dt>
								<dd>{location}</dd>
							</div>
						)}
						{links.map((link) => (
							<div key={link.label}>
								<dt className="text-muted-foreground">{link.label}</dt>
								<dd className="truncate">
									<a
										href={link.href ?? undefined}
										target="_blank"
										rel="noopener noreferrer"
										className="text-link underline underline-offset-4 hover:no-underline"
									>
										{link.href}
									</a>
								</dd>
							</div>
						))}
					</dl>
				</Card>
			</div>

			{profileSheet}
		</>
	);
}

interface ProfileFormProps {
	register: UseFormRegister<FieldValues>;
	errors: FieldErrors;
	isSubmitting: boolean;
	handleSubmit: UseFormHandleSubmit<FieldValues>;
	onSubmit: (data: unknown) => void | Promise<void>;
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
		return typeof error?.message === "string" ? error.message : null;
	};

	return (
		<form onSubmit={withAsyncHandler(handleSubmit(onSubmit))} className="flex flex-col gap-6 p-4 pt-2">
			<div className="flex flex-col gap-4">
				<h3 className="font-semibold">
					Basics
				</h3>
				<div className="grid grid-cols-2 gap-4">
					<div className="flex flex-col gap-2">
						<Label htmlFor="firstName">First name</Label>
						<Input id="firstName" {...register("firstName")} />
						{getErrorMessage("firstName") && (
							<FormFieldError message={getErrorMessage("firstName") ?? undefined} />
						)}
					</div>
					<div className="flex flex-col gap-2">
						<Label htmlFor="lastName">Last name</Label>
						<Input id="lastName" {...register("lastName")} />
						{getErrorMessage("lastName") && (
							<FormFieldError message={getErrorMessage("lastName") ?? undefined} />
						)}
					</div>
				</div>
				<div className="grid grid-cols-2 gap-4">
					<div className="flex flex-col gap-2">
						<Label htmlFor="email">Email</Label>
						<Input id="email" type="email" {...register("email")} />
						{getErrorMessage("email") && <FormFieldError message={getErrorMessage("email") ?? undefined} />}
					</div>
					<div className="flex flex-col gap-2">
						<Label htmlFor="phone">Phone</Label>
						<Input id="phone" {...register("phone")} />
						{getErrorMessage("phone") && <FormFieldError message={getErrorMessage("phone") ?? undefined} />}
					</div>
				</div>
			</div>

			<div className="flex flex-col gap-4">
				<h3 className="font-semibold">
					Location
				</h3>
				<div className="flex flex-col gap-2">
					<Label htmlFor="address">Address</Label>
					<Input id="address" {...register("address")} />
					{getErrorMessage("address") && <FormFieldError message={getErrorMessage("address") ?? undefined} />}
				</div>
				<div className="grid gap-4 sm:grid-cols-3">
					<div className="flex flex-col gap-2">
						<Label htmlFor="city">City</Label>
						<Input id="city" {...register("city")} />
						{getErrorMessage("city") && <FormFieldError message={getErrorMessage("city") ?? undefined} />}
					</div>
					<div className="flex flex-col gap-2">
						<Label htmlFor="state">State or region</Label>
						<Input id="state" {...register("state")} />
						{getErrorMessage("state") && <FormFieldError message={getErrorMessage("state") ?? undefined} />}
					</div>
					<div className="flex flex-col gap-2">
						<Label htmlFor="zipCode">Postcode</Label>
						<Input id="zipCode" {...register("zipCode")} />
						{getErrorMessage("zipCode") && <FormFieldError message={getErrorMessage("zipCode") ?? undefined} />}
					</div>
				</div>
				<div className="flex flex-col gap-2">
					<Label htmlFor="country">Country</Label>
					<Input id="country" {...register("country")} />
					{getErrorMessage("country") && <FormFieldError message={getErrorMessage("country") ?? undefined} />}
				</div>
			</div>

			<div className="flex flex-col gap-4">
				<h3 className="font-semibold">
					Links
				</h3>
				<div className="flex flex-col gap-2">
					<Label htmlFor="linkedinUrl">LinkedIn URL</Label>
					<Input
						id="linkedinUrl"
						type="url"
						{...register("linkedinUrl")}
						placeholder="https://"
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
						placeholder="https://"
					/>
					{getErrorMessage("githubUrl") && <FormFieldError message={getErrorMessage("githubUrl") ?? undefined} />}
				</div>
				<div className="flex flex-col gap-2">
					<Label htmlFor="portfolioUrl">Portfolio URL</Label>
					<Input
						id="portfolioUrl"
						type="url"
						{...register("portfolioUrl")}
						placeholder="https://"
					/>
					{getErrorMessage("portfolioUrl") && (
						<FormFieldError message={getErrorMessage("portfolioUrl") ?? undefined} />
					)}
				</div>
			</div>

			<div className="flex flex-col gap-4">
				<Label htmlFor="professionalSummary" className="text-base font-semibold">
					Professional summary
				</Label>
				<div className="flex flex-col gap-2">
					<Textarea
						id="professionalSummary"
						{...register("professionalSummary")}
						aria-describedby="professionalSummary-hint"
						rows={5}
					/>
					<p id="professionalSummary-hint" className="text-muted-foreground text-sm">
						Two or three sentences. Fitting a page may shorten the wording.
					</p>
					{getErrorMessage("professionalSummary") && (
						<FormFieldError message={getErrorMessage("professionalSummary") ?? undefined} />
					)}
				</div>
			</div>

			<FormActions onCancel={onCancel} isSubmitting={isSubmitting} submitLabel={submitLabel} />
		</form>
	);
}
