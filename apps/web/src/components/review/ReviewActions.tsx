/**
 * ReviewActions - Review action buttons with note input.
 *
 * Provides approve, reject, and request changes actions with optional note.
 */

import React, { useState, useCallback } from "react";
import { Check, X, MessageSquare, Loader2 } from "lucide-react";
import type { ReviewAction } from "@glyph/types";

interface ReviewActionsProps {
  /** Callback when an action is selected */
  onAction: (action: ReviewAction, note?: string) => void;
  /** Whether submission is in progress */
  isSubmitting?: boolean;
  /** Whether the reviewer has made corrections */
  hasCorrectedData?: boolean;
}

export function ReviewActions({
  onAction,
  isSubmitting = false,
  hasCorrectedData = false,
}: ReviewActionsProps): React.ReactElement {
  // State for note input
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [note, setNote] = useState("");
  const [pendingAction, setPendingAction] = useState<ReviewAction | null>(null);

  // Handle action click
  const handleActionClick = useCallback(
    (action: ReviewAction) => {
      if (action === "request_changes") {
        // Request changes requires a note
        setPendingAction(action);
        setShowNoteInput(true);
      } else {
        // Approve and reject can be submitted directly
        onAction(action);
      }
    },
    [onAction]
  );

  // Handle note submission
  const handleSubmitWithNote = useCallback(() => {
    if (pendingAction && note.trim()) {
      onAction(pendingAction, note.trim());
    }
  }, [pendingAction, note, onAction]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    setShowNoteInput(false);
    setNote("");
    setPendingAction(null);
  }, []);

  // Note input view
  if (showNoteInput) {
    return (
      <div className="flex flex-col gap-3 border-t border-border bg-card p-4">
        <label className="text-sm font-medium">
          Describe the changes needed:
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What should the annotator fix or improve?"
          className="h-24 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          autoFocus
          disabled={isSubmitting}
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmitWithNote}
            disabled={isSubmitting || !note.trim()}
            className="flex items-center gap-2 rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MessageSquare className="h-4 w-4" />
            )}
            <span>Submit Request</span>
          </button>
        </div>
      </div>
    );
  }

  // Action buttons view
  return (
    <div className="flex items-center justify-between border-t border-border bg-card p-4">
      <div className="text-sm text-muted-foreground">
        {hasCorrectedData && (
          <span className="text-amber-600">
            • You have made corrections
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {/* Request Changes */}
        <button
          type="button"
          onClick={() => handleActionClick("request_changes")}
          disabled={isSubmitting}
          className="flex items-center gap-2 rounded-md border border-amber-600 bg-transparent px-4 py-2 text-sm font-medium text-amber-600 hover:bg-amber-600/10 disabled:opacity-50"
        >
          <MessageSquare className="h-4 w-4" />
          <span>Request Changes</span>
        </button>

        {/* Reject */}
        <button
          type="button"
          onClick={() => handleActionClick("reject")}
          disabled={isSubmitting}
          className="flex items-center gap-2 rounded-md border border-destructive bg-transparent px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <X className="h-4 w-4" />
          )}
          <span>Reject</span>
        </button>

        {/* Approve */}
        <button
          type="button"
          onClick={() => handleActionClick("approve")}
          disabled={isSubmitting}
          className="flex items-center gap-2 rounded-md bg-success px-4 py-2 text-sm font-medium text-success-foreground hover:bg-success/90 disabled:opacity-50"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          <span>{hasCorrectedData ? "Approve with Edits" : "Approve"}</span>
        </button>
      </div>
    </div>
  );
}
