/**
 * ResolutionPanel - Editable panel for creating the final resolution.
 *
 * Allows adjudicator to edit and submit the authoritative annotation.
 */

import React from "react";
import { Check, Loader2 } from "lucide-react";
import { LayoutRenderer, type LayoutConfig } from "@glyph/layout-runtime";

interface TaskInfo {
  id: string;
  project_id: string;
  step_id: string;
}

interface ResolutionPanelProps {
  /** Layout configuration for rendering */
  layout: LayoutConfig;
  /** Task input data */
  taskInput: Record<string, unknown>;
  /** Current resolution data */
  resolutionData: Record<string, unknown>;
  /** Callback when resolution data changes */
  onResolutionChange: (data: Record<string, unknown>) => void;
  /** Callback when submit is clicked */
  onSubmit: () => void;
  /** Task info for layout context */
  taskInfo: TaskInfo;
  /** Whether submission is in progress */
  isSubmitting?: boolean;
}

export function ResolutionPanel({
  layout,
  taskInput,
  resolutionData,
  onResolutionChange,
  onSubmit,
  taskInfo,
  isSubmitting = false,
}: ResolutionPanelProps): React.ReactElement {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card">
      {/* Header with submit button */}
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2">
        <h3 className="text-sm font-medium text-muted-foreground">
          Final Resolution
        </h3>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          <span>Submit Resolution</span>
        </button>
      </div>

      {/* Editable layout */}
      <div className="flex-1 overflow-auto p-4">
        <LayoutRenderer
          layout={layout}
          context={{
            input: taskInput,
            output: resolutionData,
            context: {
              ai_suggestions: [],
              previous_annotations: [],
            },
            config: { readOnly: false },
            user: {
              id: "adjudicator",
              name: "Adjudicator",
              roles: ["adjudicator"],
            },
            task: taskInfo,
          }}
          onOutputChange={onResolutionChange}
        />
      </div>
    </div>
  );
}
