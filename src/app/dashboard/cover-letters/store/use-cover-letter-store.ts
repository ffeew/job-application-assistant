import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CoverLetterState {
	// Form fields
	selectedResume: string;
	selectedApplication: string;
	manualCompany: string;
	manualPosition: string;
	jobDescription: string;
	applicantName: string;
	title: string;

	// Generation result
	generatedContent: string;

	// Actions
	setSelectedResume: (id: string) => void;
	setSelectedApplication: (id: string) => void;
	setManualFields: (
		company: string,
		position: string,
		jobDescription: string
	) => void;
	setApplicantName: (name: string) => void;
	setTitle: (title: string) => void;
	setGeneratedContent: (content: string) => void;
	reset: () => void;
}

const initialState = {
	selectedResume: "",
	selectedApplication: "",
	manualCompany: "",
	manualPosition: "",
	jobDescription: "",
	applicantName: "",
	title: "",
	generatedContent: "",
};

export const useCoverLetterStore = create<CoverLetterState>()(
	persist(
		(set) => ({
			...initialState,

			setSelectedResume: (id) => set({ selectedResume: id }),

			setSelectedApplication: (id) => set({ selectedApplication: id }),

			setManualFields: (company, position, jobDescription) =>
				set({
					manualCompany: company,
					manualPosition: position,
					jobDescription,
				}),

			setApplicantName: (name) => set({ applicantName: name }),

			setTitle: (title) => set({ title }),

			setGeneratedContent: (content) => set({ generatedContent: content }),

			reset: () => set(initialState),
		}),
		{
			name: "cover-letter-draft",
			partialize: (state) => ({
				// Persist form fields for draft recovery
				manualCompany: state.manualCompany,
				manualPosition: state.manualPosition,
				jobDescription: state.jobDescription,
				applicantName: state.applicantName,
				title: state.title,
				generatedContent: state.generatedContent,
			}),
		}
	)
);
