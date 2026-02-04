/**
 * useCanvasActions - Hook for canvas manipulation actions.
 * Provides node creation, deletion, duplication, copy/paste, and auto-layout.
 */
import { useCallback, useRef } from "react";
import { useReactFlow, type XYPosition } from "@xyflow/react";
import dagre from "dagre";
import { useCanvasStore } from "../stores/canvasStore";
import { useConfigStore } from "../stores/configStore";
import type { WorkflowNode, WorkflowEdge, NodeType, StepType } from "../types";

// =============================================================================
// ID Generation
// =============================================================================

let nodeIdCounter = 0;

function generateNodeId(type: NodeType): string {
  nodeIdCounter++;
  return `${type}_${Date.now()}_${nodeIdCounter}`;
}

function generateEdgeId(source: string, target: string): string {
  return `edge_${source}_${target}_${Date.now()}`;
}

// =============================================================================
// Default Node Data
// =============================================================================

function getDefaultNodeData(type: NodeType): WorkflowNode["data"] {
  const labelMap: Record<NodeType, string> = {
    start: "Start",
    end: "End",
    annotation: "Annotation",
    review: "Review",
    adjudication: "Adjudication",
    auto_process: "Auto Process",
    conditional: "Condition",
    fork: "Fork",
    join: "Join",
    sub_workflow: "Sub-Workflow",
  };

  const isStepType = [
    "annotation",
    "review",
    "adjudication",
    "auto_process",
    "conditional",
    "sub_workflow",
  ].includes(type);

  const stepConfig = isStepType
    ? {
        id: "",
        name: labelMap[type] || type,
        step_type: type as StepType,
        settings: {},
      }
    : undefined;

  return {
    label: labelMap[type] || type,
    nodeType: type,
    stepType: type,
    hasError: false,
    errors: [],
    stepConfig,
    settings: stepConfig?.settings,
  };
}

// =============================================================================
// Hook
// =============================================================================

export function useCanvasActions() {
  const reactFlow = useReactFlow();
  const clipboardRef = useRef<{ nodes: WorkflowNode[]; edges: WorkflowEdge[] }>(
    {
      nodes: [],
      edges: [],
    },
  );

  // Store actions
  const addNode = useCanvasStore((s) => s.addNode);
  const addEdge = useCanvasStore((s) => s.addEdge);
  const removeNode = useCanvasStore((s) => s.removeNode);
  const removeEdge = useCanvasStore((s) => s.removeEdge);
  const setNodes = useCanvasStore((s) => s.setNodes);
  const setEdges = useCanvasStore((s) => s.setEdges);
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);

  const setStepConfig = useConfigStore((s) => s.setStepConfig);
  const removeStepConfig = useConfigStore((s) => s.removeStepConfig);

  // Create a new node at position
  const createNode = useCallback(
    (type: NodeType, position: XYPosition): WorkflowNode => {
      const id = generateNodeId(type);
      const data = getDefaultNodeData(type);

      const newNode: WorkflowNode = {
        id,
        type,
        position,
        data,
      };

      addNode(newNode);

      // Create step config if applicable
      if (data.stepConfig) {
        setStepConfig(id, { ...data.stepConfig, id });
      }

      return newNode;
    },
    [addNode, setStepConfig],
  );

  // Delete selected nodes
  const deleteSelected = useCallback(() => {
    // Get selected nodes from React Flow
    const selectedNodes = nodes.filter((n) => n.selected);
    const selectedEdges = edges.filter((e) => e.selected);

    // Delete nodes and their configs
    selectedNodes.forEach((node) => {
      removeNode(node.id);
      removeStepConfig(node.id);
    });

    // Delete selected edges
    selectedEdges.forEach((edge) => {
      removeEdge(edge.id);
    });
  }, [nodes, edges, removeNode, removeEdge, removeStepConfig]);

  // Copy selected nodes to clipboard
  const copySelected = useCallback(() => {
    const selectedNodes = nodes.filter((n) => n.selected);
    const selectedNodeIds = new Set(selectedNodes.map((n) => n.id));

    // Include edges that connect selected nodes
    const connectedEdges = edges.filter(
      (e) => selectedNodeIds.has(e.source) && selectedNodeIds.has(e.target),
    );

    clipboardRef.current = {
      nodes: JSON.parse(JSON.stringify(selectedNodes)),
      edges: JSON.parse(JSON.stringify(connectedEdges)),
    };
  }, [nodes, edges]);

  // Paste nodes from clipboard
  const pasteNodes = useCallback(() => {
    const { nodes: clipboardNodes, edges: clipboardEdges } =
      clipboardRef.current;
    if (clipboardNodes.length === 0) return;

    // Create ID mapping for new nodes
    const idMap = new Map<string, string>();
    const offset = { x: 50, y: 50 };

    // Create new nodes with new IDs
    const newNodes = clipboardNodes.map((node) => {
      const newId = generateNodeId(node.data.nodeType);
      idMap.set(node.id, newId);

      const newNode: WorkflowNode = {
        ...node,
        id: newId,
        position: {
          x: node.position.x + offset.x,
          y: node.position.y + offset.y,
        },
        selected: true,
      };

      addNode(newNode);

      // Create step config
      if (node.data.stepConfig) {
        setStepConfig(newId, { ...node.data.stepConfig, id: newId });
      }

      return newNode;
    });

    // Create new edges with updated source/target
    clipboardEdges.forEach((edge) => {
      const newSource = idMap.get(edge.source);
      const newTarget = idMap.get(edge.target);

      if (newSource && newTarget) {
        const newEdge: WorkflowEdge = {
          ...edge,
          id: generateEdgeId(newSource, newTarget),
          source: newSource,
          target: newTarget,
        };
        addEdge(newEdge);
      }
    });

    // Deselect old nodes
    setNodes(nodes.map((n) => ({ ...n, selected: false })));

    return newNodes;
  }, [nodes, addNode, addEdge, setNodes, setStepConfig]);

  // Duplicate selected nodes (copy + paste)
  const duplicateSelected = useCallback(() => {
    copySelected();
    return pasteNodes();
  }, [copySelected, pasteNodes]);

  // Select all nodes
  const selectAll = useCallback(() => {
    setNodes(nodes.map((n) => ({ ...n, selected: true })));
    setEdges(edges.map((e) => ({ ...e, selected: true })));
  }, [nodes, edges, setNodes, setEdges]);

  // Auto-arrange nodes using dagre layout
  const autoArrange = useCallback(() => {
    if (nodes.length === 0) return;

    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: "TB", nodesep: 80, ranksep: 100 });
    g.setDefaultEdgeLabel(() => ({}));

    // Add nodes to graph
    nodes.forEach((node) => {
      // Estimate node dimensions
      const width = node.type === "start" || node.type === "end" ? 60 : 200;
      const height = node.type === "start" || node.type === "end" ? 60 : 80;
      g.setNode(node.id, { width, height });
    });

    // Add edges to graph
    edges.forEach((edge) => {
      g.setEdge(edge.source, edge.target);
    });

    // Run layout
    dagre.layout(g);

    // Apply positions
    const newNodes = nodes.map((node) => {
      const nodeWithPosition = g.node(node.id);
      const width = node.type === "start" || node.type === "end" ? 60 : 200;
      const height = node.type === "start" || node.type === "end" ? 60 : 80;

      return {
        ...node,
        position: {
          x: nodeWithPosition.x - width / 2,
          y: nodeWithPosition.y - height / 2,
        },
      };
    });

    setNodes(newNodes);

    // Fit view after layout
    setTimeout(() => {
      reactFlow.fitView({ padding: 0.2 });
    }, 50);
  }, [nodes, edges, setNodes, reactFlow]);

  // Connection validation
  const isValidConnection = useCallback(
    (connection: { source: string; target: string }) => {
      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);

      if (!sourceNode || !targetNode) return false;

      // Prevent self-connections
      if (connection.source === connection.target) return false;

      // Prevent duplicate connections
      const existingEdge = edges.find(
        (e) => e.source === connection.source && e.target === connection.target,
      );
      if (existingEdge) return false;

      // End nodes can only be targets
      if (sourceNode.data.nodeType === "end") return false;

      // Start nodes can only be sources
      if (targetNode.data.nodeType === "start") return false;

      return true;
    },
    [nodes, edges],
  );

  return {
    createNode,
    deleteSelected,
    copySelected,
    pasteNodes,
    duplicateSelected,
    selectAll,
    autoArrange,
    isValidConnection,
  };
}
