/**
 * StartNode - Workflow entry point (UML filled black circle).
 */
import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { BaseNode } from "./BaseNode";
import type { WorkflowNode } from "../../types";

export const StartNode = memo(function StartNode({
  selected,
  data,
}: NodeProps<WorkflowNode>) {
  return (
    <BaseNode selected={selected} hasError={data.hasError}>
      <div className="flex flex-col items-center gap-1">
        {/* Filled black circle */}
        <div className="h-10 w-10 rounded-full bg-foreground" />
        {/* Label */}
        <span className="text-xs text-muted-foreground font-medium">
          {data.label || "Start"}
        </span>
      </div>
      {/* Source handle only - entry point */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-foreground !w-3 !h-3 !border-2 !border-background"
      />
    </BaseNode>
  );
});
