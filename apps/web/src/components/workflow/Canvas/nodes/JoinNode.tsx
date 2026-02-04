/**
 * JoinNode - Parallel merge (horizontal bar).
 */
import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { GitMerge } from "lucide-react";
import { BaseNode } from "./BaseNode";
import type { WorkflowNode } from "../../types";

export const JoinNode = memo(function JoinNode({
  selected,
  data,
}: NodeProps<WorkflowNode>) {
  // Join mode could be: "all", "n_of_m", "first" (from stepConfig when available)
  const joinMode = "All";

  return (
    <BaseNode selected={selected} hasError={data.hasError}>
      {/* Multiple input handles */}
      <Handle
        type="target"
        position={Position.Top}
        id="branch-1"
        className="!bg-teal-500 !w-3 !h-3 !border-2 !border-background !left-1/4"
      />
      <Handle
        type="target"
        position={Position.Top}
        id="branch-2"
        className="!bg-teal-500 !w-3 !h-3 !border-2 !border-background !left-1/2"
      />
      <Handle
        type="target"
        position={Position.Top}
        id="branch-3"
        className="!bg-teal-500 !w-3 !h-3 !border-2 !border-background !left-3/4"
      />
      <div className="flex flex-col items-center gap-1">
        {/* Horizontal bar (merge symbol) */}
        <div className="w-24 h-2 bg-teal-500 rounded-full" />
        {/* Merge icon */}
        <GitMerge className="h-4 w-4 text-teal-500 mt-1" />
        {/* Label */}
        <span className="text-xs text-muted-foreground font-medium">
          {data.label || "Join"}
        </span>
        {/* Join mode */}
        <span className="text-xs text-muted-foreground/60">{joinMode}</span>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-teal-500 !w-3 !h-3 !border-2 !border-background"
      />
    </BaseNode>
  );
});
