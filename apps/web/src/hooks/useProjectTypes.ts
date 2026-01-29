/**
 * React hooks for project type data management.
 * Uses TanStack Query for caching and mutations.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  projectTypesApi,
  type ProjectTypeFilter,
  type CreateProjectTypeRequest,
  type UpdateProjectTypeRequest,
  type SkillRequirement,
} from "../api/projectTypes";

// Query keys for cache management
export const projectTypeKeys = {
  all: ["project-types"] as const,
  lists: () => [...projectTypeKeys.all, "list"] as const,
  list: (filter?: ProjectTypeFilter) =>
    [...projectTypeKeys.lists(), filter] as const,
  details: () => [...projectTypeKeys.all, "detail"] as const,
  detail: (id: string) => [...projectTypeKeys.details(), id] as const,
};

/**
 * Fetch paginated list of project types with filtering.
 */
export function useProjectTypes(filter?: ProjectTypeFilter) {
  return useQuery({
    queryKey: projectTypeKeys.list(filter),
    queryFn: () => projectTypesApi.list(filter),
  });
}

/**
 * Fetch system project types only.
 */
export function useSystemProjectTypes() {
  return useProjectTypes({ is_system: true });
}

/**
 * Fetch user-created project types only.
 */
export function useUserProjectTypes() {
  return useProjectTypes({ is_system: false });
}

/**
 * Fetch a single project type by ID.
 */
export function useProjectType(id: string | undefined) {
  return useQuery({
    queryKey: projectTypeKeys.detail(id!),
    queryFn: () => projectTypesApi.get(id!),
    enabled: !!id,
  });
}

/**
 * Create a new project type.
 */
export function useCreateProjectType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProjectTypeRequest) =>
      projectTypesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectTypeKeys.lists() });
    },
  });
}

/**
 * Update an existing project type.
 */
export function useUpdateProjectType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateProjectTypeRequest;
    }) => projectTypesApi.update(id, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: projectTypeKeys.lists() });
      queryClient.setQueryData(
        projectTypeKeys.detail(result.project_type_id),
        result,
      );
    },
  });
}

/**
 * Delete a project type.
 */
export function useDeleteProjectType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => projectTypesApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: projectTypeKeys.lists() });
      queryClient.removeQueries({ queryKey: projectTypeKeys.detail(id) });
    },
  });
}

/**
 * Validate data against project type's input schema.
 */
export function useValidateInputSchema(projectTypeId: string) {
  return useMutation({
    mutationFn: (data: unknown) =>
      projectTypesApi.validateInputSchema(projectTypeId, data),
  });
}

/**
 * Validate data against project type's output schema.
 */
export function useValidateOutputSchema(projectTypeId: string) {
  return useMutation({
    mutationFn: (data: unknown) =>
      projectTypesApi.validateOutputSchema(projectTypeId, data),
  });
}

/**
 * Infer JSON schema from sample data.
 */
export function useInferSchema() {
  return useMutation({
    mutationFn: (samples: unknown[]) => projectTypesApi.inferSchema(samples),
  });
}

/**
 * Add a skill requirement to a project type.
 */
export function useAddSkillRequirement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectTypeId,
      requirement,
    }: {
      projectTypeId: string;
      requirement: SkillRequirement;
    }) => projectTypesApi.addSkillRequirement(projectTypeId, requirement),
    onSuccess: (result) => {
      queryClient.setQueryData(
        projectTypeKeys.detail(result.project_type_id),
        result,
      );
    },
  });
}

/**
 * Remove a skill requirement from a project type.
 */
export function useRemoveSkillRequirement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectTypeId,
      skillId,
    }: {
      projectTypeId: string;
      skillId: string;
    }) => projectTypesApi.removeSkillRequirement(projectTypeId, skillId),
    onSuccess: (_, { projectTypeId }) => {
      queryClient.invalidateQueries({
        queryKey: projectTypeKeys.detail(projectTypeId),
      });
    },
  });
}

/**
 * Update a skill requirement on a project type.
 */
export function useUpdateSkillRequirement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectTypeId,
      skillId,
      requirement,
    }: {
      projectTypeId: string;
      skillId: string;
      requirement: Partial<SkillRequirement>;
    }) =>
      projectTypesApi.updateSkillRequirement(
        projectTypeId,
        skillId,
        requirement,
      ),
    onSuccess: (result) => {
      queryClient.setQueryData(
        projectTypeKeys.detail(result.project_type_id),
        result,
      );
    },
  });
}
