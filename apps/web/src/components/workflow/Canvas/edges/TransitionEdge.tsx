/**
 * TransitionEdge - Custom edge for workflow transitions.
 */
import { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react";
import type { WorkflowEdge } from "../../types";

export const TransitionEdge = memo(function TransitionEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<WorkflowEdge>) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
  });

  const label = data?.label || data?.condition?.expression;

  // Dynamic colors based on selection state
  const strokeColor = selected ? "#a855f7" : "#64748b";

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={`url(#${selected ? "arrow-selected" : "arrow-default"})`}
        style={{
          strokeWidth: selected ? 3 : 2,
          stroke: strokeColor,
        }}
        className="transition-all duration-200"
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            className="absolute text-xs bg-background border rounded px-1.5 py-0.5 text-muted-foreground pointer-events-all nodrag nopan"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

export const edgeTypes = {
  transition: TransitionEdge,
};
