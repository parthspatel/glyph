/**
 * React hooks for project data management.
 * Uses TanStack Query for caching and mutations.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  projectsApi,
  type ProjectFilter,
  type CreateProjectRequest,
  type UpdateProjectRequest,
  type ProjectStatus,
  type CloneProjectOptions,
} from "../api/projects";

// Query keys for cache management
export const projectKeys = {
  all: ["projects"] as const,
  lists: () => [...projectKeys.all, "list"] as const,
  list: (filter?: ProjectFilter) => [...projectKeys.lists(), filter] as const,
  details: () => [...projectKeys.all, "detail"] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
};

/**
 * Fetch paginated list of projects with filtering.
 */
export function useProjects(filter?: ProjectFilter) {
  return useQuery({
    queryKey: projectKeys.list(filter),
    queryFn: () => projectsApi.list(filter),
  });
}

/**
 * Fetch a single project by ID.
 */
export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: projectKeys.detail(id!),
    queryFn: () => projectsApi.get(id!),
    enabled: !!id,
  });
}

/**
 * Create a new project.
 */
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProjectRequest) => projectsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

/**
 * Update an existing project.
 */
export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProjectRequest }) =>
      projectsApi.update(id, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.setQueryData(projectKeys.detail(result.project_id), result);
    },
  });
}

/**
 * Delete a project.
 */
export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => projectsApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.removeQueries({ queryKey: projectKeys.detail(id) });
    },
  });
}

/**
 * Update project status.
 */
export function useUpdateProjectStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ProjectStatus }) =>
      projectsApi.updateStatus(id, status),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.setQueryData(projectKeys.detail(result.project_id), result);
    },
  });
}

/**
 * Activate a project (transition from draft to active).
 */
export function useActivateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => projectsApi.activate(id),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.setQueryData(projectKeys.detail(result.project_id), result);
    },
  });
}

/**
 * Pause an active project.
 */
export function usePauseProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => projectsApi.pause(id),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.setQueryData(projectKeys.detail(result.project_id), result);
    },
  });
}

/**
 * Complete a project.
 */
export function useCompleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => projectsApi.complete(id),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.setQueryData(projectKeys.detail(result.project_id), result);
    },
  });
}

/**
 * Archive a project.
 */
export function useArchiveProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => projectsApi.archive(id),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.setQueryData(projectKeys.detail(result.project_id), result);
    },
  });
}

/**
 * Clone a project with optional data sources.
 */
export function useCloneProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      options,
    }: {
      id: string;
      options: CloneProjectOptions;
    }) => projectsApi.clone(id, options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

/**
 * Add project as a template (creates a project type from it).
 */
export function useAddProjectAsTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => projectsApi.addAsTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-types"] });
    },
  });
}

/**
 * Bulk update project statuses.
 */
export function useBulkUpdateProjectStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectIds,
      status,
    }: {
      projectIds: string[];
      status: ProjectStatus;
    }) => {
      const results = await Promise.allSettled(
        projectIds.map((id) => projectsApi.updateStatus(id, status)),
      );

      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;

      if (failed > 0) {
        throw new Error(`${failed} of ${projectIds.length} updates failed`);
      }

      return { succeeded, failed };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

/**
 * Bulk delete projects.
 */
export function useBulkDeleteProjects() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectIds: string[]) => {
      const results = await Promise.allSettled(
        projectIds.map((id) => projectsApi.delete(id)),
      );

      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;

      if (failed > 0) {
        throw new Error(`${failed} of ${projectIds.length} deletes failed`);
      }

      return { succeeded, failed };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}
