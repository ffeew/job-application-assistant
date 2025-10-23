"use client";

import { type ChangeEvent, useEffect, useRef, useState } from "react";
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
import { createUserProfileSchema } from "@/app/api/profile/validators";
import type {
	UserProfileResponse,
	CreateUserProfileRequest,
} from "@/app/api/profile/validators";
import {
	type ResumeImportResponse,
	resumeImportResponseSchema,
} from "@/app/api/profile/resume-import/validators";

interface UserProfileFormProps {
	profile: UserProfileResponse | null;
}

export function UserProfileForm({ profile }: UserProfileFormProps) {
	const createMutation = useCreateUserProfile();
	const updateMutation = useUpdateUserProfile();

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
	const [isImporting, setIsImporting] = useState(false);
	const [importWarnings, setImportWarnings] = useState<string[]>([]);

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

	const handleResumeFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) {
			return;
		}

		const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;
		if (file.size > MAX_FILE_SIZE_BYTES) {
			toast.error("Resume is too large. Please upload a file under 8 MB.");
			event.target.value = "";
			return;
		}

		const formData = new FormData();
		formData.append("file", file);

		setIsImporting(true);
		setImportWarnings([]);

		try {
			const response = await fetch("/api/profile/resume-import", {
				method: "POST",
				body: formData,
			});

			const raw = (await response.json().catch(() => null)) as unknown;

			if (!response.ok) {
				const errorMessage =
					raw &&
					typeof raw === "object" &&
					raw !== null &&
					"error" in raw &&
					typeof (raw as { error?: unknown }).error === "string"
						? (raw as { error: string }).error
						: "Failed to import resume. Please try again.";
				toast.error(errorMessage);
				return;
			}

			let payload: ResumeImportResponse;
			try {
				payload = resumeImportResponseSchema.parse(raw);
			} catch (parseError) {
				console.error("Unexpected resume import response:", parseError, raw);
				toast.error("Received an unexpected response while importing the resume.");
				return;
			}

			reset(payload.profile);
			setImportWarnings(payload.warnings);

			if (payload.warnings.length > 0) {
				toast.success(
					"Resume imported. Review the highlighted notes before saving."
				);
			} else {
				toast.success("Resume imported. Review and save your profile.");
			}
		} catch (error) {
			console.error("Resume import failed:", error);
			toast.error("Failed to import resume. Please try again.");
		} finally {
			setIsImporting(false);
			event.target.value = "";
		}
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
							disabled={isImporting}
							className="w-full justify-center md:w-auto"
						>
							{isImporting ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : (
								<Upload className="mr-2 h-4 w-4" />
							)}
							{isImporting ? "Importing..." : "Import from Resume"}
						</Button>
						<p className="text-xs text-muted-foreground md:text-right">
							Supports PDF, DOC, and DOCX files.
						</p>
					</div>
				</div>
				<CardDescription>
					Basic personal information for your professional profile
				</CardDescription>
				{importWarnings.length > 0 && (
					<div className="rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-900 dark:border-yellow-500/60 dark:bg-yellow-950/70 dark:text-yellow-100">
						<p className="font-semibold">Check the imported details:</p>
						<ul className="mt-2 list-disc space-y-1 pl-4">
							{importWarnings.map((warning) => (
								<li key={warning}>{warning}</li>
							))}
						</ul>
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
