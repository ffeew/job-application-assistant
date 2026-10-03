import { create } from "zustand";
import type { IntelligentContentSelection } from "@/app/api/profile/validators";

export type GenerationStatus =
	| "idle"
	| "validating"
	| "generating"
	| "complete"
	| "error";

interface ValidationResult {
	valid: boolean;
	errors: string[];
}

interface ResumeGenerationState {
	// Preview state
	previewHTML: string | null;
	aiSelection: IntelligentContentSelection | null;

	// Workflow state
	validationResult: ValidationResult | null;
	generationStatus: GenerationStatus;
	generationError: string | null;

	// Actions
	setPreviewHTML: (html: string | null) => void;
	setAISelection: (selection: IntelligentContentSelection | null) => void;
	setValidationResult: (result: ValidationResult | null) => void;
	setGenerationStatus: (status: GenerationStatus) => void;
	setGenerationError: (error: string | null) => void;
	reset: () => void;
}

const initialState = {
	previewHTML: null,
	aiSelection: null,
	validationResult: null,
	generationStatus: "idle" as GenerationStatus,
	generationError: null,
};

export const useResumeGenerationStore = create<ResumeGenerationState>()(
	(set) => ({
		...initialState,

		// Actions
		setPreviewHTML: (html) => set({ previewHTML: html }),
		setAISelection: (selection) => set({ aiSelection: selection }),
		setValidationResult: (result) => set({ validationResult: result }),
		setGenerationStatus: (status) => set({ generationStatus: status }),
		setGenerationError: (error) => set({ generationError: error }),
		reset: () => set(initialState),
	})
);
