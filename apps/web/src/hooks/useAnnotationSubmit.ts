/**
 * useAnnotationSubmit - Hook for submitting annotations with validation.
 *
 * Handles validation, submission, time tracking, and navigation to next task.
 */

import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { annotationsApi } from "../api/annotations";

interface UseAnnotationSubmitOptions {
  taskId: string | undefined;
  projectId: string | undefined;
  /** Called after successful submission to clear the draft */
  onClearDraft?: () => Promise<void>;
}

interface ValidationError {
  path: string;
  message: string;
}

interface UseAnnotationSubmitReturn {
  /** Submit the annotation */
  submit: (data: Record<string, unknown>) => Promise<void>;
  /** Whether submission is in progress */
  isSubmitting: boolean;
  /** Whether to show the Next Task button (after successful submit) */
  showNextButton: boolean;
  /** Navigate to the next task or queue */
  goToNext: () => Promise<void>;
  /** Validation errors from last submit attempt */
  validationErrors: ValidationError[];
  /** Clear the submitted state to allow re-editing */
  reset: () => void;
}

export function useAnnotationSubmit({
  taskId,
  projectId,
  onClearDraft,
}: UseAnnotationSubmitOptions): UseAnnotationSubmitReturn {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Track time spent since page load
  const startTimeRef = useRef(Date.now());

  // State
  const [showNextButton, setShowNextButton] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>(
    []
  );

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      if (!taskId) throw new Error("No task ID");

      // Calculate time spent
      const timeSpentMs = Date.now() - startTimeRef.current;

      // Submit annotation
      return annotationsApi.submitAnnotation(taskId, {
        data,
        time_spent_ms: timeSpentMs,
        client_metadata: {
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        },
      });
    },
    onSuccess: async () => {
      // Clear draft
      if (onClearDraft) {
        try {
          await onClearDraft();
        } catch {
          // Ignore draft clear errors
        }
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["tasks", taskId] });
      queryClient.invalidateQueries({ queryKey: ["queue"] });

      // Show success
      toast.success("Annotation submitted!", {
        description: "Click 'Next Task' to continue.",
      });

      // Show next button
      setShowNextButton(true);
    },
    onError: (error) => {
      toast.error("Submission failed", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  // Submit function with basic validation
  const submit = useCallback(
    async (data: Record<string, unknown>) => {
      // Clear previous validation errors
      setValidationErrors([]);

      // Basic validation - ensure data is not empty
      if (Object.keys(data).length === 0) {
        const error = { path: "root", message: "Please complete the annotation before submitting." };
        setValidationErrors([error]);
        toast.error("Validation failed", { description: error.message });
        return;
      }

      // TODO: Add schema-based validation when needed
      // For now, just submit if there's any data
      await submitMutation.mutateAsync(data);
    },
    [submitMutation]
  );

  // Navigate to next task
  const goToNext = useCallback(async () => {
    try {
      const nextTask = await annotationsApi.getNextTask(projectId);

      if (nextTask) {
        navigate(`/annotate/${nextTask.task_id}`);
      } else {
        toast.info("No more tasks", {
          description: "You've completed all available tasks.",
        });
        navigate("/queue");
      }
    } catch (error) {
      toast.error("Failed to get next task", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
      navigate("/queue");
    }
  }, [projectId, navigate]);

  // Reset to allow re-editing
  const reset = useCallback(() => {
    setShowNextButton(false);
    setValidationErrors([]);
    startTimeRef.current = Date.now();
  }, []);

  return {
    submit,
    isSubmitting: submitMutation.isPending,
    showNextButton,
    goToNext,
    validationErrors,
    reset,
  };
}
