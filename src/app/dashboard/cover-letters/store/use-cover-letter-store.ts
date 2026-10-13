import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CoverLetterState {
	selectedResume: string;
	selectedApplication: string;
	manualCompany: string;
	manualPosition: string;
	jobDescription: string;
	applicantName: string;
	title: string;

	generatedContent: string;

	/** The account the persisted draft belongs to; empty until one claims it. */
	ownerId: string;
	claimFor: (userId: string) => void;

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
	ownerId: "",
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

			// localStorage is shared by every account on this browser, so a draft
			// left by someone else is discarded instead of being shown.
			claimFor: (userId) =>
				set((state) =>
					state.ownerId && state.ownerId !== userId
						? { ...initialState, ownerId: userId }
						: { ownerId: userId }
				),

			reset: () => set((state) => ({ ...initialState, ownerId: state.ownerId })),
		}),
		{
			name: "cover-letter-draft",
			partialize: (state) => ({
				// Preserve unfinished cover letters across reloads.
				manualCompany: state.manualCompany,
				manualPosition: state.manualPosition,
				jobDescription: state.jobDescription,
				applicantName: state.applicantName,
				title: state.title,
				generatedContent: state.generatedContent,
				ownerId: state.ownerId,
			}),
		}
	)
);
