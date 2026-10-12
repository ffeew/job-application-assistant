"use client";

import { Check, Loader2, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { EmptyState } from "@/app/dashboard/components/empty-state";

// Pieces shared by every profile section so they read as one document.

export function SectionHeader({
	title,
	description,
	action,
}: {
	title: string;
	description: string;
	action?: React.ReactNode;
}) {
	return (
		<div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
			<div className="flex flex-col gap-1">
				<h2 className="text-xl font-semibold">{title}</h2>
				<p className="text-muted-foreground text-sm">{description}</p>
			</div>
			{action}
		</div>
	);
}

export function AddButton({
	children,
	onClick,
}: {
	children: React.ReactNode;
	onClick: () => void;
}) {
	return (
		<Button onClick={onClick}>
			<Plus />
			{children}
		</Button>
	);
}

export function SectionEmpty({
	title,
	children,
	action,
}: {
	title: string;
	children: React.ReactNode;
	action: React.ReactNode;
}) {
	return (
		<EmptyState title={title} actions={action}>
			{children}
		</EmptyState>
	);
}

/** Entries read from an imported resume that are not saved yet. */
export function PendingPanel({
	count,
	singular,
	plural,
	children,
}: {
	count: number;
	singular: string;
	plural: string;
	children: React.ReactNode;
}) {
	return (
		<section className="border-link flex flex-col gap-3 rounded-lg border border-dashed p-4">
			<div>
				<h3 className="text-sm font-semibold">
					{count} {count === 1 ? singular : plural} from your imported resume
				</h3>
				<p className="text-muted-foreground text-sm">
					Not saved yet. Save the ones that are right and discard the rest.
				</p>
			</div>
			{children}
		</section>
	);
}

export function PendingRow({
	name,
	children,
	isSaving,
	onEdit,
	onDiscard,
	onSave,
}: {
	/** Names the entry in button labels. */
	name: string;
	children: React.ReactNode;
	isSaving: boolean;
	onEdit?: () => void;
	onDiscard: () => void;
	onSave: () => void;
}) {
	return (
		<div className="bg-card flex flex-wrap items-start justify-between gap-3 rounded-md border p-3">
			<div className="flex min-w-0 flex-col gap-1">{children}</div>
			<div className="flex items-center gap-1">
				{onEdit && (
					<Button
						variant="ghost"
						size="icon-sm"
						aria-label={`Edit ${name} before saving`}
						onClick={onEdit}
						disabled={isSaving}
					>
						<Pencil />
					</Button>
				)}
				<Button
					variant="ghost"
					size="icon-sm"
					aria-label={`Discard ${name}`}
					onClick={onDiscard}
					disabled={isSaving}
				>
					<X />
				</Button>
				<Button size="sm" onClick={onSave} disabled={isSaving}>
					{isSaving ? <Loader2 className="animate-spin" /> : <Check />}
					Save
				</Button>
			</div>
		</div>
	);
}

export function EntryPanel({ children }: { children: React.ReactNode }) {
	return (
		<Card layout="flush">
			<ul>{children}</ul>
		</Card>
	);
}

/** One saved entry. Edit and delete stay visible so touch and keyboard users can reach them. */
export function EntryRow({
	name,
	children,
	onEdit,
	onDelete,
}: {
	/** Names the entry in button labels. */
	name: string;
	children: React.ReactNode;
	onEdit: () => void;
	onDelete: () => void;
}) {
	return (
		<li className="flex items-start justify-between gap-4 border-b px-5 py-4 last:border-b-0">
			<div className="flex min-w-0 flex-1 flex-col gap-1.5">{children}</div>
			<EntryActions name={name} onEdit={onEdit} onDelete={onDelete} />
		</li>
	);
}

export function EntryActions({
	name,
	onEdit,
	onDelete,
}: {
	name: string;
	onEdit: () => void;
	onDelete: () => void;
}) {
	return (
		<div className="text-muted-foreground flex shrink-0 gap-0.5">
			<Button
				variant="ghost"
				size="icon-sm"
				aria-label={`Edit ${name}`}
				onClick={onEdit}
			>
				<Pencil />
			</Button>
			<Button
				variant="ghost"
				size="icon-sm"
				aria-label={`Delete ${name}`}
				onClick={onDelete}
			>
				<Trash2 />
			</Button>
		</div>
	);
}

export function EntryMeta({ children }: { children: React.ReactNode }) {
	return (
		<p className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-0.5 text-sm tabular-nums">
			{children}
		</p>
	);
}

/** A comma-separated field shown as tags. */
export function TagList({ value }: { value: string }) {
	const tags = value
		.split(",")
		.map((tag) => tag.trim())
		.filter(Boolean);
	if (tags.length === 0) return null;
	return (
		<ul className="flex flex-wrap gap-1.5 pt-0.5">
			{tags.map((tag, index) => (
				<li key={`${index}-${tag}`}>
					<Badge variant="secondary">{tag}</Badge>
				</li>
			))}
		</ul>
	);
}

export function EntrySheet({
	open,
	onClose,
	title,
	description,
	children,
}: {
	open: boolean;
	onClose: () => void;
	title: string;
	description: string;
	children: React.ReactNode;
}) {
	return (
		<Sheet open={open} onOpenChange={(next) => !next && onClose()}>
			<SheetContent className="w-full overflow-y-auto sm:max-w-lg">
				<SheetHeader>
					<SheetTitle>{title}</SheetTitle>
					<SheetDescription>{description}</SheetDescription>
				</SheetHeader>
				{children}
			</SheetContent>
		</Sheet>
	);
}

export function FormActions({
	onCancel,
	isSubmitting,
	submitLabel = "Save",
}: {
	onCancel: () => void;
	isSubmitting: boolean;
	submitLabel?: string;
}) {
	return (
		<div className="flex justify-end gap-2 border-t pt-4">
			<Button type="button" variant="outline" onClick={onCancel}>
				Cancel
			</Button>
			<Button type="submit" disabled={isSubmitting}>
				<Save />
				{isSubmitting ? "Saving…" : submitLabel}
			</Button>
		</div>
	);
}

export function DeleteEntryDialog({
	open,
	onClose,
	onConfirm,
	title,
}: {
	open: boolean;
	onClose: () => void;
	onConfirm: () => void;
	title: string;
}) {
	return (
		<ConfirmDeleteDialog
			open={open}
			onOpenChange={(next) => {
				if (!next) onClose();
			}}
			title={title}
			description="It will be removed from your profile. Resumes you already saved keep their copy."
			onConfirm={onConfirm}
		/>
	);
}
