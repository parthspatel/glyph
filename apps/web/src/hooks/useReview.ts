/**
 * useReview - Hooks for review interface.
 *
 * Provides data fetching and mutation hooks for the review workflow.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { reviewsApi, type SubmitReviewRequest } from "../api/reviews";
import type { ReviewAction } from "@glyph/types";

/**
 * Fetch task data for review including the original annotation.
 */
export function useTaskForReview(taskId: string | undefined) {
  return useQuery({
    queryKey: ["tasks", taskId, "review"],
    queryFn: () => reviewsApi.getTaskForReview(taskId!),
    enabled: !!taskId,
  });
}

/**
 * Action label mapping for toast messages.
 */
const ACTION_LABELS: Record<ReviewAction, string> = {
  approve: "Approved",
  reject: "Rejected",
  request_changes: "Changes requested",
};

interface UseSubmitReviewOptions {
  taskId: string | undefined;
  /** Navigate to queue after successful submission */
  navigateOnSuccess?: boolean;
}

/**
 * Submit a review for a task.
 */
export function useSubmitReview({
  taskId,
  navigateOnSuccess = true,
}: UseSubmitReviewOptions) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (request: SubmitReviewRequest) => {
      if (!taskId) throw new Error("No task ID");
      return reviewsApi.submitReview(taskId, request);
    },
    onSuccess: (review) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["tasks", taskId] });
      queryClient.invalidateQueries({ queryKey: ["queue"] });

      // Show success toast with action-specific message
      const label = ACTION_LABELS[review.action];
      toast.success(`Review submitted: ${label}`, {
        description: "The annotator will be notified.",
      });

      // Navigate to queue
      if (navigateOnSuccess) {
        navigate("/queue");
      }
    },
    onError: (error) => {
      toast.error("Failed to submit review", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    },
  });
}

/**
 * Fetch all reviews for a task.
 */
export function useTaskReviews(taskId: string | undefined) {
  return useQuery({
    queryKey: ["tasks", taskId, "reviews"],
    queryFn: () => reviewsApi.getReviews(taskId!),
    enabled: !!taskId,
  });
}
