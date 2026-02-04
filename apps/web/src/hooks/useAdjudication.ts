/**
 * useAdjudication - Hooks for adjudication interface.
 *
 * Provides data fetching and mutation hooks for the adjudication workflow.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { adjudicationApi, type SubmitResolutionRequest } from "../api/adjudication";

/**
 * Fetch task data for adjudication including all conflicting annotations.
 */
export function useTaskForAdjudication(taskId: string | undefined) {
  return useQuery({
    queryKey: ["tasks", taskId, "adjudicate"],
    queryFn: () => adjudicationApi.getTaskForAdjudication(taskId!),
    enabled: !!taskId,
  });
}

interface UseSubmitResolutionOptions {
  taskId: string | undefined;
  /** Navigate to queue after successful submission */
  navigateOnSuccess?: boolean;
}

/**
 * Submit a resolution for a task.
 */
export function useSubmitResolution({
  taskId,
  navigateOnSuccess = true,
}: UseSubmitResolutionOptions) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (request: SubmitResolutionRequest) => {
      if (!taskId) throw new Error("No task ID");
      return adjudicationApi.submitResolution(taskId, request);
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["tasks", taskId] });
      queryClient.invalidateQueries({ queryKey: ["queue"] });

      // Show success toast
      toast.success("Resolution submitted", {
        description: "The task has been resolved and marked complete.",
      });

      // Navigate to queue
      if (navigateOnSuccess) {
        navigate("/queue");
      }
    },
    onError: (error) => {
      toast.error("Failed to submit resolution", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    },
  });
}
