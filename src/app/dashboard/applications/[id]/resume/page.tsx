"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
	ArrowLeft,
	FileText,
	Download,
	Eye,
	Loader2,
	AlertCircle,
	Sparkles,
	Brain,
	Target,
	Save,
	CheckCircle,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useApplicationResumeInfo } from "@/app/dashboard/applications/queries/use-application-resume-info";
import {
	useGenerateJobApplicationPreview,
	useGenerateJobApplicationPDF,
	useSaveTailoredResume,
} from "@/app/dashboard/applications/mutations/use-generate-job-application-resume";
import { jobApplicationResumeRequestSchema } from "@/app/api/profile/validators";
import type {
	JobApplicationResumeRequest,
	IntelligentContentSelection,
} from "@/app/api/profile/validators";
import { CardSkeleton } from "@/components/skeletons/card-skeleton";
import { downloadPDF } from "@/lib/utils";

export default function JobApplicationResumePage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(
		null
	);
	const [previewHTML, setPreviewHTML] = useState<string | null>(null);
	const [aiSelection, setAiSelection] =
		useState<IntelligentContentSelection | null>(null);
	const [resumeContent, setResumeContent] = useState<string | null>(null);

	const {
		data: applicationInfo,
		isLoading,
		error,
	} = useApplicationResumeInfo(resolvedParams?.id || "");

	// Simple mutation hooks
	const previewMutation = useGenerateJobApplicationPreview();
	const pdfMutation = useGenerateJobApplicationPDF();
	const saveMutation = useSaveTailoredResume();

	// Derived state
	const isGeneratingPreview = previewMutation.isPending;
	const isGeneratingPDF = pdfMutation.isPending;
	const isSaving = saveMutation.isPending;
	const previewError = previewMutation.error;
	const pdfError = pdfMutation.error;

	const form = useForm({
		resolver: zodResolver(
			jobApplicationResumeRequestSchema.omit({ applicationId: true })
		),
		defaultValues: {
			title: "",
			template: "professional" as const,
			useAISelection: true,
			maxWorkExperiences: 4,
			maxProjects: 3,
			maxSkills: 12,
			manualOverrides: undefined,
		},
	});

	const {
		register,
		handleSubmit,
		watch,
		setValue,
		formState: { errors },
	} = form;
	const watchedValues = watch();

	// Resolve params Promise
	useEffect(() => {
		const resolveParams = async () => {
			const resolved = await params;
			setResolvedParams(resolved);
		};
		resolveParams();
	}, [params]);

	// Set default resume title when application loads
	useEffect(() => {
		if (applicationInfo && !watchedValues.title) {
			setValue(
				"title",
				`${applicationInfo.position} Resume - ${applicationInfo.company}`
			);
		}
	}, [applicationInfo, setValue, watchedValues.title]);

	const onSubmit = async (data: unknown) => {
		if (!resolvedParams?.id) return;

		const validatedData = data as Omit<
			JobApplicationResumeRequest,
			"applicationId"
		>;
		try {
			// First generate the preview to get content for saving
			const previewResult = await previewMutation.mutateAsync({
				applicationId: resolvedParams.id,
				data: validatedData,
			});
			setPreviewHTML(previewResult.html);
			setAiSelection(previewResult.aiSelection || null);

			// Build content to save
			const contentToSave = JSON.stringify({
				html: previewResult.html,
				aiSelection: previewResult.aiSelection || null,
				config: validatedData,
				generatedAt: new Date().toISOString(),
			});
			setResumeContent(contentToSave);

			// Auto-save the tailored resume
			await saveMutation.mutateAsync({
				applicationId: resolvedParams.id,
				data: {
					title: validatedData.title,
					content: contentToSave,
				},
			});

			// Generate and download PDF
			const blob = await pdfMutation.mutateAsync({
				applicationId: resolvedParams.id,
				data: validatedData,
			});
			downloadPDF(blob, validatedData.title);
			toast.success("Resume saved and PDF generated!");
		} catch (error) {
			console.error("Error generating resume:", error);
			toast.error("Error generating resume. Please try again.");
		}
	};

	const handlePreview = async () => {
		if (!resolvedParams?.id) return;

		const formData = form.getValues() as Omit<
			JobApplicationResumeRequest,
			"applicationId"
		>;
		try {
			const result = await previewMutation.mutateAsync({
				applicationId: resolvedParams.id,
				data: formData,
			});
			setPreviewHTML(result.html);
			setAiSelection(result.aiSelection || null);

			// Store the resume content for saving
			const contentToSave = JSON.stringify({
				html: result.html,
				aiSelection: result.aiSelection || null,
				config: formData,
				generatedAt: new Date().toISOString(),
			});
			setResumeContent(contentToSave);

			if (result.aiSelection) {
				toast.success("AI has optimized your resume content for this job!");
			}
		} catch (error) {
			console.error("Error generating preview:", error);
			toast.error("Error generating preview. Please try again.");
		}
	};

	const handleSaveResume = async () => {
		if (!resolvedParams?.id || !resumeContent) return;

		const formData = form.getValues();
		try {
			const result = await saveMutation.mutateAsync({
				applicationId: resolvedParams.id,
				data: {
					title: formData.title,
					content: resumeContent,
				},
			});

			if (result.isNew) {
				toast.success("Tailored resume saved successfully!");
			} else {
				toast.success("Tailored resume updated successfully!");
			}
		} catch (error) {
			console.error("Error saving resume:", error);
			toast.error("Error saving resume. Please try again.");
		}
	};

	// Resolve params Promise
	useEffect(() => {
		const resolveParams = async () => {
			const resolved = await params;
			setResolvedParams(resolved);
		};
		resolveParams();
	}, [params]);

	if (!resolvedParams || isLoading) {
		return (
			<div className="space-y-6">
				<div className="flex items-center space-x-4">
					<Button variant="outline" size="sm" asChild>
						<Link href="/dashboard/applications">
							<ArrowLeft className="mr-2 h-4 w-4" />
							Back to Applications
						</Link>
					</Button>
					<div>
						<h1 className="text-3xl font-bold">Generate Tailored Resume</h1>
						<p className="text-muted-foreground">Loading application data...</p>
					</div>
				</div>
				<div className="space-y-4">
					<CardSkeleton />
					<CardSkeleton />
				</div>
			</div>
		);
	}

	if (error || !applicationInfo) {
		return (
			<div className="space-y-6">
				<div className="flex items-center space-x-4">
					<Button variant="outline" size="sm" asChild>
						<Link href="/dashboard/applications">
							<ArrowLeft className="mr-2 h-4 w-4" />
							Back to Applications
						</Link>
					</Button>
					<div>
						<h1 className="text-3xl font-bold">Generate Tailored Resume</h1>
						<p className="text-red-600">Error loading application</p>
					</div>
				</div>
				<Card>
					<CardContent className="pt-6">
						<div className="flex items-center space-x-2 text-red-600">
							<AlertCircle className="h-5 w-5" />
							<p>Failed to load application data. Please try again.</p>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center space-x-4">
				<Button variant="outline" size="sm" asChild>
					<Link href={`/dashboard/applications/${resolvedParams.id}`}>
						<ArrowLeft className="mr-2 h-4 w-4" />
						Back to Application
					</Link>
				</Button>
				<div>
					<h1 className="text-3xl font-bold">Generate Tailored Resume</h1>
					<p className="text-muted-foreground">
						Create an optimized resume for {applicationInfo.position} at{" "}
						{applicationInfo.company}
					</p>
				</div>
			</div>

			{/* Application Context Card */}
			<Card className="border-blue-200 bg-blue-50">
				<CardContent>
					<div className="flex items-center space-x-2 text-blue-800">
						<Target className="h-5 w-5" />
						<div>
							<p className="font-medium">Target Position</p>
							<p className="text-sm">
								{applicationInfo.position} at {applicationInfo.company}
								{applicationInfo.location && ` • ${applicationInfo.location}`}
							</p>
							<div className="flex items-center flex-wrap gap-2 mt-2">
								<Badge
									variant={
										applicationInfo.hasJobDescription ? "default" : "secondary"
									}
								>
									{applicationInfo.hasJobDescription
										? "Job Description Available"
										: "No Job Description"}
								</Badge>
								{applicationInfo.hasJobDescription &&
									watchedValues.useAISelection && (
										<Badge
											variant="outline"
											className="text-purple-600 border-purple-600"
										>
											<Sparkles className="h-3 w-3 mr-1" />
											AI Optimization Enabled
										</Badge>
									)}
								{applicationInfo.tailoredResume && (
									<Badge
										variant="outline"
										className="text-green-600 border-green-600"
									>
										<CheckCircle className="h-3 w-3 mr-1" />
										Tailored Resume Saved
									</Badge>
								)}
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Configuration Panel */}
				<div className="space-y-6">
					<form onSubmit={handleSubmit(onSubmit)}>
						<Card>
							<CardHeader>
								<CardTitle>Resume Configuration</CardTitle>
								<CardDescription>
									Customize your resume for this specific application
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-6">
								<div className="space-y-2">
									<Label htmlFor="title">Resume Title</Label>
									<Input
										id="title"
										{...register("title")}
										placeholder="e.g., Software Engineer Resume - Google"
									/>
									{errors.title && (
										<p className="text-red-500 text-sm mt-1">
											{errors.title.message}
										</p>
									)}
								</div>

								<div className="space-y-2">
									<Label>Template</Label>
									<select
										{...register("template")}
										className="w-full px-3 py-2 border border-gray-300 rounded-md"
									>
										<option value="professional">Professional</option>
										<option value="modern">Modern</option>
										<option value="minimal">Minimal</option>
										<option value="creative">Creative</option>
									</select>
								</div>

								<hr className="my-4" />

								{/* AI Configuration */}
								{applicationInfo.hasJobDescription && (
									<div className="space-y-4">
										<div className="flex items-center space-x-3">
											<Checkbox
												id="useAISelection"
												checked={watchedValues.useAISelection}
												onCheckedChange={(checked) =>
													setValue("useAISelection", !!checked)
												}
											/>
											<div className="space-y-0.5">
												<Label
													htmlFor="useAISelection"
													className="text-base flex items-center space-x-2 cursor-pointer"
												>
													<Brain className="h-4 w-4 text-purple-600" />
													<span>AI Content Optimization</span>
												</Label>
												<p className="text-sm text-muted-foreground">
													Let AI select the most relevant content for this job
												</p>
											</div>
										</div>

										{watchedValues.useAISelection && (
											<div className="space-y-4 pl-6 border-l-2 border-purple-200">
												<div className="space-y-2">
													<Label htmlFor="maxWorkExperiences">
														Max Work Experiences:{" "}
														{watchedValues.maxWorkExperiences}
													</Label>
													<input
														id="maxWorkExperiences"
														type="range"
														min="1"
														max="8"
														step="1"
														value={watchedValues.maxWorkExperiences}
														onChange={(e) =>
															setValue(
																"maxWorkExperiences",
																parseInt(e.target.value)
															)
														}
														className="w-full"
													/>
												</div>

												<div className="space-y-2">
													<Label htmlFor="maxProjects">
														Max Projects: {watchedValues.maxProjects}
													</Label>
													<input
														id="maxProjects"
														type="range"
														min="0"
														max="6"
														step="1"
														value={watchedValues.maxProjects}
														onChange={(e) =>
															setValue("maxProjects", parseInt(e.target.value))
														}
														className="w-full"
													/>
												</div>

												<div className="space-y-2">
													<Label htmlFor="maxSkills">
														Max Skills: {watchedValues.maxSkills}
													</Label>
													<input
														id="maxSkills"
														type="range"
														min="5"
														max="20"
														step="1"
														value={watchedValues.maxSkills}
														onChange={(e) =>
															setValue("maxSkills", parseInt(e.target.value))
														}
														className="w-full"
													/>
												</div>
											</div>
										)}
									</div>
								)}

								{!applicationInfo.hasJobDescription && (
									<Card className="border-yellow-200 bg-yellow-50">
										<CardContent className="pt-4">
											<div className="flex items-center space-x-2 text-yellow-800">
												<AlertCircle className="h-5 w-5" />
												<div>
													<p className="font-medium">No Job Description</p>
													<p className="text-sm">
														AI optimization requires a job description. Add one
														to the application for best results.
													</p>
												</div>
											</div>
										</CardContent>
									</Card>
								)}

								<div className="flex flex-wrap gap-2 pt-4">
									<Button
										type="button"
										variant="outline"
										onClick={handlePreview}
										disabled={isGeneratingPreview}
									>
										{isGeneratingPreview ? (
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										) : (
											<Eye className="mr-2 h-4 w-4" />
										)}
										Preview
									</Button>
									{resumeContent && (
										<Button
											type="button"
											variant="secondary"
											onClick={handleSaveResume}
											disabled={isSaving}
										>
											{isSaving ? (
												<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											) : (
												<Save className="mr-2 h-4 w-4" />
											)}
											Save Resume
										</Button>
									)}
									<Button type="submit" disabled={isGeneratingPDF}>
										{isGeneratingPDF ? (
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										) : (
											<Download className="mr-2 h-4 w-4" />
										)}
										Generate & Save PDF
									</Button>
								</div>

								{(previewError || pdfError) && (
									<div className="p-3 bg-red-50 border border-red-200 rounded-md">
										<p className="text-red-800 text-sm">
											{previewError?.message || pdfError?.message}
										</p>
									</div>
								)}
							</CardContent>
						</Card>
					</form>

					{/* AI Selection Results */}
					{aiSelection && (
						<Card className="border-purple-200 bg-purple-50">
							<CardHeader>
								<CardTitle className="flex items-center space-x-2">
									<Sparkles className="h-5 w-5 text-purple-600" />
									<span className="text-purple-600">
										AI Optimization Results
									</span>
								</CardTitle>
								<CardDescription className="text-muted-foreground">
									AI has analyzed the job description and optimized your content
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div>
									<h4 className="font-medium text-sm text-purple-900">
										Strategy
									</h4>
									<p className="text-sm text-muted-foreground">
										{aiSelection.overallStrategy}
									</p>
								</div>

								{aiSelection.keyMatchingPoints.length > 0 && (
									<div>
										<h4 className="font-medium text-sm mb-2 text-purple-900">
											Key Matching Points
										</h4>
										<div className="flex flex-wrap gap-1">
											{aiSelection.keyMatchingPoints.map((point, index) => (
												<Badge
													key={index}
													variant="outline"
													className="text-xs border-purple-300 text-purple-800"
												>
													{point}
												</Badge>
											))}
										</div>
									</div>
								)}

								<div className="grid grid-cols-2 gap-4 text-sm text-purple-800">
									<div>
										<span className="font-medium text-purple-900">
											Work Exp:
										</span>{" "}
										{aiSelection.selectedWorkExperiences.length}
									</div>
									<div>
										<span className="font-medium text-purple-900">Skills:</span>{" "}
										{aiSelection.selectedSkills.length}
									</div>
									<div>
										<span className="font-medium text-purple-900">
											Projects:
										</span>{" "}
										{aiSelection.selectedProjects.length}
									</div>
									<div>
										<span className="font-medium text-purple-900">
											Education:
										</span>{" "}
										{aiSelection.selectedEducation.length}
									</div>
								</div>
							</CardContent>
						</Card>
					)}
				</div>

				{/* Preview Panel */}
				<div>
					<Card>
						<CardHeader>
							<CardTitle>Resume Preview</CardTitle>
							<CardDescription>
								See how your tailored resume will look
							</CardDescription>
						</CardHeader>
						<CardContent>
							{previewHTML ? (
								<div
									className="border rounded-lg overflow-hidden bg-white"
									style={{ height: "600px" }}
								>
									<iframe
										srcDoc={previewHTML}
										className="w-full h-full border-0"
										title="Resume Preview"
									/>
								</div>
							) : (
								<div className="flex items-center justify-center h-96 border-2 border-dashed border-gray-300 rounded-lg">
									<div className="text-center">
										<FileText className="mx-auto h-12 w-12 text-gray-400" />
										<p className="mt-2 text-sm text-gray-600">
											Click &quot;Preview&quot; to see your tailored resume
										</p>
									</div>
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
