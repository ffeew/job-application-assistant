import { create } from "zustand";
import type { IntelligentContentSelection } from "@/app/api/profile/validators";

interface ResumeGenerationState {
	// Preview state
	previewHTML: string | null;
	aiSelection: IntelligentContentSelection | null;

	// Actions
	setPreviewHTML: (html: string | null) => void;
	setAISelection: (selection: IntelligentContentSelection | null) => void;
	reset: () => void;
}

export const useResumeGenerationStore = create<ResumeGenerationState>()(
	(set) => ({
		// Initial state
		previewHTML: null,
		aiSelection: null,

		// Actions
		setPreviewHTML: (html) => set({ previewHTML: html }),
		setAISelection: (selection) => set({ aiSelection: selection }),
		reset: () => set({ previewHTML: null, aiSelection: null }),
	})
);
