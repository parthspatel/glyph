/**
 * ConditionNode - Conditional branching (diamond shape).
 */
import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { GitBranch } from "lucide-react";
import { BaseNode } from "./BaseNode";
import type { WorkflowNode } from "../../types";

export const ConditionNode = memo(function ConditionNode({
  selected,
  data,
}: NodeProps<WorkflowNode>) {
  const config = data.stepConfig;
  const condition = config?.settings?.condition || "?";

  return (
    <BaseNode selected={selected} hasError={data.hasError}>
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-pink-500 !w-3 !h-3 !border-2 !border-background"
      />
      <div className="flex flex-col items-center gap-1">
        {/* Diamond shape */}
        <div
          className="h-12 w-12 border-2 border-pink-500 bg-card flex items-center justify-center"
          style={{ transform: "rotate(45deg)" }}
        >
          <GitBranch
            className="h-5 w-5 text-pink-500"
            style={{ transform: "rotate(-45deg)" }}
          />
        </div>
        {/* Label */}
        <span className="text-xs text-muted-foreground font-medium max-w-24 truncate">
          {data.label || config?.name || "Condition"}
        </span>
        {/* Condition preview */}
        <span className="text-xs text-muted-foreground/60 max-w-32 truncate">
          {condition}
        </span>
      </div>
      {/* Multiple output handles for branches */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        className="!bg-green-500 !w-3 !h-3 !border-2 !border-background !left-1/3"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        className="!bg-red-500 !w-3 !h-3 !border-2 !border-background !left-2/3"
      />
    </BaseNode>
  );
});
