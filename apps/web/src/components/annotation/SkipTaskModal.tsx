/**
 * SkipTaskModal - Modal for selecting a reason to skip a task.
 *
 * Displays available skip reasons (system + project) and submits
 * the skip action to advance the workflow.
 */

import React, { useState } from "react";
import { AlertCircle, Loader2, SkipForward } from "lucide-react";
import { useSkipReasons, useSkipTask } from "../../hooks/useSkipReasons";

interface SkipTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  projectId: string;
  onSkipped?: () => void;
}

export function SkipTaskModal({
  open,
  onOpenChange,
  taskId,
  projectId,
  onSkipped,
}: SkipTaskModalProps): React.ReactElement | null {
  const [selectedReasonId, setSelectedReasonId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const { data: skipReasons, isLoading: reasonsLoading } =
    useSkipReasons(projectId);
  const skipTask = useSkipTask();

  const handleSkip = async () => {
    if (!selectedReasonId) return;

    try {
      await skipTask.mutateAsync({
        taskId,
        skipReasonId: selectedReasonId,
        note: note.trim() || undefined,
      });
      onSkipped?.();
      onOpenChange(false);
    } catch {
      // Error handled by mutation
    }
  };

  const handleClose = () => {
    if (!skipTask.isPending) {
      setSelectedReasonId(null);
      setNote("");
      onOpenChange(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md rounded-lg bg-card p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <SkipForward className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Skip Task</h2>
            <p className="text-sm text-muted-foreground">
              Select a reason for skipping this task
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="mt-6">
          {reasonsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : skipReasons && skipReasons.length > 0 ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason *</label>
              <div className="space-y-2">
                {skipReasons.map((reason) => (
                  <label
                    key={reason.skip_reason_id}
                    className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 transition-colors ${
                      selectedReasonId === reason.skip_reason_id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="skip-reason"
                      value={reason.skip_reason_id}
                      checked={selectedReasonId === reason.skip_reason_id}
                      onChange={() => setSelectedReasonId(reason.skip_reason_id)}
                      className="h-4 w-4 text-primary"
                    />
                    <div>
                      <div className="font-medium">{reason.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {reason.scope === "system" ? "System" : "Project"} reason
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              <span>No skip reasons available</span>
            </div>
          )}

          {/* Optional note */}
          <div className="mt-4">
            <label className="text-sm font-medium">Additional notes (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Provide any additional context..."
              className="mt-1 h-20 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Error display */}
          {skipTask.isError && (
            <div className="mt-4 flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>
                {skipTask.error instanceof Error
                  ? skipTask.error.message
                  : "Failed to skip task"}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={handleClose}
            disabled={skipTask.isPending}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSkip}
            disabled={!selectedReasonId || skipTask.isPending}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {skipTask.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Skipping...</span>
              </>
            ) : (
              <>
                <SkipForward className="h-4 w-4" />
                <span>Skip Task</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
