/**
 * React hooks for task data management in annotation interface.
 * Uses TanStack Query for caching and fetching.
 */

import { useQuery } from "@tanstack/react-query";
import { tasksApi, type TaskWithLayout } from "../api/tasks";

// Query keys for cache management
export const taskKeys = {
  all: ["tasks"] as const,
  lists: () => [...taskKeys.all, "list"] as const,
  details: () => [...taskKeys.all, "detail"] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
  annotation: (id: string) => [...taskKeys.detail(id), "annotate"] as const,
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

// Re-export types for convenience
export type { TaskWithLayout };
