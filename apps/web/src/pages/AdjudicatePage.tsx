/**
 * AdjudicatePage - Adjudication interface for resolving conflicts.
 *
 * Displays multiple annotations for comparison and allows adjudicator
 * to create a final authoritative resolution.
 */

import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { AlertCircle, Loader2, Users } from "lucide-react";
import { AnnotationTabs, ResolutionPanel } from "../components/adjudication";
import {
  useTaskForAdjudication,
  useSubmitResolution,
} from "../hooks/useAdjudication";

export function AdjudicatePage(): React.ReactElement {
  const { taskId } = useParams<{ taskId: string }>();

  // Fetch task data for adjudication
  const { data: task, isLoading, error } = useTaskForAdjudication(taskId);

  // State for selected annotation and resolution
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string>("");
  const [resolutionData, setResolutionData] = useState<Record<string, unknown>>(
    {}
  );

  // Track which annotation the resolution is based on
  const [sourceAnnotationId, setSourceAnnotationId] = useState<
    string | undefined
  >(undefined);

  // Initialize state when task loads
  useEffect(() => {
    if (task?.annotations && task.annotations.length > 0) {
      const firstAnnotation = task.annotations[0];
      setSelectedAnnotationId(firstAnnotation.annotation_id);
      setResolutionData(firstAnnotation.data);
      setSourceAnnotationId(firstAnnotation.annotation_id);
    }
  }, [task?.annotations]);

  // Submit resolution mutation
  const submitMutation = useSubmitResolution({ taskId });

  // Handle annotation selection - copy data to resolution
  const handleSelectAnnotation = useCallback(
    (annotationId: string) => {
      setSelectedAnnotationId(annotationId);

      // Find the selected annotation and copy its data
      const selected = task?.annotations.find(
        (a) => a.annotation_id === annotationId
      );
      if (selected) {
        setResolutionData(selected.data);
        setSourceAnnotationId(annotationId);
      }
    },
    [task?.annotations]
  );

  // Handle resolution data change
  const handleResolutionChange = useCallback(
    (data: Record<string, unknown>) => {
      setResolutionData(data);
      // Once edited, no longer directly sourced from an annotation
      // Keep sourceAnnotationId as "base" but data has been modified
    },
    []
  );

  // Handle submit
  const handleSubmit = useCallback(() => {
    submitMutation.mutate({
      data: resolutionData,
      source_annotation_id: sourceAnnotationId,
    });
  }, [resolutionData, sourceAnnotationId, submitMutation]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-screen flex-col">
        <div className="flex flex-1 items-center justify-center">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading adjudication...</span>
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
              <h2 className="text-lg font-semibold">
                Failed to load adjudication
              </h2>
              <p className="text-muted-foreground">
                {error instanceof Error
                  ? error.message
                  : "Task not found or not ready for adjudication."}
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

  // No annotations to adjudicate
  if (task.annotations.length === 0) {
    return (
      <div className="flex h-screen flex-col">
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-center">
            <Users className="h-12 w-12 text-muted-foreground" />
            <div>
              <h2 className="text-lg font-semibold">No annotations to review</h2>
              <p className="text-muted-foreground">
                This task has no conflicting annotations to adjudicate.
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

  // Task info for layout context
  const taskInfo = {
    id: task.task_id,
    project_id: task.project_id,
    step_id: task.step_id,
  };

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold">Adjudicate Task</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{task.project_name}</span>
            <span className="text-border">•</span>
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              {task.task_id}
            </code>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{task.annotations.length} annotations to compare</span>
          {task.consensus_metrics?.agreement_score !== undefined && (
            <>
              <span className="text-border">•</span>
              <span>
                Agreement:{" "}
                {(task.consensus_metrics.agreement_score * 100).toFixed(0)}%
              </span>
            </>
          )}
        </div>
      </div>

      {/* Instructions (if any) */}
      {task.instructions && (
        <div className="border-b border-border bg-muted/30 px-4 py-2">
          <p className="text-sm text-muted-foreground">{task.instructions}</p>
        </div>
      )}

      {/* Main content: Two-column grid */}
      <div className="grid flex-1 grid-cols-2 gap-4 overflow-hidden p-4">
        {/* Left: Annotation tabs for comparison */}
        <AnnotationTabs
          annotations={task.annotations}
          layout={task.layout}
          taskInput={task.input_data}
          selectedId={selectedAnnotationId}
          onSelect={handleSelectAnnotation}
          taskInfo={taskInfo}
        />

        {/* Right: Resolution panel */}
        <ResolutionPanel
          layout={task.layout}
          taskInput={task.input_data}
          resolutionData={resolutionData}
          onResolutionChange={handleResolutionChange}
          onSubmit={handleSubmit}
          taskInfo={taskInfo}
          isSubmitting={submitMutation.isPending}
        />
      </div>
    </div>
  );
}
