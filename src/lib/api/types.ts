// Re-export types from shared validators for frontend use
export type {
  // Dashboard types
  DashboardStats,
  ActivityItem as Activity,
  DashboardActivity,

  // Resume types
  ResumeResponse as Resume,
  CreateResumeRequest as CreateResumeData,
  UpdateResumeRequest as UpdateResumeData,

  // Application types
  ApplicationResponse as JobApplication,
  CreateApplicationRequest as CreateJobApplicationData,
  UpdateApplicationRequest as UpdateJobApplicationData,

  // Cover Letter types
  CoverLetterResponse as CoverLetter,
  CreateCoverLetterRequest as CreateCoverLetterData,
  UpdateCoverLetterRequest as UpdateCoverLetterData,
  GenerateCoverLetterRequest as GenerateCoverLetterData,
  GenerateCoverLetterResponse,
} from "@/lib/validators";

// Frontend-specific types that don't exist in validators
export interface ResumeContent {
  personalInfo: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  summary: string;
  experience: string;
  education: string;
  skills: string;
}

// Transform types for frontend use (convert Date to string for JSON serialization)
import type { 
  DashboardStats as _DashboardStats,
  ActivityItem as _ActivityItem,
  ResumeResponse as _ResumeResponse,
  ApplicationResponse as _ApplicationResponse,
  CoverLetterResponse as _CoverLetterResponse,
} from "@/lib/validators";

// Frontend versions with string dates
export type FrontendResume = Omit<_ResumeResponse, 'createdAt' | 'updatedAt'> & {
  createdAt: string;
  updatedAt: string;
};

export type FrontendJobApplication = Omit<_ApplicationResponse, 'createdAt' | 'updatedAt' | 'appliedAt'> & {
  createdAt: string;
  updatedAt: string;
  appliedAt?: string;
};

export type FrontendCoverLetter = Omit<_CoverLetterResponse, 'createdAt' | 'updatedAt'> & {
  createdAt: string;
  updatedAt: string;
};

export type FrontendActivity = Omit<_ActivityItem, 'createdAt'> & {
  createdAt: string;
  timestamp: string;
  icon: 'briefcase' | 'file-text' | 'pen-tool';
  iconColor: string;
};