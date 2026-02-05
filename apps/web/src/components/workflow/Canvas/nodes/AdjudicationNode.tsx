/**
 * AdjudicationNode - Adjudication step with orange accent.
 */
import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Scale } from "lucide-react";
import { BaseNode } from "./BaseNode";
import { cn } from "@/lib/utils";
import type { WorkflowNode } from "../../types";

export const AdjudicationNode = memo(function AdjudicationNode({
  selected,
  data,
}: NodeProps<WorkflowNode>) {
  const config = data.stepConfig;
  const layoutName = config?.settings?.layout_id
    ? "Layout assigned"
    : "No layout";
  const threshold = config?.settings?.threshold;
  const thresholdText =
    threshold !== undefined
      ? `${Math.round(threshold * 100)}% agreement`
      : "No threshold";

  return (
    <BaseNode selected={selected} hasError={data.hasError}>
      <Handle
        type="target"
        position={Position.Top}
        id="target"
        className="!bg-orange-500 !w-3 !h-3 !border-2 !border-background"
      />
      <div
        className={cn(
          "w-48 min-h-16 rounded-lg border bg-card shadow-sm overflow-hidden",
          selected && "border-primary",
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 bg-orange-500/10 border-b">
          <Scale className="h-4 w-4 text-orange-500" />
          <span className="text-sm font-medium truncate">
            {data.label || config?.name || "Adjudication"}
          </span>
        </div>
        {/* Body */}
        <div className="px-3 py-2 space-y-1">
          <p className="text-xs text-muted-foreground">{layoutName}</p>
          <p className="text-xs text-muted-foreground">{thresholdText}</p>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="source"
        className="!bg-orange-500 !w-3 !h-3 !border-2 !border-background"
      />
    </BaseNode>
  );
});
