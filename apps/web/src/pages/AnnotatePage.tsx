/**
 * AnnotatePage - Main annotation workspace for annotators.
 *
 * Renders the task layout with toolbar, handles output changes,
 * and manages draft state.
 */

import React, { useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { AlertCircle, Loader2 } from "lucide-react";
import { LayoutRenderer } from "@glyph/layout-runtime";
import {
  AnnotationToolbar,
  type SaveStatusState,
} from "../components/annotation";
import { useTaskForAnnotation } from "../hooks/useTask";

export function AnnotatePage(): React.ReactElement {
  const { taskId } = useParams<{ taskId: string }>();

  // Fetch task with layout
  const { data: task, isLoading, error } = useTaskForAnnotation(taskId);

  // Annotation output state
  const [output, setOutput] = useState<Record<string, unknown>>({});

  // Save status state
  const [saveStatus, setSaveStatus] = useState<SaveStatusState>("idle");

  // UI state for panels/modals (will be implemented in later plans)
  const [showInstructions, setShowInstructions] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle output changes from LayoutRenderer
  const handleOutputChange = useCallback(
    (newOutput: Record<string, unknown>) => {
      setOutput(newOutput);
      // Mark as pending save (auto-save will be implemented in Plan 09-03)
      setSaveStatus("pending");
    },
    [],
  );

  // Handle submit (placeholder - will be implemented in Plan 09-05)
  const handleSubmit = useCallback(() => {
    setIsSubmitting(true);
    // TODO: Implement submission flow in Plan 09-05
    console.log("Submit annotation:", output);
    setTimeout(() => setIsSubmitting(false), 1000);
  }, [output]);

  // Handle skip (placeholder - will be implemented in Plan 09-04)
  const handleSkip = useCallback(() => {
    // TODO: Implement skip flow in Plan 09-04
    console.log("Skip task");
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-screen flex-col">
        <div className="flex flex-1 items-center justify-center">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading task...</span>
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
              <h2 className="text-lg font-semibold">Failed to load task</h2>
              <p className="text-muted-foreground">
                {error instanceof Error
                  ? error.message
                  : "Task not found or you don't have access."}
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

  // Build layout context
  const layoutContext = {
    input: task.input_data,
    output,
    context: {
      ai_suggestions: [],
      previous_annotations: [],
    },
    config: {},
    user: {
      id: "current-user", // TODO: Get from auth context
      name: "Current User",
      roles: ["annotator"],
    },
    task: {
      id: task.task_id,
      project_id: task.project_id,
      step_id: task.step_id,
    },
  };

  return (
    <div className="flex h-screen flex-col">
      {/* Toolbar */}
      <AnnotationToolbar
        taskInfo={{
          projectName: task.project_name,
          taskId: task.task_id,
          stepType: task.step_type,
        }}
        saveStatus={saveStatus}
        onInstructionsClick={() => setShowInstructions(true)}
        onShortcutsClick={() => setShowShortcuts(true)}
        onSubmit={handleSubmit}
        onSkip={handleSkip}
        isSubmitting={isSubmitting}
        canSubmit={Object.keys(output).length > 0}
      />

      {/* Main content area */}
      <div className="flex-1 overflow-auto p-4">
        <LayoutRenderer
          layout={task.layout}
          context={layoutContext}
          onOutputChange={handleOutputChange}
        />
      </div>

      {/* Instructions Panel - placeholder for Plan 09-06 */}
      {showInstructions && (
        <div className="fixed inset-y-0 right-0 z-50 w-96 border-l border-border bg-card p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Instructions</h2>
            <button
              onClick={() => setShowInstructions(false)}
              className="rounded p-1 hover:bg-muted"
            >
              ×
            </button>
          </div>
          <div className="mt-4 text-muted-foreground">
            {task.instructions || "No instructions available for this task."}
          </div>
        </div>
      )}

      {/* Shortcuts Modal - placeholder for Plan 09-06 */}
      {showShortcuts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Keyboard Shortcuts</h2>
              <button
                onClick={() => setShowShortcuts(false)}
                className="rounded p-1 hover:bg-muted"
              >
                ×
              </button>
            </div>
            <div className="mt-4 text-sm text-muted-foreground">
              Keyboard shortcuts will be configured in Plan 09-06.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
