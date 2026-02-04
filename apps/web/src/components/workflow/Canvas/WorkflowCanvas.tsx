/**
 * WorkflowCanvas - React Flow wrapper for visual workflow editing.
 * Provides the main canvas with grid, minimap, controls, and keyboard shortcuts.
 */
import { useCallback, memo } from "react";
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  type OnConnect,
  type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useHotkeys } from "react-hotkeys-hook";
import { useCanvasStore } from "../stores/canvasStore";
import { nodeTypes } from "./nodes";
import { edgeTypes } from "./edges/TransitionEdge";
import type { WorkflowNode, WorkflowEdge } from "../types";

// =============================================================================
// Constants
// =============================================================================

const SNAP_GRID: [number, number] = [15, 15];

// MiniMap node color mapping
const MINIMAP_NODE_COLOR = (node: WorkflowNode): string => {
  switch (node.data.nodeType) {
    case "start":
      return "#22c55e"; // green
    case "end":
      return "#ef4444"; // red
    case "annotation":
      return "#3b82f6"; // blue
    case "review":
      return "#8b5cf6"; // purple
    case "adjudication":
      return "#f59e0b"; // amber
    case "auto_process":
      return "#6366f1"; // indigo
    case "conditional":
      return "#ec4899"; // pink
    case "fork":
    case "join":
      return "#14b8a6"; // teal
    case "sub_workflow":
      return "#64748b"; // slate
    default:
      return "#94a3b8"; // gray
  }
};

// =============================================================================
// Component
// =============================================================================

export interface WorkflowCanvasProps {
  /** Optional class name for the container */
  className?: string;
  /** Callback when a new connection is made */
  onConnect?: (connection: Connection) => void;
  /** Callback when a node is selected */
  onNodeSelect?: (nodeId: string | null) => void;
}

export const WorkflowCanvas = memo(function WorkflowCanvas({
  className,
  onConnect: onConnectProp,
  onNodeSelect,
}: WorkflowCanvasProps) {
  // Store state
  const nodes = useCanvasStore((state) => state.nodes);
  const edges = useCanvasStore((state) => state.edges);
  const onNodesChange = useCanvasStore((state) => state.onNodesChange);
  const onEdgesChange = useCanvasStore((state) => state.onEdgesChange);
  const storeAddEdge = useCanvasStore((state) => state.addEdge);
  const selectNode = useCanvasStore((state) => state.selectNode);
  const setViewport = useCanvasStore((state) => state.setViewport);
  const undo = useCanvasStore((state) => state.undo);
  const redo = useCanvasStore((state) => state.redo);

  // Handle new connections
  const handleConnect: OnConnect = useCallback(
    (connection) => {
      const newEdge: WorkflowEdge = {
        id: `${connection.source}-${connection.target}`,
        source: connection.source!,
        target: connection.target!,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        type: "transition",
        data: { condition: { type: "always" } },
      };
      storeAddEdge(newEdge);
      onConnectProp?.(connection);
    },
    [storeAddEdge, onConnectProp],
  );

  // Handle node selection
  const handleSelectionChange = useCallback(
    ({ nodes: selectedNodes }: { nodes: WorkflowNode[] }) => {
      const selectedId =
        selectedNodes.length === 1 ? selectedNodes[0].id : null;
      selectNode(selectedId);
      onNodeSelect?.(selectedId);
    },
    [selectNode, onNodeSelect],
  );

  // Keyboard shortcuts
  useHotkeys(
    "mod+z",
    (e) => {
      e.preventDefault();
      undo();
    },
    { enableOnFormTags: false },
  );

  useHotkeys(
    "mod+y, mod+shift+z",
    (e) => {
      e.preventDefault();
      redo();
    },
    { enableOnFormTags: false },
  );

  return (
    <div className={className} style={{ width: "100%", height: "100%" }}>
      <ReactFlow<WorkflowNode, WorkflowEdge>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onSelectionChange={handleSelectionChange}
        onViewportChange={setViewport}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        snapToGrid
        snapGrid={SNAP_GRID}
        panOnScroll
        zoomOnScroll
        panOnDrag
        selectionOnDrag
        multiSelectionKeyCode="Shift"
        deleteKeyCode={["Backspace", "Delete"]}
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: "transition",
          animated: false,
        }}
      >
        <Controls position="bottom-left" showZoom showFitView showInteractive />
        <MiniMap
          position="bottom-right"
          nodeColor={MINIMAP_NODE_COLOR}
          maskColor="rgba(0, 0, 0, 0.1)"
          pannable
          zoomable
        />
        <Background variant={BackgroundVariant.Dots} gap={15} size={1} />
      </ReactFlow>
    </div>
  );
});
