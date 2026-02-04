/**
 * SubWorkflowNode - Embedded sub-workflow (dashed border).
 */
import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Layers } from "lucide-react";
import { BaseNode } from "./BaseNode";
import { cn } from "@/lib/utils";
import type { WorkflowNode } from "../../types";

export const SubWorkflowNode = memo(function SubWorkflowNode({
  selected,
  data,
}: NodeProps<WorkflowNode>) {
  const config = data.stepConfig;
  const subWorkflowId = config?.settings?.sub_workflow_id;

  return (
    <BaseNode selected={selected} hasError={data.hasError}>
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-slate-500 !w-3 !h-3 !border-2 !border-background"
      />
      <div
        className={cn(
          "w-48 min-h-16 rounded-lg border-2 border-dashed bg-card shadow-sm overflow-hidden",
          selected ? "border-primary" : "border-slate-400"
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-500/10 border-b border-dashed">
          <Layers className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-medium truncate">
            {data.label || config?.name || "Sub-Workflow"}
          </span>
        </div>
        {/* Body */}
        <div className="px-3 py-2 space-y-1">
          <p className="text-xs text-muted-foreground">
            {subWorkflowId || "No workflow selected"}
          </p>
          <p className="text-xs text-muted-foreground/60 italic">
            Double-click to expand
          </p>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-slate-500 !w-3 !h-3 !border-2 !border-background"
      />
    </BaseNode>
  );
});
