/**
 * AnnotatePage - Main annotation workspace for annotators.
 *
 * Renders the task layout with toolbar, handles output changes,
 * and manages draft state with auto-save.
 */

import React, { useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useHotkeys } from "react-hotkeys-hook";
import { AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { LayoutRenderer } from "@glyph/layout-runtime";
import {
  AnnotationToolbar,
  SkipTaskModal,
  InstructionsPanel,
  ShortcutsModal,
} from "../components/annotation";
import { useTaskForAnnotation } from "../hooks/useTask";
import { useDraft } from "../hooks/useDraft";
import { useUnsavedChanges } from "../hooks/useUnsavedChanges";
import { useAnnotationSubmit } from "../hooks/useAnnotationSubmit";

export function AnnotatePage(): React.ReactElement {
  const { taskId } = useParams<{ taskId: string }>();

  // Fetch task with layout
  const {
    data: task,
    isLoading: taskLoading,
    error,
  } = useTaskForAnnotation(taskId);

  // Annotation output state
  const [output, setOutput] = useState<Record<string, unknown>>({});

  // UI state for panels/modals
  const [showInstructions, setShowInstructions] = useState(true);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showSkipModal, setShowSkipModal] = useState(false);

  // Auto-save draft hook
  const {
    saveStatus,
    save,
    clear: clearDraft,
    isLoading: draftLoading,
  } = useDraft({
    taskId,
    onLoad: (draftData) => {
      // Initialize output from loaded draft
      setOutput(draftData);
    },
  });

  // Annotation submit hook
  const { submit, isSubmitting, showNextButton, goToNext, validationErrors } =
    useAnnotationSubmit({
      taskId,
      projectId: task?.project_id,
      onClearDraft: clearDraft,
    });

  // Warn about unsaved changes
  useUnsavedChanges({
    isDirty:
      saveStatus === "pending" ||
      (typeof saveStatus === "object" && "saving" in saveStatus),
    enabled: !showNextButton, // Don't warn after successful submit
  });

  // Keyboard shortcuts
  useHotkeys("?", () => setShowShortcuts(true), { enableOnFormTags: false }, [
    setShowShortcuts,
  ]);

  useHotkeys(
    "mod+enter",
    () => {
      if (!showNextButton && !isSubmitting) {
        submit(output);
      }
    },
    { enableOnFormTags: true, preventDefault: true },
    [output, showNextButton, isSubmitting, submit],
  );

  useHotkeys(
    "mod+s",
    () => {
      if (!showNextButton) {
        save(output);
      }
    },
    { enableOnFormTags: true, preventDefault: true },
    [output, showNextButton, save],
  );

  useHotkeys(
    "escape",
    () => {
      setShowShortcuts(false);
      setShowSkipModal(false);
    },
    { enableOnFormTags: true },
    [],
  );

  // Handle output changes from LayoutRenderer
  const handleOutputChange = useCallback(
    (newOutput: Record<string, unknown>) => {
      if (showNextButton) return; // Don't allow changes after submit
      setOutput(newOutput);
      save(newOutput);
    },
    [save, showNextButton],
  );

  // Handle submit
  const handleSubmit = useCallback(() => {
    submit(output);
  }, [output, submit]);

  // Handle skip - open modal
  const handleSkip = useCallback(() => {
    setShowSkipModal(true);
  }, []);

  // Loading state (task or draft)
  if (taskLoading || draftLoading) {
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
      {showNextButton ? (
        // Post-submit toolbar with Next Task button
        <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
          <div className="flex items-center gap-2 text-success">
            <span className="text-sm font-medium">✓ Annotation submitted</span>
          </div>
          <button
            onClick={goToNext}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <span>Next Task</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <AnnotationToolbar
          taskInfo={{
            projectName: task.project_name,
            taskId: task.task_id,
            stepType: task.step_type,
          }}
          saveStatus={saveStatus}
          onInstructionsClick={() => setShowInstructions(!showInstructions)}
          onShortcutsClick={() => setShowShortcuts(true)}
          onSubmit={handleSubmit}
          onSkip={handleSkip}
          isSubmitting={isSubmitting}
          canSubmit={Object.keys(output).length > 0}
        />
      )}

      {/* Instructions Panel */}
      <InstructionsPanel
        instructions={task.instructions}
        isExpanded={showInstructions}
        onToggle={() => setShowInstructions(!showInstructions)}
      />

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <div className="border-b border-destructive/20 bg-destructive/10 px-4 py-2">
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{validationErrors[0].message}</span>
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 overflow-auto p-4">
        <LayoutRenderer
          layout={task.layout}
          context={layoutContext}
          onOutputChange={handleOutputChange}
        />
      </div>

      {/* Skip Task Modal */}
      <SkipTaskModal
        open={showSkipModal}
        onOpenChange={setShowSkipModal}
        taskId={task.task_id}
        projectId={task.project_id}
      />

      {/* Shortcuts Modal */}
      <ShortcutsModal open={showShortcuts} onOpenChange={setShowShortcuts} />
    </div>
  );
}
