/**
 * AnnotationToolbar - Collapsible toolbar for annotation workspace.
 *
 * Displays task info, save status, and action buttons.
 * Collapse state persists in localStorage.
 */

import React, { useState, useEffect } from "react";
import {
  ChevronUp,
  ChevronDown,
  HelpCircle,
  Keyboard,
  Send,
  SkipForward,
} from "lucide-react";
import { SaveStatus, type SaveStatusState } from "./SaveStatus";

const TOOLBAR_COLLAPSED_KEY = "glyph:annotation-toolbar-collapsed";

interface TaskInfo {
  projectName: string;
  taskId: string;
  stepType: string;
}

interface AnnotationToolbarProps {
  taskInfo: TaskInfo;
  saveStatus: SaveStatusState;
  onInstructionsClick: () => void;
  onShortcutsClick: () => void;
  onSubmit: () => void;
  onSkip: () => void;
  isSubmitting?: boolean;
  canSubmit?: boolean;
}

export function AnnotationToolbar({
  taskInfo,
  saveStatus,
  onInstructionsClick,
  onShortcutsClick,
  onSubmit,
  onSkip,
  isSubmitting = false,
  canSubmit = true,
}: AnnotationToolbarProps): React.ReactElement {
  // Load collapsed state from localStorage
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(TOOLBAR_COLLAPSED_KEY) === "true";
  });

  // Persist collapsed state
  useEffect(() => {
    localStorage.setItem(TOOLBAR_COLLAPSED_KEY, String(isCollapsed));
  }, [isCollapsed]);

  const toggleCollapsed = () => setIsCollapsed(!isCollapsed);

  // Collapsed view - minimal
  if (isCollapsed) {
    return (
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2">
        <SaveStatus status={saveStatus} />
        <button
          onClick={toggleCollapsed}
          className="rounded p-1 hover:bg-muted"
          aria-label="Expand toolbar"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
    );
  }

  // Expanded view - full toolbar
  return (
    <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
      {/* Left: Task info */}
      <div className="flex items-center gap-4">
        <div>
          <div className="text-sm font-medium">{taskInfo.projectName}</div>
          <div className="text-xs text-muted-foreground">
            Task {taskInfo.taskId.slice(-8)} • {taskInfo.stepType}
          </div>
        </div>
        <div className="h-8 w-px bg-border" />
        <SaveStatus status={saveStatus} />
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Instructions button */}
        <button
          onClick={onInstructionsClick}
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm hover:bg-muted"
          title="View instructions"
        >
          <HelpCircle className="h-4 w-4" />
          <span className="hidden sm:inline">Instructions</span>
        </button>

        {/* Shortcuts button */}
        <button
          onClick={onShortcutsClick}
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm hover:bg-muted"
          title="Keyboard shortcuts"
        >
          <Keyboard className="h-4 w-4" />
          <span className="hidden sm:inline">Shortcuts</span>
        </button>

        <div className="h-6 w-px bg-border" />

        {/* Skip button */}
        <button
          onClick={onSkip}
          disabled={isSubmitting}
          className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
        >
          <SkipForward className="h-4 w-4" />
          <span>Skip</span>
        </button>

        {/* Submit button */}
        <button
          onClick={onSubmit}
          disabled={isSubmitting || !canSubmit}
          className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          <span>{isSubmitting ? "Submitting..." : "Submit"}</span>
        </button>

        {/* Collapse button */}
        <button
          onClick={toggleCollapsed}
          className="ml-2 rounded p-1 hover:bg-muted"
          aria-label="Collapse toolbar"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
