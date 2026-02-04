/**
 * ReviewNode - Review step with green accent.
 */
import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Eye } from "lucide-react";
import { BaseNode } from "./BaseNode";
import { cn } from "@/lib/utils";
import type { WorkflowNode } from "../../types";

export const ReviewNode = memo(function ReviewNode({
  selected,
  data,
}: NodeProps<WorkflowNode>) {
  const config = data.stepConfig;
  const layoutName = config?.settings?.layout_id ? "Layout assigned" : "No layout";
  const showPrevious = config?.settings?.show_previous ?? true;

  return (
    <BaseNode selected={selected} hasError={data.hasError}>
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-green-500 !w-3 !h-3 !border-2 !border-background"
      />
      <div
        className={cn(
          "w-48 min-h-16 rounded-lg border bg-card shadow-sm overflow-hidden",
          selected && "border-primary"
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border-b">
          <Eye className="h-4 w-4 text-green-500" />
          <span className="text-sm font-medium truncate">
            {data.label || config?.name || "Review"}
          </span>
        </div>
        {/* Body */}
        <div className="px-3 py-2 space-y-1">
          <p className="text-xs text-muted-foreground">{layoutName}</p>
          <p className="text-xs text-muted-foreground">
            Show previous: {showPrevious ? "Yes" : "No"}
          </p>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-green-500 !w-3 !h-3 !border-2 !border-background"
      />
    </BaseNode>
  );
});
