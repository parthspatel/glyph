/**
 * SaveStatus - Displays the current save state of annotation drafts.
 *
 * Shows different states: idle, pending, saving, saved, error
 */

import React from "react";
import { Cloud, Loader2, AlertCircle } from "lucide-react";

/**
 * Save status state variants.
 */
export type SaveStatusState =
  | "idle"
  | "pending"
  | { saving: true }
  | { saved: Date }
  | { error: string };

interface SaveStatusProps {
  status: SaveStatusState;
  className?: string;
}

/**
 * Format time for display (e.g., "2:30 PM").
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function SaveStatus({
  status,
  className = "",
}: SaveStatusProps): React.ReactElement {
  // Idle - no draft yet
  if (status === "idle") {
    return (
      <div
        className={`flex items-center gap-1.5 text-sm text-muted-foreground ${className}`}
      >
        <Cloud className="h-4 w-4" />
        <span>No draft</span>
      </div>
    );
  }

  // Pending - changes waiting to be saved
  if (status === "pending") {
    return (
      <div
        className={`flex items-center gap-1.5 text-sm text-muted-foreground ${className}`}
      >
        <Cloud className="h-4 w-4" />
        <span>Unsaved changes</span>
      </div>
    );
  }

  // Saving - actively saving
  if (typeof status === "object" && "saving" in status) {
    return (
      <div
        className={`flex items-center gap-1.5 text-sm text-muted-foreground ${className}`}
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Saving...</span>
      </div>
    );
  }

  // Saved - successfully saved with timestamp
  if (typeof status === "object" && "saved" in status) {
    return (
      <div
        className={`flex items-center gap-1.5 text-sm text-success ${className}`}
      >
        <Cloud className="h-4 w-4" />
        <span>Draft saved at {formatTime(status.saved)}</span>
      </div>
    );
  }

  // Error - save failed
  return (
    <div
      className={`flex items-center gap-1.5 text-sm text-destructive ${className}`}
    >
      <AlertCircle className="h-4 w-4" />
      <span>Save failed</span>
    </div>
  );
}
