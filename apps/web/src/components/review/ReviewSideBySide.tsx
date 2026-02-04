/**
 * ReviewSideBySide - Side-by-side comparison view for reviews.
 *
 * Displays original annotation on the left and editable corrections on the right.
 */

import React from "react";
import { LayoutRenderer, type LayoutConfig } from "@glyph/layout-runtime";

interface TaskInfo {
  id: string;
  project_id: string;
  step_id: string;
}

interface ReviewSideBySideProps {
  /** Layout configuration for rendering */
  layout: LayoutConfig;
  /** Original annotation data (read-only) */
  originalAnnotation: Record<string, unknown>;
  /** Task input data */
  taskInput: Record<string, unknown>;
  /** Current corrected data state */
  correctedData: Record<string, unknown>;
  /** Callback when correction data changes */
  onCorrectionChange: (data: Record<string, unknown>) => void;
  /** Task info for layout context */
  taskInfo: TaskInfo;
  /** Whether the correction side is read-only */
  readOnly?: boolean;
}

export function ReviewSideBySide({
  layout,
  originalAnnotation,
  taskInput,
  correctedData,
  onCorrectionChange,
  taskInfo,
  readOnly = false,
}: ReviewSideBySideProps): React.ReactElement {
  // Context for the original (read-only) side
  const originalContext = {
    input: taskInput,
    output: originalAnnotation,
    context: {
      ai_suggestions: [],
      previous_annotations: [],
    },
    config: { readOnly: true },
    user: {
      id: "reviewer",
      name: "Reviewer",
      roles: ["reviewer"],
    },
    task: taskInfo,
  };

  // Context for the correction (editable) side
  const correctionContext = {
    input: taskInput,
    output: correctedData,
    context: {
      ai_suggestions: [],
      previous_annotations: [],
    },
    config: { readOnly },
    user: {
      id: "reviewer",
      name: "Reviewer",
      roles: ["reviewer"],
    },
    task: taskInfo,
  };

  return (
    <div className="grid h-full grid-cols-2 gap-4">
      {/* Left side: Original annotation (read-only) */}
      <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
        <div className="border-b border-border bg-muted/30 px-4 py-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Original Annotation
          </h3>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <LayoutRenderer
            layout={layout}
            context={originalContext}
            onOutputChange={() => {}} // No-op for read-only
          />
        </div>
      </div>

      {/* Right side: Corrections (editable) */}
      <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
        <div className="border-b border-border bg-muted/30 px-4 py-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            {readOnly ? "Corrected Version" : "Your Corrections"}
          </h3>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <LayoutRenderer
            layout={layout}
            context={correctionContext}
            onOutputChange={readOnly ? () => {} : onCorrectionChange}
          />
        </div>
      </div>
    </div>
  );
}
