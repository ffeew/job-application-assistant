import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ProfileSection =
	| "personal"
	| "experience"
	| "education"
	| "skills"
	| "projects"
	| "certifications"
	| "achievements"
	| "references"
	| "files";

export type EditingState = {
	type: "new" | "edit";
	section: ProfileSection;
	itemId?: number;
} | null;

interface DeleteConfirmation {
	section: ProfileSection;
	itemId: number;
}

interface ProfileUIState {
	activeSection: ProfileSection;
	setActiveSection: (section: ProfileSection) => void;

	editingState: EditingState;
	startAdding: (section: ProfileSection) => void;
	startEditing: (section: ProfileSection, itemId: number) => void;
	cancelEditing: () => void;

	editingPendingId: string | null;
	startEditingPending: (id: string) => void;
	cancelEditingPending: () => void;

	isSheetOpen: boolean;

	savingItemId: number | string | null;
	setSavingItemId: (id: number | string | null) => void;

	deleteConfirmation: DeleteConfirmation | null;
	openDeleteConfirmation: (section: ProfileSection, itemId: number) => void;
	closeDeleteConfirmation: () => void;
}

export const useProfileUIStore = create<ProfileUIState>()(
	persist(
		(set) => ({
			activeSection: "personal",
			setActiveSection: (section) => {
				set({
					activeSection: section,
					editingState: null,
					editingPendingId: null,
					isSheetOpen: false,
				});
			},

			editingState: null,
			startAdding: (section) => {
				set({
					editingState: { type: "new", section },
					isSheetOpen: true,
					editingPendingId: null,
				});
			},
			startEditing: (section, itemId) => {
				set({
					editingState: { type: "edit", section, itemId },
					isSheetOpen: true,
					editingPendingId: null,
				});
			},
			cancelEditing: () => {
				set({
					editingState: null,
					isSheetOpen: false,
				});
			},

			editingPendingId: null,
			startEditingPending: (id) => {
				set({
					editingPendingId: id,
					editingState: null,
					isSheetOpen: false,
				});
			},
			cancelEditingPending: () => {
				set({ editingPendingId: null });
			},

			isSheetOpen: false,

			savingItemId: null,
			setSavingItemId: (id) => set({ savingItemId: id }),

			deleteConfirmation: null,
			openDeleteConfirmation: (section, itemId) =>
				set({ deleteConfirmation: { section, itemId } }),
			closeDeleteConfirmation: () => set({ deleteConfirmation: null }),
		}),
		{
			name: "profile-ui-state",
			partialize: (state) => ({
				// Restore the selected section without reopening interrupted edits.
				activeSection: state.activeSection,
			}),
		}
	)
);
