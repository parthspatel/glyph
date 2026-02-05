/**
 * EndNode - Workflow terminal state (UML bullseye).
 */
import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { BaseNode } from "./BaseNode";
import type { WorkflowNode } from "../../types";

export const EndNode = memo(function EndNode({
  selected,
  data,
}: NodeProps<WorkflowNode>) {
  return (
    <BaseNode selected={selected} hasError={data.hasError}>
      {/* Target handle only - terminal state */}
      <Handle
        type="target"
        position={Position.Top}
        id="target"
        className="!bg-foreground !w-3 !h-3 !border-2 !border-background"
      />
      <div className="flex flex-col items-center gap-1">
        {/* Bullseye: outer ring + inner filled circle */}
        <div className="h-10 w-10 rounded-full border-2 border-foreground flex items-center justify-center">
          <div className="h-5 w-5 rounded-full bg-foreground" />
        </div>
        {/* Label */}
        <span className="text-xs text-muted-foreground font-medium">
          {data.label || "End"}
        </span>
      </div>
    </BaseNode>
  );
});
