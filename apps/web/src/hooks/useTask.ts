/**
 * React hooks for task data management in annotation interface.
 * Uses TanStack Query for caching and fetching.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tasksApi, type TaskWithLayout, type Draft } from "../api/tasks";

// Query keys for cache management
export const taskKeys = {
  all: ["tasks"] as const,
  lists: () => [...taskKeys.all, "list"] as const,
  details: () => [...taskKeys.all, "detail"] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
  annotation: (id: string) => [...taskKeys.detail(id), "annotate"] as const,
  draft: (id: string) => [...taskKeys.detail(id), "draft"] as const,
};

/**
 * Fetch a task with layout data for annotation.
 */
export function useTaskForAnnotation(taskId: string | undefined) {
  return useQuery({
    queryKey: taskKeys.annotation(taskId!),
    queryFn: () => tasksApi.getTaskForAnnotation(taskId!),
    enabled: !!taskId,
  });
}

/**
 * Fetch the current user's draft for a task.
 */
export function useDraft(taskId: string | undefined) {
  return useQuery({
    queryKey: taskKeys.draft(taskId!),
    queryFn: () => tasksApi.getDraft(taskId!),
    enabled: !!taskId,
    retry: false, // Don't retry on 404
  });
}

/**
 * Save draft mutation.
 */
export function useSaveDraft(taskId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      tasksApi.saveDraft(taskId!, data),
    onSuccess: (draft) => {
      // Update the draft cache
      queryClient.setQueryData(taskKeys.draft(taskId!), draft);
    },
  });
}

/**
 * Delete draft mutation.
 */
export function useDeleteDraft(taskId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => tasksApi.deleteDraft(taskId!),
    onSuccess: () => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: taskKeys.draft(taskId!) });
    },
  });
}

// Re-export types for convenience
export type { TaskWithLayout, Draft };
