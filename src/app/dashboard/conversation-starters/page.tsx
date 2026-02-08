"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useGenerateConversationStarter } from "./mutations/use-generate-conversation-starter";
import { toast } from "sonner";
import { Sparkles, ClipboardCopy, Check, RotateCcw } from "lucide-react";
import { useUserProfile } from "@/app/dashboard/profile/queries/use-user-profile";

type FormState = {
	prospectDetails: string;
	additionalContext: string;
};

const initialState: FormState = {
	prospectDetails: "",
	additionalContext: "",
};

export default function ConversationStartersPage() {
	const [formState, setFormState] = useState<FormState>(initialState);
	const [generatedMessage, setGeneratedMessage] = useState("");
	const [copied, setCopied] = useState(false);

	const generateConversationStarter = useGenerateConversationStarter();
	const { data: userProfile, isLoading: profileLoading } = useUserProfile();

	const handleChange =
		(field: keyof FormState) => (event: ChangeEvent<HTMLTextAreaElement>) => {
			setFormState((prev) => ({ ...prev, [field]: event.target.value }));
		};

	const handleReset = () => {
		setFormState(initialState);
		setGeneratedMessage("");
		setCopied(false);
	};

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setCopied(false);

		if (
			!formState.prospectDetails ||
			formState.prospectDetails.trim().length < 20
		) {
			toast.error("Share a bit more detail about who you're reaching out to.");
			return;
		}

		generateConversationStarter.mutate(
			{
				...formState,
			},
			{
				onSuccess: (data) => {
					setGeneratedMessage(data.message);
					toast.success("Conversation starter ready!");
				},
				onError: (error) => {
					console.error("Conversation starter generation failed:", error);
					toast.error(
						error instanceof Error
							? error.message
							: "Failed to generate a conversation starter."
					);
				},
			}
		);
	};

	const handleCopy = async () => {
		if (!generatedMessage) return;
		try {
			await navigator.clipboard.writeText(generatedMessage);
			setCopied(true);
			toast.success("Copied to clipboard");
			setTimeout(() => setCopied(false), 2000);
		} catch (error) {
			console.error("Failed to copy conversation starter:", error);
			toast.error("Unable to copy. Please copy it manually.");
		}
	};

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-1">
				<h1 className="text-3xl font-bold">Conversation Starters</h1>
				<p className="text-muted-foreground">
					Provide a few details about your contact and goal to generate a
					tailored opener you can send on LinkedIn.
				</p>
			</div>

			<div className="rounded-lg border border-dashed bg-muted/50 p-4 text-sm text-muted-foreground">
				{profileLoading && <span>Loading your profile details…</span>}
				{!profileLoading && userProfile && (
					<span>
						We&apos;ll automatically weave in your saved profile details
						{userProfile.firstName || userProfile.lastName
							? ` (e.g., ${[userProfile.firstName, userProfile.lastName]
									.filter(Boolean)
									.join(" ")})`
							: ""}{" "}
						to personalize the outreach. Update them in your profile if
						something looks off.
					</span>
				)}
				{!profileLoading && !userProfile && (
					<span>
						No profile information yet. Add your background in the Profile tab
						so the AI can introduce you accurately.
					</span>
				)}
			</div>

			<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr),minmax(0,1fr)]">
				<Card>
					<CardHeader>
						<CardTitle>Contact Details</CardTitle>
						<CardDescription>
							Paste what you know about the person. The AI will figure out the
							structure for you.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<form className="flex flex-col gap-5" onSubmit={handleSubmit}>
							<div className="flex flex-col gap-2">
								<Label htmlFor="prospectDetails">
									Who are you reaching out to? *
								</Label>
								<Textarea
									id="prospectDetails"
									placeholder="Example: Met Priya at the AI for Good meetup—she leads Responsible AI at Lumos Labs and recently published a piece on bias mitigation. She teaches at Stanford and mentors women in ML."
									value={formState.prospectDetails}
									onChange={handleChange("prospectDetails")}
									rows={12}
								/>
							</div>

							<div className="flex flex-col gap-2">
								<Label htmlFor="additionalContext">
									Anything else the AI should know? (Optional)
								</Label>
								<Textarea
									id="additionalContext"
									placeholder="Optional: Mention if you've chatted before, mutual connections, topics you want to learn about, etc."
									value={formState.additionalContext}
									onChange={handleChange("additionalContext")}
									rows={5}
								/>
							</div>

							<div className="flex flex-wrap items-center gap-3 pt-2">
								<Button
									type="submit"
									disabled={generateConversationStarter.isPending}
								>
									<Sparkles className="mr-2 h-4 w-4" />
									{generateConversationStarter.isPending
										? "Generating..."
										: "Generate message"}
								</Button>
								<Button
									type="button"
									variant="outline"
									onClick={handleReset}
									disabled={generateConversationStarter.isPending}
								>
									<RotateCcw className="mr-2 h-4 w-4" />
									Reset
								</Button>
							</div>
						</form>
					</CardContent>
				</Card>

				<Card className="flex flex-col">
					<CardHeader>
						<CardTitle>AI Conversation Starter</CardTitle>
						<CardDescription>
							Fine-tune the note before sending. Copy it into LinkedIn or email.
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-1 flex-col gap-4">
						<Textarea
							className="flex-1 min-h-[260px]"
							placeholder="Your AI-crafted message will appear here."
							value={generatedMessage}
							onChange={(event) => setGeneratedMessage(event.target.value)}
						/>
						<div className="flex justify-end">
							<Button
								type="button"
								variant="outline"
								onClick={handleCopy}
								disabled={!generatedMessage}
							>
								{copied ? (
									<Check className="mr-2 h-4 w-4" />
								) : (
									<ClipboardCopy className="mr-2 h-4 w-4" />
								)}
								{copied ? "Copied" : "Copy message"}
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
