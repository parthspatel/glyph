/**
 * AnnotationTabs - Tabbed view for comparing multiple annotations.
 *
 * Displays each annotator's submission in a separate tab for easy comparison.
 */

import React from "react";
import { LayoutRenderer, type LayoutConfig } from "@glyph/layout-runtime";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import type { AnnotationForComparison } from "../../api/adjudication";

interface TaskInfo {
  id: string;
  project_id: string;
  step_id: string;
}

interface AnnotationTabsProps {
  /** List of annotations to compare */
  annotations: AnnotationForComparison[];
  /** Layout configuration for rendering */
  layout: LayoutConfig;
  /** Task input data */
  taskInput: Record<string, unknown>;
  /** Currently selected annotation ID */
  selectedId: string;
  /** Callback when annotation is selected */
  onSelect: (annotationId: string) => void;
  /** Task info for layout context */
  taskInfo: TaskInfo;
}

export function AnnotationTabs({
  annotations,
  layout,
  taskInput,
  selectedId,
  onSelect,
  taskInfo,
}: AnnotationTabsProps): React.ReactElement {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card">
      <div className="border-b border-border bg-muted/30 px-4 py-2">
        <h3 className="text-sm font-medium text-muted-foreground">
          Annotations ({annotations.length})
        </h3>
      </div>
      <Tabs
        value={selectedId}
        onValueChange={onSelect}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <TabsList className="mx-4 mt-3 w-fit">
          {annotations.map((annotation, index) => (
            <TabsTrigger
              key={annotation.annotation_id}
              value={annotation.annotation_id}
            >
              Annotator {index + 1}
            </TabsTrigger>
          ))}
        </TabsList>
        <div className="flex-1 overflow-auto">
          {annotations.map((annotation) => (
            <TabsContent
              key={annotation.annotation_id}
              value={annotation.annotation_id}
              className="h-full p-4"
            >
              <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground">
                <span>{annotation.user_name}</span>
                <span>
                  {new Date(annotation.submitted_at).toLocaleDateString()}
                </span>
              </div>
              <LayoutRenderer
                layout={layout}
                context={{
                  input: taskInput,
                  output: annotation.data,
                  context: {
                    ai_suggestions: [],
                    previous_annotations: [],
                  },
                  config: { readOnly: true },
                  user: {
                    id: annotation.user_id,
                    name: annotation.user_name,
                    roles: ["annotator"],
                  },
                  task: taskInfo,
                }}
                onOutputChange={() => {}} // Read-only
              />
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  );
}
