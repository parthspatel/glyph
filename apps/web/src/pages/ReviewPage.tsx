/**
 * ReviewPage - Review interface for reviewers.
 *
 * Displays original annotation side-by-side with editable corrections,
 * allowing reviewers to approve, reject, or request changes.
 */

import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { AlertCircle, Loader2, User, Clock } from "lucide-react";
import { ReviewSideBySide, ReviewActions } from "../components/review";
import { useTaskForReview, useSubmitReview } from "../hooks/useReview";
import type { ReviewAction } from "@glyph/types";

/**
 * Deep equality check for objects.
 */
function isEqual(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Format date for display.
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ReviewPage(): React.ReactElement {
  const { taskId } = useParams<{ taskId: string }>();

  // Fetch task data for review
  const { data: task, isLoading, error } = useTaskForReview(taskId);

  // Corrected data state (initialized from original annotation)
  const [correctedData, setCorrectedData] = useState<Record<string, unknown>>(
    {},
  );

  // Initialize corrected data when task loads
  useEffect(() => {
    if (task?.annotation) {
      setCorrectedData(task.annotation.data);
    }
  }, [task?.annotation]);

  // Submit review mutation
  const submitMutation = useSubmitReview({ taskId });

  // Check if corrections have been made
  const hasCorrectedData =
    task?.annotation && !isEqual(correctedData, task.annotation.data);

  // Handle review action
  const handleAction = useCallback(
    (action: ReviewAction, note?: string) => {
      if (!task?.annotation) return;

      submitMutation.mutate({
        annotation_id: task.annotation.annotation_id,
        action,
        corrected_data: hasCorrectedData ? correctedData : undefined,
        summary_note: note,
      });
    },
    [task?.annotation, correctedData, hasCorrectedData, submitMutation],
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-screen flex-col">
        <div className="flex flex-1 items-center justify-center">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading review...</span>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !task) {
    return (
      <div className="flex h-screen flex-col">
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-center">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <div>
              <h2 className="text-lg font-semibold">Failed to load review</h2>
              <p className="text-muted-foreground">
                {error instanceof Error
                  ? error.message
                  : "Task not found or not ready for review."}
              </p>
            </div>
            <Link
              to="/queue"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Return to Queue
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold">Review Task</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{task.project_name}</span>
            <span className="text-border">•</span>
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              {task.task_id}
            </code>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <User className="h-4 w-4" />
            <span>Annotator: {task.annotation.user_name}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            <span>Submitted: {formatDate(task.annotation.submitted_at)}</span>
          </div>
        </div>
      </div>

      {/* Instructions (if any) */}
      {task.instructions && (
        <div className="border-b border-border bg-muted/30 px-4 py-2">
          <p className="text-sm text-muted-foreground">{task.instructions}</p>
        </div>
      )}

      {/* Main content: Side-by-side view */}
      <div className="flex-1 overflow-hidden p-4">
        <ReviewSideBySide
          layout={task.layout}
          originalAnnotation={task.annotation.data}
          taskInput={task.input_data}
          correctedData={correctedData}
          onCorrectionChange={setCorrectedData}
          taskInfo={{
            id: task.task_id,
            project_id: task.project_id,
            step_id: task.step_id,
          }}
        />
      </div>

      {/* Actions footer */}
      <ReviewActions
        onAction={handleAction}
        isSubmitting={submitMutation.isPending}
        hasCorrectedData={hasCorrectedData}
      />
    </div>
  );
}
