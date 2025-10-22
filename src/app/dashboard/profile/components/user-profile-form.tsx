"use client";

import { useEffect } from "react";
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
import { Save, User } from "lucide-react";
import { toast } from "sonner";
import { useCreateUserProfile } from "@/app/dashboard/profile/mutations/use-create-user-profile";
import { useUpdateUserProfile } from "@/app/dashboard/profile/mutations/use-update-user-profile";
import { createUserProfileSchema } from "@/lib/validators/profile.validator";
import type {
	UserProfileResponse,
	CreateUserProfileRequest,
} from "@/lib/validators/profile.validator";

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

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<User className="h-5 w-5" />
					Personal Information
				</CardTitle>
				<CardDescription>
					Basic personal information for your professional profile
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="space-y-2">
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
						<div className="space-y-2">
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
						<div className="space-y-2">
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
						<div className="space-y-2">
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

					<div className="space-y-2">
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
						<div className="space-y-2">
							<Label htmlFor="city">City</Label>
							<Input id="city" {...register("city")} placeholder="New York" />
							{errors.city && (
								<p className="text-red-500 text-sm mt-1">
									{errors.city.message}
								</p>
							)}
						</div>
						<div className="space-y-2">
							<Label htmlFor="state">State/Province</Label>
							<Input id="state" {...register("state")} placeholder="NY" />
							{errors.state && (
								<p className="text-red-500 text-sm mt-1">
									{errors.state.message}
								</p>
							)}
						</div>
						<div className="space-y-2">
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

					<div className="space-y-2">
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

					<div className="space-y-4">
						<h3 className="text-lg font-semibold">Professional Links</h3>

						<div className="space-y-2">
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

						<div className="space-y-2">
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

						<div className="space-y-2">
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

					<div className="space-y-2">
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
