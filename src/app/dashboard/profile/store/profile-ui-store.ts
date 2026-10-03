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
	| "references";

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
	// Navigation (persisted to localStorage)
	activeSection: ProfileSection;
	setActiveSection: (section: ProfileSection) => void;

	// Editing state (replaces isAdding, editingItem in each component)
	editingState: EditingState;
	startAdding: (section: ProfileSection) => void;
	startEditing: (section: ProfileSection, itemId: number) => void;
	cancelEditing: () => void;

	// Pending item editing (for import drafts)
	editingPendingId: string | null;
	startEditingPending: (id: string) => void;
	cancelEditingPending: () => void;

	// Sheet state (for complex forms)
	isSheetOpen: boolean;

	// Saving indicator
	savingItemId: number | string | null;
	setSavingItemId: (id: number | string | null) => void;

	// Delete confirmation dialog state
	deleteConfirmation: DeleteConfirmation | null;
	openDeleteConfirmation: (section: ProfileSection, itemId: number) => void;
	closeDeleteConfirmation: () => void;
}

export const useProfileUIStore = create<ProfileUIState>()(
	persist(
		(set) => ({
			// Navigation
			activeSection: "personal",
			setActiveSection: (section) => {
				set({
					activeSection: section,
					editingState: null,
					editingPendingId: null,
					isSheetOpen: false,
				});
			},

			// Editing state
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

			// Pending item editing
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

			// Sheet state
			isSheetOpen: false,

			// Saving state
			savingItemId: null,
			setSavingItemId: (id) => set({ savingItemId: id }),

			// Delete confirmation state
			deleteConfirmation: null,
			openDeleteConfirmation: (section, itemId) =>
				set({ deleteConfirmation: { section, itemId } }),
			closeDeleteConfirmation: () => set({ deleteConfirmation: null }),
		}),
		{
			name: "profile-ui-state",
			partialize: (state) => ({
				// Only persist navigation, not editing state
				activeSection: state.activeSection,
			}),
		}
	)
);
