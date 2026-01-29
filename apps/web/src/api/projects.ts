/**
 * Project API client functions.
 * Handles all project-related API requests.
 */

import { api } from './client';

// Types - will be replaced by @glyph/types once backend generates them
export type ProjectStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived';

export interface Project {
  project_id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  project_type_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  task_count?: number;
  completed_task_count?: number;
}

export interface ProjectListResponse {
  items: Project[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  project_type_id?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  project_type_id?: string;
}

export interface ProjectFilter {
  status?: ProjectStatus;
  project_type_id?: string;
  created_by?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CloneProjectOptions {
  include_data_sources: boolean;
  include_settings: boolean;
}

export const projectsApi = {
  list: (filter?: ProjectFilter) =>
    api.get<ProjectListResponse>('/projects', { params: filter as Record<string, string | number | boolean | undefined> }),

  get: (id: string) =>
    api.get<Project>(`/projects/${id}`),

  create: (data: CreateProjectRequest) =>
    api.post<Project>('/projects', data),

  update: (id: string, data: UpdateProjectRequest) =>
    api.patch<Project>(`/projects/${id}`, data),

  delete: (id: string) =>
    api.delete(`/projects/${id}`),

  updateStatus: (id: string, status: ProjectStatus) =>
    api.post<Project>(`/projects/${id}/status`, { status }),

  activate: (id: string) =>
    api.post<Project>(`/projects/${id}/activate`),

  pause: (id: string) =>
    api.post<Project>(`/projects/${id}/pause`),

  complete: (id: string) =>
    api.post<Project>(`/projects/${id}/complete`),

  archive: (id: string) =>
    api.post<Project>(`/projects/${id}/archive`),

  clone: (id: string, options: CloneProjectOptions) =>
    api.post<Project>(`/projects/${id}/clone`, options),

  addAsTemplate: (id: string) =>
    api.post<Project>(`/projects/${id}/template`),
};
