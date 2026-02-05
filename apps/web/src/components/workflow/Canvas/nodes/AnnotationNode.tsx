/**
 * AnnotationNode - Annotation step with blue accent.
 */
import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Pencil } from "lucide-react";
import { BaseNode } from "./BaseNode";
import { cn } from "@/lib/utils";
import type { WorkflowNode } from "../../types";

export const AnnotationNode = memo(function AnnotationNode({
  selected,
  data,
}: NodeProps<WorkflowNode>) {
  const config = data.stepConfig;
  const layoutName = config?.settings?.layout_id
    ? "Layout assigned"
    : "No layout";
  const skillsCount = config?.settings?.required_roles?.length ?? 0;

  return (
    <BaseNode selected={selected} hasError={data.hasError}>
      <Handle
        type="target"
        position={Position.Top}
        id="target"
        className="!bg-blue-500 !w-3 !h-3 !border-2 !border-background"
      />
      <div
        className={cn(
          "w-48 min-h-16 rounded-lg border bg-card shadow-sm overflow-hidden",
          selected && "border-primary",
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 border-b">
          <Pencil className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-medium truncate">
            {data.label || config?.name || "Annotation"}
          </span>
        </div>
        {/* Body */}
        <div className="px-3 py-2 space-y-1">
          <p className="text-xs text-muted-foreground">{layoutName}</p>
          {skillsCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {skillsCount} skill{skillsCount !== 1 ? "s" : ""} required
            </p>
          )}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="source"
        className="!bg-blue-500 !w-3 !h-3 !border-2 !border-background"
      />
    </BaseNode>
  );
});
