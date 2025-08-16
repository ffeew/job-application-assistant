import { api } from './client';
import type {
  DashboardStats,
  Activity,
  Resume,
  CreateResumeData,
  UpdateResumeData,
  JobApplication,
  CreateJobApplicationData,
  UpdateJobApplicationData,
  CoverLetter,
  GenerateCoverLetterData,
  GenerateCoverLetterResponse,
  CreateCoverLetterData,
  UpdateCoverLetterData,
} from './types';

// Dashboard API
export const dashboardApi = {
  getStats: () => api.get<DashboardStats>('/api/dashboard/stats'),
  getActivity: () => api.get<Activity[]>('/api/dashboard/activity'),
};

// Resumes API
export const resumesApi = {
  getAll: () => api.get<Resume[]>('/api/resumes'),
  getById: (id: string) => api.get<Resume>(`/api/resumes/${id}`),
  create: (data: CreateResumeData) => api.post<Resume>('/api/resumes', data),
  update: (id: string, data: UpdateResumeData) => 
    api.put<Resume>(`/api/resumes/${id}`, data),
  delete: (id: string) => api.delete(`/api/resumes/${id}`),
};

// Job Applications API
export const applicationsApi = {
  getAll: () => api.get<JobApplication[]>('/api/applications'),
  getById: (id: string) => api.get<JobApplication>(`/api/applications/${id}`),
  create: (data: CreateJobApplicationData) => 
    api.post<JobApplication>('/api/applications', data),
  update: (id: string, data: UpdateJobApplicationData) => 
    api.put<JobApplication>(`/api/applications/${id}`, data),
  delete: (id: string) => api.delete(`/api/applications/${id}`),
};

// Cover Letters API
export const coverLettersApi = {
  getAll: () => api.get<CoverLetter[]>('/api/cover-letters'),
  getById: (id: string) => api.get<CoverLetter>(`/api/cover-letters/${id}`),
  generate: (data: GenerateCoverLetterData) => 
    api.post<GenerateCoverLetterResponse>('/api/cover-letters/generate', data),
  create: (data: CreateCoverLetterData) => 
    api.post<CoverLetter>('/api/cover-letters', data),
  update: (id: string, data: UpdateCoverLetterData) => 
    api.put<CoverLetter>(`/api/cover-letters/${id}`, data),
  delete: (id: string) => api.delete(`/api/cover-letters/${id}`),
};