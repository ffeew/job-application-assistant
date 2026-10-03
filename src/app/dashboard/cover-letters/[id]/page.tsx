"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Copy, Pencil, Trash2, Sparkles, Calendar } from "lucide-react";
import { toast } from "sonner";
import { useCoverLetter } from "@/app/dashboard/cover-letters/queries/use-cover-letters";
import { useDeleteCoverLetter } from "@/app/dashboard/cover-letters/mutations/use-delete-cover-letter";
import { CoverLetterDetailSkeleton } from "../components/cover-letter-detail-skeleton";

export default function ViewCoverLetterPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(
		null
	);

	const router = useRouter();
	const {
		data: coverLetter,
		isLoading,
		error,
	} = useCoverLetter(resolvedParams?.id || "");
	const deleteCoverLetterMutation = useDeleteCoverLetter();

	// Resolve params Promise
	useEffect(() => {
		const resolveParams = async () => {
			const resolved = await params;
			setResolvedParams(resolved);
		};
		resolveParams();
	}, [params]);

	// Handle error case
	useEffect(() => {
		if (error) {
			router.push("/dashboard/cover-letters");
		}
	}, [error, router]);

	const handleCopyContent = async () => {
		if (!coverLetter) return;

		try {
			await navigator.clipboard.writeText(coverLetter.content);
			toast.success("Cover letter copied to clipboard");
		} catch {
			toast.error("Failed to copy to clipboard");
		}
	};

	const handleDelete = () => {
		if (!resolvedParams?.id) return;

		if (!confirm("Are you sure you want to delete this cover letter?")) {
			return;
		}

		deleteCoverLetterMutation.mutate(resolvedParams.id, {
			onSuccess: () => {
				toast.success("Cover letter deleted");
				router.push("/dashboard/cover-letters");
			},
			onError: () => {
				toast.error("Failed to delete cover letter");
			},
		});
	};

	if (!resolvedParams || isLoading) {
		return <CoverLetterDetailSkeleton />;
	}

	if (!coverLetter) {
		return null;
	}

	const formattedDate = new Date(coverLetter.createdAt).toLocaleDateString(
		"en-US",
		{
			year: "numeric",
			month: "long",
			day: "numeric",
		}
	);

	return (
		<div className="flex flex-col gap-6">
			{/* Header */}
			<div className="flex items-center gap-4">
				<Button variant="outline" size="sm" asChild>
					<Link href="/dashboard/cover-letters">
						<ArrowLeft className="mr-2 h-4 w-4" />
						Back to Cover Letters
					</Link>
				</Button>
				<div>
					<h1 className="text-3xl font-bold">{coverLetter.title}</h1>
					<p className="text-muted-foreground">
						View your cover letter details
					</p>
				</div>
			</div>

			{/* Metadata Card */}
			<Card>
				<CardHeader>
					<CardTitle>Details</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-col gap-3">
					<div className="flex items-center gap-2 text-sm">
						<Calendar className="h-4 w-4 text-muted-foreground" />
						<span className="text-muted-foreground">Created:</span>
						<span>{formattedDate}</span>
					</div>
					{coverLetter.isAiGenerated && (
						<div className="flex items-center gap-2">
							<Sparkles className="h-4 w-4 text-muted-foreground" />
							<Badge variant="secondary">AI Generated</Badge>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Content Card */}
			<Card>
				<CardHeader>
					<CardTitle>Content</CardTitle>
					<CardDescription>Your cover letter text</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="whitespace-pre-wrap rounded-md bg-muted p-4 text-sm leading-relaxed">
						{coverLetter.content}
					</div>
				</CardContent>
			</Card>

			{/* Action Buttons */}
			<div className="flex justify-end gap-4">
				<Button variant="outline" onClick={handleCopyContent}>
					<Copy className="mr-2 h-4 w-4" />
					Copy
				</Button>
				<Button variant="outline" asChild>
					<Link href={`/dashboard/cover-letters/${resolvedParams.id}/edit`}>
						<Pencil className="mr-2 h-4 w-4" />
						Edit
					</Link>
				</Button>
				<Button
					variant="destructive"
					onClick={handleDelete}
					disabled={deleteCoverLetterMutation.isPending}
				>
					<Trash2 className="mr-2 h-4 w-4" />
					{deleteCoverLetterMutation.isPending ? "Deleting..." : "Delete"}
				</Button>
			</div>
		</div>
	);
}
