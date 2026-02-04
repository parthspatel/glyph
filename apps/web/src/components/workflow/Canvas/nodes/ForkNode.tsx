/**
 * ForkNode - Parallel split (horizontal bar).
 */
import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { GitFork } from "lucide-react";
import { BaseNode } from "./BaseNode";
import type { WorkflowNode } from "../../types";

export const ForkNode = memo(function ForkNode({
  selected,
  data,
}: NodeProps<WorkflowNode>) {
  return (
    <BaseNode selected={selected} hasError={data.hasError}>
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-teal-500 !w-3 !h-3 !border-2 !border-background"
      />
      <div className="flex flex-col items-center gap-1">
        {/* Fork icon */}
        <GitFork className="h-4 w-4 text-teal-500 mb-1" />
        {/* Horizontal bar (split symbol) */}
        <div className="w-24 h-2 bg-teal-500 rounded-full" />
        {/* Label */}
        <span className="text-xs text-muted-foreground font-medium">
          {data.label || "Fork"}
        </span>
      </div>
      {/* Multiple output handles */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="branch-1"
        className="!bg-teal-500 !w-3 !h-3 !border-2 !border-background !left-1/4"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="branch-2"
        className="!bg-teal-500 !w-3 !h-3 !border-2 !border-background !left-1/2"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="branch-3"
        className="!bg-teal-500 !w-3 !h-3 !border-2 !border-background !left-3/4"
      />
    </BaseNode>
  );
});
