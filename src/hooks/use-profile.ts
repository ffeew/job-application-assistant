import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardKeys } from './use-dashboard';
import type { 
  CreateUserProfileRequest,
  UpdateUserProfileRequest,
  UserProfileResponse,
  CreateWorkExperienceRequest,
  UpdateWorkExperienceRequest,
  WorkExperienceResponse,
  CreateEducationRequest,
  UpdateEducationRequest,
  EducationResponse,
  CreateSkillRequest,
  UpdateSkillRequest,
  SkillResponse,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectResponse,
  CreateCertificationRequest,
  UpdateCertificationRequest,
  CertificationResponse,
  CreateAchievementRequest,
  UpdateAchievementRequest,
  AchievementResponse,
  CreateReferenceRequest,
  UpdateReferenceRequest,
  ReferenceResponse,
  ProfileQuery,
  BulkUpdateOrderRequest,
  GenerateResumeRequest,
} from '@/lib/validators/profile.validator';

// Direct API call functions for User Profile
const userProfileApi = {
  get: async (): Promise<UserProfileResponse | null> => {
    const response = await fetch('/api/profile');
    if (!response.ok) {
      throw new Error('Failed to fetch user profile');
    }
    return response.json();
  },

  create: async (data: CreateUserProfileRequest): Promise<UserProfileResponse> => {
    const response = await fetch('/api/profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create user profile');
    }
    return response.json();
  },

  update: async (data: UpdateUserProfileRequest): Promise<UserProfileResponse> => {
    const response = await fetch('/api/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update user profile');
    }
    return response.json();
  },
};

// Direct API call functions for Work Experiences
const workExperiencesApi = {
  getAll: async (query?: ProfileQuery): Promise<WorkExperienceResponse[]> => {
    const searchParams = new URLSearchParams();
    if (query?.limit) searchParams.set('limit', query.limit.toString());
    if (query?.offset) searchParams.set('offset', query.offset.toString());
    if (query?.orderBy) searchParams.set('orderBy', query.orderBy);
    if (query?.order) searchParams.set('order', query.order);

    const response = await fetch(`/api/profile/work-experiences?${searchParams}`);
    if (!response.ok) {
      throw new Error('Failed to fetch work experiences');
    }
    return response.json();
  },

  getById: async (id: number): Promise<WorkExperienceResponse> => {
    const response = await fetch(`/api/profile/work-experiences/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch work experience');
    }
    return response.json();
  },

  create: async (data: CreateWorkExperienceRequest): Promise<WorkExperienceResponse> => {
    const response = await fetch('/api/profile/work-experiences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create work experience');
    }
    return response.json();
  },

  update: async (id: number, data: UpdateWorkExperienceRequest): Promise<WorkExperienceResponse> => {
    const response = await fetch(`/api/profile/work-experiences/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update work experience');
    }
    return response.json();
  },

  delete: async (id: number): Promise<void> => {
    const response = await fetch(`/api/profile/work-experiences/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete work experience');
    }
  },

  bulkUpdateOrder: async (data: BulkUpdateOrderRequest): Promise<void> => {
    const response = await fetch('/api/profile/work-experiences/order', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update work experience order');
    }
  },
};

// Direct API call functions for Education
const educationApi = {
  getAll: async (query?: ProfileQuery): Promise<EducationResponse[]> => {
    const searchParams = new URLSearchParams();
    if (query?.limit) searchParams.set('limit', query.limit.toString());
    if (query?.offset) searchParams.set('offset', query.offset.toString());
    if (query?.orderBy) searchParams.set('orderBy', query.orderBy);
    if (query?.order) searchParams.set('order', query.order);

    const response = await fetch(`/api/profile/education?${searchParams}`);
    if (!response.ok) {
      throw new Error('Failed to fetch education');
    }
    return response.json();
  },

  getById: async (id: number): Promise<EducationResponse> => {
    const response = await fetch(`/api/profile/education/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch education');
    }
    return response.json();
  },

  create: async (data: CreateEducationRequest): Promise<EducationResponse> => {
    const response = await fetch('/api/profile/education', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create education');
    }
    return response.json();
  },

  update: async (id: number, data: UpdateEducationRequest): Promise<EducationResponse> => {
    const response = await fetch(`/api/profile/education/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update education');
    }
    return response.json();
  },

  delete: async (id: number): Promise<void> => {
    const response = await fetch(`/api/profile/education/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete education');
    }
  },

  bulkUpdateOrder: async (data: BulkUpdateOrderRequest): Promise<void> => {
    const response = await fetch('/api/profile/education/order', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update education order');
    }
  },
};

// Direct API call functions for Skills
const skillsApi = {
  getAll: async (query?: ProfileQuery): Promise<SkillResponse[]> => {
    const searchParams = new URLSearchParams();
    if (query?.limit) searchParams.set('limit', query.limit.toString());
    if (query?.offset) searchParams.set('offset', query.offset.toString());
    if (query?.category) searchParams.set('category', query.category);
    if (query?.orderBy) searchParams.set('orderBy', query.orderBy);
    if (query?.order) searchParams.set('order', query.order);

    const response = await fetch(`/api/profile/skills?${searchParams}`);
    if (!response.ok) {
      throw new Error('Failed to fetch skills');
    }
    return response.json();
  },

  getById: async (id: number): Promise<SkillResponse> => {
    const response = await fetch(`/api/profile/skills/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch skill');
    }
    return response.json();
  },

  create: async (data: CreateSkillRequest): Promise<SkillResponse> => {
    const response = await fetch('/api/profile/skills', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create skill');
    }
    return response.json();
  },

  update: async (id: number, data: UpdateSkillRequest): Promise<SkillResponse> => {
    const response = await fetch(`/api/profile/skills/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update skill');
    }
    return response.json();
  },

  delete: async (id: number): Promise<void> => {
    const response = await fetch(`/api/profile/skills/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete skill');
    }
  },

  bulkUpdateOrder: async (data: BulkUpdateOrderRequest): Promise<void> => {
    const response = await fetch('/api/profile/skills/order', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update skills order');
    }
  },
};

// Direct API call functions for Projects
const projectsApi = {
  getAll: async (query?: ProfileQuery): Promise<ProjectResponse[]> => {
    const searchParams = new URLSearchParams();
    if (query?.limit) searchParams.set('limit', query.limit.toString());
    if (query?.offset) searchParams.set('offset', query.offset.toString());
    if (query?.orderBy) searchParams.set('orderBy', query.orderBy);
    if (query?.order) searchParams.set('order', query.order);

    const response = await fetch(`/api/profile/projects?${searchParams}`);
    if (!response.ok) {
      throw new Error('Failed to fetch projects');
    }
    return response.json();
  },

  getById: async (id: number): Promise<ProjectResponse> => {
    const response = await fetch(`/api/profile/projects/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch project');
    }
    return response.json();
  },

  create: async (data: CreateProjectRequest): Promise<ProjectResponse> => {
    const response = await fetch('/api/profile/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create project');
    }
    return response.json();
  },

  update: async (id: number, data: UpdateProjectRequest): Promise<ProjectResponse> => {
    const response = await fetch(`/api/profile/projects/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update project');
    }
    return response.json();
  },

  delete: async (id: number): Promise<void> => {
    const response = await fetch(`/api/profile/projects/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete project');
    }
  },

  bulkUpdateOrder: async (data: BulkUpdateOrderRequest): Promise<void> => {
    const response = await fetch('/api/profile/projects/order', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update projects order');
    }
  },
};

// Direct API call functions for Certifications
const certificationsApi = {
  getAll: async (query?: ProfileQuery): Promise<CertificationResponse[]> => {
    const searchParams = new URLSearchParams();
    if (query?.limit) searchParams.set('limit', query.limit.toString());
    if (query?.offset) searchParams.set('offset', query.offset.toString());
    if (query?.orderBy) searchParams.set('orderBy', query.orderBy);
    if (query?.order) searchParams.set('order', query.order);

    const response = await fetch(`/api/profile/certifications?${searchParams}`);
    if (!response.ok) {
      throw new Error('Failed to fetch certifications');
    }
    return response.json();
  },

  getById: async (id: number): Promise<CertificationResponse> => {
    const response = await fetch(`/api/profile/certifications/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch certification');
    }
    return response.json();
  },

  create: async (data: CreateCertificationRequest): Promise<CertificationResponse> => {
    const response = await fetch('/api/profile/certifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create certification');
    }
    return response.json();
  },

  update: async (id: number, data: UpdateCertificationRequest): Promise<CertificationResponse> => {
    const response = await fetch(`/api/profile/certifications/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update certification');
    }
    return response.json();
  },

  delete: async (id: number): Promise<void> => {
    const response = await fetch(`/api/profile/certifications/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete certification');
    }
  },

  bulkUpdateOrder: async (data: BulkUpdateOrderRequest): Promise<void> => {
    const response = await fetch('/api/profile/certifications/order', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update certifications order');
    }
  },
};

// Direct API call functions for Achievements
const achievementsApi = {
  getAll: async (query?: ProfileQuery): Promise<AchievementResponse[]> => {
    const searchParams = new URLSearchParams();
    if (query?.limit) searchParams.set('limit', query.limit.toString());
    if (query?.offset) searchParams.set('offset', query.offset.toString());
    if (query?.orderBy) searchParams.set('orderBy', query.orderBy);
    if (query?.order) searchParams.set('order', query.order);

    const response = await fetch(`/api/profile/achievements?${searchParams}`);
    if (!response.ok) {
      throw new Error('Failed to fetch achievements');
    }
    return response.json();
  },

  getById: async (id: number): Promise<AchievementResponse> => {
    const response = await fetch(`/api/profile/achievements/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch achievement');
    }
    return response.json();
  },

  create: async (data: CreateAchievementRequest): Promise<AchievementResponse> => {
    const response = await fetch('/api/profile/achievements', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create achievement');
    }
    return response.json();
  },

  update: async (id: number, data: UpdateAchievementRequest): Promise<AchievementResponse> => {
    const response = await fetch(`/api/profile/achievements/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update achievement');
    }
    return response.json();
  },

  delete: async (id: number): Promise<void> => {
    const response = await fetch(`/api/profile/achievements/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete achievement');
    }
  },

  bulkUpdateOrder: async (data: BulkUpdateOrderRequest): Promise<void> => {
    const response = await fetch('/api/profile/achievements/order', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update achievements order');
    }
  },
};

// Direct API call functions for References
const referencesApi = {
  getAll: async (query?: ProfileQuery): Promise<ReferenceResponse[]> => {
    const searchParams = new URLSearchParams();
    if (query?.limit) searchParams.set('limit', query.limit.toString());
    if (query?.offset) searchParams.set('offset', query.offset.toString());
    if (query?.orderBy) searchParams.set('orderBy', query.orderBy);
    if (query?.order) searchParams.set('order', query.order);

    const response = await fetch(`/api/profile/references?${searchParams}`);
    if (!response.ok) {
      throw new Error('Failed to fetch references');
    }
    return response.json();
  },

  getById: async (id: number): Promise<ReferenceResponse> => {
    const response = await fetch(`/api/profile/references/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch reference');
    }
    return response.json();
  },

  create: async (data: CreateReferenceRequest): Promise<ReferenceResponse> => {
    const response = await fetch('/api/profile/references', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create reference');
    }
    return response.json();
  },

  update: async (id: number, data: UpdateReferenceRequest): Promise<ReferenceResponse> => {
    const response = await fetch(`/api/profile/references/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update reference');
    }
    return response.json();
  },

  delete: async (id: number): Promise<void> => {
    const response = await fetch(`/api/profile/references/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete reference');
    }
  },

  bulkUpdateOrder: async (data: BulkUpdateOrderRequest): Promise<void> => {
    const response = await fetch('/api/profile/references/order', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update references order');
    }
  },
};

// Resume generation API
const resumeGenerationApi = {
  generateHTML: async (data: GenerateResumeRequest): Promise<string> => {
    const response = await fetch('/api/profile/resume/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to generate resume HTML');
    }
    return response.text();
  },

  generatePDF: async (data: GenerateResumeRequest): Promise<Blob> => {
    const response = await fetch('/api/profile/resume/generate-pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to generate resume PDF');
    }
    return response.blob();
  },

  generatePreview: async (data: GenerateResumeRequest): Promise<string> => {
    const response = await fetch('/api/profile/resume/preview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to generate resume preview');
    }
    return response.text();
  },

  validate: async (data: GenerateResumeRequest): Promise<{ valid: boolean; errors: string[] }> => {
    const response = await fetch('/api/profile/resume/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to validate resume data');
    }
    return response.json();
  },
};

// Query keys for profile data
export const profileKeys = {
  all: ['profile'] as const,
  
  userProfile: () => [...profileKeys.all, 'user'] as const,
  
  workExperiences: () => [...profileKeys.all, 'work-experiences'] as const,
  workExperiencesList: (query?: ProfileQuery) => [...profileKeys.workExperiences(), 'list', query] as const,
  workExperience: (id: number) => [...profileKeys.workExperiences(), 'detail', id] as const,
  
  education: () => [...profileKeys.all, 'education'] as const,
  educationList: (query?: ProfileQuery) => [...profileKeys.education(), 'list', query] as const,
  educationDetail: (id: number) => [...profileKeys.education(), 'detail', id] as const,
  
  skills: () => [...profileKeys.all, 'skills'] as const,
  skillsList: (query?: ProfileQuery) => [...profileKeys.skills(), 'list', query] as const,
  skill: (id: number) => [...profileKeys.skills(), 'detail', id] as const,
  
  projects: () => [...profileKeys.all, 'projects'] as const,
  projectsList: (query?: ProfileQuery) => [...profileKeys.projects(), 'list', query] as const,
  project: (id: number) => [...profileKeys.projects(), 'detail', id] as const,
  
  certifications: () => [...profileKeys.all, 'certifications'] as const,
  certificationsList: (query?: ProfileQuery) => [...profileKeys.certifications(), 'list', query] as const,
  certification: (id: number) => [...profileKeys.certifications(), 'detail', id] as const,
  
  achievements: () => [...profileKeys.all, 'achievements'] as const,
  achievementsList: (query?: ProfileQuery) => [...profileKeys.achievements(), 'list', query] as const,
  achievement: (id: number) => [...profileKeys.achievements(), 'detail', id] as const,
  
  references: () => [...profileKeys.all, 'references'] as const,
  referencesList: (query?: ProfileQuery) => [...profileKeys.references(), 'list', query] as const,
  reference: (id: number) => [...profileKeys.references(), 'detail', id] as const,
};

// User Profile Hooks
export function useUserProfile() {
  return useQuery({
    queryKey: profileKeys.userProfile(),
    queryFn: userProfileApi.get,
  });
}

export function useCreateUserProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUserProfileRequest) => userProfileApi.create(data),
    onSuccess: (newProfile) => {
      queryClient.setQueryData(profileKeys.userProfile(), newProfile);
      queryClient.invalidateQueries({ queryKey: dashboardKeys.stats() });
    },
  });
}

export function useUpdateUserProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateUserProfileRequest) => userProfileApi.update(data),
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(profileKeys.userProfile(), updatedProfile);
      queryClient.invalidateQueries({ queryKey: dashboardKeys.activity() });
    },
  });
}

// Work Experience Hooks
export function useWorkExperiences(query?: ProfileQuery) {
  return useQuery({
    queryKey: profileKeys.workExperiencesList(query),
    queryFn: () => workExperiencesApi.getAll(query),
  });
}

export function useWorkExperience(id: number) {
  return useQuery({
    queryKey: profileKeys.workExperience(id),
    queryFn: () => workExperiencesApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateWorkExperience() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWorkExperienceRequest) => workExperiencesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.workExperiences() });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.stats() });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.activity() });
    },
  });
}

export function useUpdateWorkExperience() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateWorkExperienceRequest }) => 
      workExperiencesApi.update(id, data),
    onSuccess: (updatedExperience) => {
      queryClient.setQueryData(profileKeys.workExperience(updatedExperience.id), updatedExperience);
      queryClient.invalidateQueries({ queryKey: profileKeys.workExperiences() });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.activity() });
    },
  });
}

export function useDeleteWorkExperience() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => workExperiencesApi.delete(id),
    onSuccess: (_, deletedId) => {
      queryClient.removeQueries({ queryKey: profileKeys.workExperience(deletedId) });
      queryClient.invalidateQueries({ queryKey: profileKeys.workExperiences() });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.stats() });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.activity() });
    },
  });
}

export function useBulkUpdateWorkExperienceOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkUpdateOrderRequest) => workExperiencesApi.bulkUpdateOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.workExperiences() });
    },
  });
}

// Education Hooks
export function useEducation(query?: ProfileQuery) {
  return useQuery({
    queryKey: profileKeys.educationList(query),
    queryFn: () => educationApi.getAll(query),
  });
}

export function useEducationById(id: number) {
  return useQuery({
    queryKey: profileKeys.educationDetail(id),
    queryFn: () => educationApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateEducation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateEducationRequest) => educationApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.education() });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.stats() });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.activity() });
    },
  });
}

export function useUpdateEducation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateEducationRequest }) => 
      educationApi.update(id, data),
    onSuccess: (updatedEducation) => {
      queryClient.setQueryData(profileKeys.educationDetail(updatedEducation.id), updatedEducation);
      queryClient.invalidateQueries({ queryKey: profileKeys.education() });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.activity() });
    },
  });
}

export function useDeleteEducation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => educationApi.delete(id),
    onSuccess: (_, deletedId) => {
      queryClient.removeQueries({ queryKey: profileKeys.educationDetail(deletedId) });
      queryClient.invalidateQueries({ queryKey: profileKeys.education() });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.stats() });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.activity() });
    },
  });
}

export function useBulkUpdateEducationOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkUpdateOrderRequest) => educationApi.bulkUpdateOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.education() });
    },
  });
}

// Skills Hooks
export function useSkills(query?: ProfileQuery) {
  return useQuery({
    queryKey: profileKeys.skillsList(query),
    queryFn: () => skillsApi.getAll(query),
  });
}

export function useSkill(id: number) {
  return useQuery({
    queryKey: profileKeys.skill(id),
    queryFn: () => skillsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSkillRequest) => skillsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.skills() });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.stats() });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.activity() });
    },
  });
}

export function useUpdateSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateSkillRequest }) => 
      skillsApi.update(id, data),
    onSuccess: (updatedSkill) => {
      queryClient.setQueryData(profileKeys.skill(updatedSkill.id), updatedSkill);
      queryClient.invalidateQueries({ queryKey: profileKeys.skills() });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.activity() });
    },
  });
}

export function useDeleteSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => skillsApi.delete(id),
    onSuccess: (_, deletedId) => {
      queryClient.removeQueries({ queryKey: profileKeys.skill(deletedId) });
      queryClient.invalidateQueries({ queryKey: profileKeys.skills() });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.stats() });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.activity() });
    },
  });
}

export function useBulkUpdateSkillsOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkUpdateOrderRequest) => skillsApi.bulkUpdateOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.skills() });
    },
  });
}

// Projects Hooks
export function useProjects(query?: ProfileQuery) {
  return useQuery({
    queryKey: profileKeys.projectsList(query),
    queryFn: () => projectsApi.getAll(query),
  });
}

export function useProject(id: number) {
  return useQuery({
    queryKey: profileKeys.project(id),
    queryFn: () => projectsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProjectRequest) => projectsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.projects() });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.stats() });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.activity() });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateProjectRequest }) => 
      projectsApi.update(id, data),
    onSuccess: (updatedProject) => {
      queryClient.setQueryData(profileKeys.project(updatedProject.id), updatedProject);
      queryClient.invalidateQueries({ queryKey: profileKeys.projects() });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.activity() });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => projectsApi.delete(id),
    onSuccess: (_, deletedId) => {
      queryClient.removeQueries({ queryKey: profileKeys.project(deletedId) });
      queryClient.invalidateQueries({ queryKey: profileKeys.projects() });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.stats() });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.activity() });
    },
  });
}

export function useBulkUpdateProjectsOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkUpdateOrderRequest) => projectsApi.bulkUpdateOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.projects() });
    },
  });
}

// Certifications Hooks
export function useCertifications(query?: ProfileQuery) {
  return useQuery({
    queryKey: profileKeys.certificationsList(query),
    queryFn: () => certificationsApi.getAll(query),
  });
}

export function useCertification(id: number) {
  return useQuery({
    queryKey: profileKeys.certification(id),
    queryFn: () => certificationsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateCertification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCertificationRequest) => certificationsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.certifications() });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.stats() });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.activity() });
    },
  });
}

export function useUpdateCertification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateCertificationRequest }) => 
      certificationsApi.update(id, data),
    onSuccess: (updatedCertification) => {
      queryClient.setQueryData(profileKeys.certification(updatedCertification.id), updatedCertification);
      queryClient.invalidateQueries({ queryKey: profileKeys.certifications() });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.activity() });
    },
  });
}

export function useDeleteCertification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => certificationsApi.delete(id),
    onSuccess: (_, deletedId) => {
      queryClient.removeQueries({ queryKey: profileKeys.certification(deletedId) });
      queryClient.invalidateQueries({ queryKey: profileKeys.certifications() });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.stats() });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.activity() });
    },
  });
}

export function useBulkUpdateCertificationsOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkUpdateOrderRequest) => certificationsApi.bulkUpdateOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.certifications() });
    },
  });
}

// Achievements Hooks
export function useAchievements(query?: ProfileQuery) {
  return useQuery({
    queryKey: profileKeys.achievementsList(query),
    queryFn: () => achievementsApi.getAll(query),
  });
}

export function useAchievement(id: number) {
  return useQuery({
    queryKey: profileKeys.achievement(id),
    queryFn: () => achievementsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateAchievement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAchievementRequest) => achievementsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.achievements() });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.stats() });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.activity() });
    },
  });
}

export function useUpdateAchievement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateAchievementRequest }) => 
      achievementsApi.update(id, data),
    onSuccess: (updatedAchievement) => {
      queryClient.setQueryData(profileKeys.achievement(updatedAchievement.id), updatedAchievement);
      queryClient.invalidateQueries({ queryKey: profileKeys.achievements() });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.activity() });
    },
  });
}

export function useDeleteAchievement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => achievementsApi.delete(id),
    onSuccess: (_, deletedId) => {
      queryClient.removeQueries({ queryKey: profileKeys.achievement(deletedId) });
      queryClient.invalidateQueries({ queryKey: profileKeys.achievements() });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.stats() });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.activity() });
    },
  });
}

export function useBulkUpdateAchievementsOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkUpdateOrderRequest) => achievementsApi.bulkUpdateOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.achievements() });
    },
  });
}

// References Hooks
export function useReferences(query?: ProfileQuery) {
  return useQuery({
    queryKey: profileKeys.referencesList(query),
    queryFn: () => referencesApi.getAll(query),
  });
}

export function useReference(id: number) {
  return useQuery({
    queryKey: profileKeys.reference(id),
    queryFn: () => referencesApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateReference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateReferenceRequest) => referencesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.references() });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.stats() });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.activity() });
    },
  });
}

export function useUpdateReference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateReferenceRequest }) => 
      referencesApi.update(id, data),
    onSuccess: (updatedReference) => {
      queryClient.setQueryData(profileKeys.reference(updatedReference.id), updatedReference);
      queryClient.invalidateQueries({ queryKey: profileKeys.references() });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.activity() });
    },
  });
}

export function useDeleteReference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => referencesApi.delete(id),
    onSuccess: (_, deletedId) => {
      queryClient.removeQueries({ queryKey: profileKeys.reference(deletedId) });
      queryClient.invalidateQueries({ queryKey: profileKeys.references() });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.stats() });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.activity() });
    },
  });
}

export function useBulkUpdateReferencesOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkUpdateOrderRequest) => referencesApi.bulkUpdateOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.references() });
    },
  });
}

// Resume Generation Hooks
export function useGenerateResumeHTML() {
  return useMutation({
    mutationFn: (data: GenerateResumeRequest) => resumeGenerationApi.generateHTML(data),
  });
}

export function useGenerateResumePDF() {
  return useMutation({
    mutationFn: (data: GenerateResumeRequest) => resumeGenerationApi.generatePDF(data),
  });
}

export function useGenerateResumePreview() {
  return useMutation({
    mutationFn: (data: GenerateResumeRequest) => resumeGenerationApi.generatePreview(data),
  });
}

export function useValidateResumeGeneration() {
  return useMutation({
    mutationFn: (data: GenerateResumeRequest) => resumeGenerationApi.validate(data),
  });
}