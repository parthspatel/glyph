/**
 * Project Type API client functions.
 * Handles project type templates with schemas and skill requirements.
 */

import { api } from './client';

// Types
export interface SkillRequirement {
  skill_id: string;
  min_proficiency: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  is_required: boolean;
  weight: number;
}

export interface ProjectType {
  project_type_id: string;
  name: string;
  description: string | null;
  input_schema: Record<string, unknown>;
  output_schema: Record<string, unknown>;
  estimated_duration_seconds: number | null;
  difficulty_level: string | null;
  is_system: boolean;
  skill_requirements: SkillRequirement[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectTypeListResponse {
  items: ProjectType[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateProjectTypeRequest {
  name: string;
  description?: string;
  input_schema?: Record<string, unknown>;
  output_schema?: Record<string, unknown>;
  estimated_duration_seconds?: number;
  difficulty_level?: string;
  skill_requirements?: Omit<SkillRequirement, 'skill_id'>[];
}

export interface UpdateProjectTypeRequest {
  name?: string;
  description?: string;
  input_schema?: Record<string, unknown>;
  output_schema?: Record<string, unknown>;
  estimated_duration_seconds?: number;
  difficulty_level?: string;
}

export interface ProjectTypeFilter {
  is_system?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  path: string;
  message: string;
  keyword: string;
}

export interface SchemaInferenceResult {
  schema: Record<string, unknown>;
  ambiguities: SchemaAmbiguity[];
}

export interface SchemaAmbiguity {
  path: string;
  candidates: string[];
  sample_values: unknown[];
}

export const projectTypesApi = {
  list: (filter?: ProjectTypeFilter) =>
    api.get<ProjectTypeListResponse>('/project-types', { params: filter as Record<string, string | number | boolean | undefined> }),

  get: (id: string) =>
    api.get<ProjectType>(`/project-types/${id}`),

  create: (data: CreateProjectTypeRequest) =>
    api.post<ProjectType>('/project-types', data),

  update: (id: string, data: UpdateProjectTypeRequest) =>
    api.patch<ProjectType>(`/project-types/${id}`, data),

  delete: (id: string) =>
    api.delete(`/project-types/${id}`),

  // Schema validation
  validateInputSchema: (id: string, data: unknown) =>
    api.post<ValidationResult>(`/project-types/${id}/validate-input`, { data }),

  validateOutputSchema: (id: string, data: unknown) =>
    api.post<ValidationResult>(`/project-types/${id}/validate-output`, { data }),

  // Schema inference from sample data
  inferSchema: (samples: unknown[]) =>
    api.post<SchemaInferenceResult>('/project-types/infer-schema', { samples }),

  // Skill requirements
  addSkillRequirement: (id: string, requirement: SkillRequirement) =>
    api.post<ProjectType>(`/project-types/${id}/skills`, requirement),

  removeSkillRequirement: (id: string, skillId: string) =>
    api.delete(`/project-types/${id}/skills/${skillId}`),

  updateSkillRequirement: (id: string, skillId: string, requirement: Partial<SkillRequirement>) =>
    api.patch<ProjectType>(`/project-types/${id}/skills/${skillId}`, requirement),
};
