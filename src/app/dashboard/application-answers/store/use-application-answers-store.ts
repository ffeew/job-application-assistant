import { create } from "zustand";
import type { DraftedAnswer } from "@/lib/validators";

// Kept in memory, not persisted: drafts survive moving around the dashboard,
// such as to Profile to fill a gap, but don't stay in this browser's storage.
interface ApplicationAnswersState {
  applicationId: string;
  questions: string;
  answers: DraftedAnswer[];
  setApplicationId: (id: string) => void;
  setQuestions: (questions: string) => void;
  setAnswers: (answers: DraftedAnswer[]) => void;
  setAnswer: (index: number, answer: string) => void;
  reset: () => void;
}

const initialState = { applicationId: "", questions: "", answers: [] };

export const useApplicationAnswersStore = create<ApplicationAnswersState>()(
  (set) => ({
    ...initialState,
    setApplicationId: (applicationId) => set({ applicationId }),
    setQuestions: (questions) => set({ questions }),
    setAnswers: (answers) => set({ answers }),
    setAnswer: (index, answer) =>
      set((state) => ({
        answers: state.answers.map((item, i) =>
          i === index ? { ...item, answer } : item,
        ),
      })),
    reset: () => set(initialState),
  }),
);
