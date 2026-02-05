/**
 * AutoProcessNode - Automatic processing step with indigo accent.
 */
import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Cog } from "lucide-react";
import { BaseNode } from "./BaseNode";
import { cn } from "@/lib/utils";
import type { WorkflowNode } from "../../types";

export const AutoProcessNode = memo(function AutoProcessNode({
  selected,
  data,
}: NodeProps<WorkflowNode>) {
  const config = data.stepConfig;

  return (
    <BaseNode selected={selected} hasError={data.hasError}>
      <Handle
        type="target"
        position={Position.Top}
        id="target"
        className="!bg-indigo-500 !w-3 !h-3 !border-2 !border-background"
      />
      <div
        className={cn(
          "w-48 min-h-16 rounded-lg border bg-card shadow-sm overflow-hidden",
          selected && "border-primary",
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 bg-indigo-500/10 border-b">
          <Cog className="h-4 w-4 text-indigo-500" />
          <span className="text-sm font-medium truncate">
            {data.label || config?.name || "Auto Process"}
          </span>
        </div>
        {/* Body */}
        <div className="px-3 py-2 space-y-1">
          <p className="text-xs text-muted-foreground">Automatic</p>
          <p className="text-xs text-muted-foreground">No user interaction</p>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="source"
        className="!bg-indigo-500 !w-3 !h-3 !border-2 !border-background"
      />
    </BaseNode>
  );
});
