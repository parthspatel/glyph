/**
 * WorkflowCanvas - React Flow wrapper for visual workflow editing.
 * Provides the main canvas with grid, minimap, controls, and keyboard shortcuts.
 */
import { useCallback, memo, type DragEvent } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  useReactFlow,
  type OnConnect,
  type Connection,
  type IsValidConnection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useHotkeys } from "react-hotkeys-hook";
import { useCanvasStore } from "../stores/canvasStore";
import { useCanvasActions } from "../hooks/useCanvasActions";
import { nodeTypes } from "./nodes";
import { edgeTypes } from "./edges/TransitionEdge";
import type { WorkflowNode, WorkflowEdge, NodeType } from "../types";

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
// Inner Component (needs ReactFlowProvider context)
// =============================================================================

interface WorkflowCanvasInnerProps {
  className?: string;
  onConnect?: (connection: Connection) => void;
  onNodeSelect?: (nodeId: string | null) => void;
}

export const WorkflowCanvasInner = memo(function WorkflowCanvasInner({
  className,
  onConnect: onConnectProp,
  onNodeSelect,
}: WorkflowCanvasInnerProps) {
  const reactFlow = useReactFlow();

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

  // Canvas actions
  const {
    createNode,
    deleteSelected,
    copySelected,
    pasteNodes,
    duplicateSelected,
    selectAll,
    isValidConnection,
  } = useCanvasActions();

  // Handle drag over (allow drop)
  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  // Handle drop from palette
  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();

      const type = e.dataTransfer.getData(
        "application/reactflow-type",
      ) as NodeType;
      if (!type) return;

      // Get drop position in flow coordinates
      const position = reactFlow.screenToFlowPosition({
        x: e.clientX,
        y: e.clientY,
      });

      createNode(type, position);
    },
    [reactFlow, createNode],
  );

  // Handle new connections
  const handleConnect: OnConnect = useCallback(
    (connection) => {
      const newEdge: WorkflowEdge = {
        id: `${connection.source}-${connection.target}-${Date.now()}`,
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

  // Connection validation
  const handleIsValidConnection: IsValidConnection = useCallback(
    (connection) => {
      return isValidConnection({
        source: connection.source!,
        target: connection.target!,
      });
    },
    [isValidConnection],
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

  useHotkeys(
    "mod+c",
    (e) => {
      e.preventDefault();
      copySelected();
    },
    { enableOnFormTags: false },
  );

  useHotkeys(
    "mod+v",
    (e) => {
      e.preventDefault();
      pasteNodes();
    },
    { enableOnFormTags: false },
  );

  useHotkeys(
    "mod+d",
    (e) => {
      e.preventDefault();
      duplicateSelected();
    },
    { enableOnFormTags: false },
  );

  useHotkeys(
    "mod+a",
    (e) => {
      e.preventDefault();
      selectAll();
    },
    { enableOnFormTags: false },
  );

  useHotkeys(
    "delete, backspace",
    (e) => {
      e.preventDefault();
      deleteSelected();
    },
    { enableOnFormTags: false },
  );

  return (
    <div
      className={className}
      style={{ width: "100%", height: "100%" }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <ReactFlow<WorkflowNode, WorkflowEdge>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        isValidConnection={handleIsValidConnection}
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
        deleteKeyCode={[]}
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

// =============================================================================
// Public Component (wraps with ReactFlowProvider)
// =============================================================================

export interface WorkflowCanvasProps {
  /** Optional class name for the container */
  className?: string;
  /** Callback when a new connection is made */
  onConnect?: (connection: Connection) => void;
  /** Callback when a node is selected */
  onNodeSelect?: (nodeId: string | null) => void;
}

export const WorkflowCanvas = memo(function WorkflowCanvas(
  props: WorkflowCanvasProps,
) {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner {...props} />
    </ReactFlowProvider>
  );
});
