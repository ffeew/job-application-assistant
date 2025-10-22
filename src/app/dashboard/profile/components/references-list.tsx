"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Edit, Trash2, Users, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import { useDeleteReference } from "@/app/dashboard/profile/mutations/use-delete-reference";
import { ReferencesForm } from "./references-form";
import type { ReferenceResponse } from "@/lib/validators/profile.validator";

interface ReferencesListProps {
	references: ReferenceResponse[];
	isLoading: boolean;
}

export function ReferencesList({ references, isLoading }: ReferencesListProps) {
	const [isAdding, setIsAdding] = useState(false);
	const [editingReference, setEditingReference] =
		useState<ReferenceResponse | null>(null);

	const deleteMutation = useDeleteReference();

	const startAdding = () => {
		setIsAdding(true);
		setEditingReference(null);
	};

	const startEditing = (reference: ReferenceResponse) => {
		setEditingReference(reference);
		setIsAdding(false);
	};

	const cancelEditing = () => {
		setIsAdding(false);
		setEditingReference(null);
	};

	const handleDelete = async (id: number) => {
		if (window.confirm("Are you sure you want to delete this reference?")) {
			deleteMutation.mutate(id, {
				onSuccess: () => {
					toast.success("Reference deleted successfully!");
				},
				onError: (error: unknown) => {
					console.error("Error deleting reference:", error);
					toast.error("Error deleting reference. Please try again.");
				},
			});
		}
	};

	if (isLoading) {
		return (
			<div className="animate-pulse space-y-4">
				<div className="h-32 bg-gray-200 rounded" />
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-xl font-semibold flex items-center gap-2">
						<Users className="h-5 w-5" />
						Professional References
					</h2>
					<p className="text-sm text-muted-foreground">
						Add professional references who can vouch for your work
					</p>
				</div>
				<Button
					onClick={startAdding}
					disabled={isAdding || editingReference !== null}
				>
					<Plus className="mr-2 h-4 w-4" />
					Add Reference
				</Button>
			</div>

			{(isAdding || editingReference !== null) && (
				<ReferencesForm
					reference={editingReference || undefined}
					onCancel={cancelEditing}
					onSuccess={cancelEditing}
				/>
			)}

			<div className="space-y-4">
				{references.length === 0 ? (
					<Card>
						<CardContent className="py-8 text-center">
							<Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
							<h3 className="text-lg font-semibold mb-2">
								No references added
							</h3>
							<p className="text-muted-foreground mb-4">
								Add professional references to strengthen your profile.
							</p>
							<Button onClick={startAdding}>
								<Plus className="mr-2 h-4 w-4" />
								Add Your First Reference
							</Button>
						</CardContent>
					</Card>
				) : (
					references.map((reference) => (
						<Card key={reference.id}>
							<CardContent className="pt-6">
								<div className="flex justify-between items-start mb-2">
									<div className="flex-1">
										<h3 className="text-lg font-semibold">{reference.name}</h3>
										{reference.title && reference.company && (
											<p className="text-muted-foreground">
												{reference.title} at {reference.company}
											</p>
										)}
										{reference.relationship && (
											<p className="text-sm text-muted-foreground">
												Relationship: {reference.relationship}
											</p>
										)}
									</div>
									<div className="flex space-x-2">
										<Button
											variant="outline"
											size="sm"
											onClick={() => startEditing(reference)}
											disabled={isAdding || editingReference !== null}
										>
											<Edit className="h-4 w-4" />
										</Button>
										<Button
											variant="outline"
											size="sm"
											onClick={() => handleDelete(reference.id)}
											disabled={isAdding || editingReference !== null}
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>
								</div>

								<div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
									{reference.email && (
										<div className="flex items-center gap-1">
											<Mail className="h-4 w-4" />
											<a
												href={`mailto:${reference.email}`}
												className="hover:underline"
											>
												{reference.email}
											</a>
										</div>
									)}
									{reference.phone && (
										<div className="flex items-center gap-1">
											<Phone className="h-4 w-4" />
											<a
												href={`tel:${reference.phone}`}
												className="hover:underline"
											>
												{reference.phone}
											</a>
										</div>
									)}
								</div>
							</CardContent>
						</Card>
					))
				)}
			</div>
		</div>
	);
}
