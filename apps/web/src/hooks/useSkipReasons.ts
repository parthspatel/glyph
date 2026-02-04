/**
 * Hooks for skip reasons and skip task functionality.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { skipReasonsApi, type SkipReason } from "../api/skipReasons";

/**
 * Fetch skip reasons for a project.
 */
export function useSkipReasons(projectId: string | undefined) {
  return useQuery({
    queryKey: ["skip-reasons", projectId] as const,
    queryFn: async () => {
      const response = await skipReasonsApi.getSkipReasons(projectId!);
      return response.items;
    },
    enabled: !!projectId,
  });
}

/**
 * Skip task mutation.
 */
export function useSkipTask() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: ({
      taskId,
      skipReasonId,
      note,
    }: {
      taskId: string;
      skipReasonId: string;
      note?: string;
    }) => skipReasonsApi.skipTask(taskId, skipReasonId, note),
    onSuccess: (_, { taskId }) => {
      // Invalidate task-related queries
      queryClient.invalidateQueries({ queryKey: ["tasks", taskId] });
      queryClient.invalidateQueries({ queryKey: ["queue"] });
      // Navigate back to queue
      navigate("/queue");
    },
  });
}

// Re-export types
export type { SkipReason };
