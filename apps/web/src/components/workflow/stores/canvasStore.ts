/**
 * Zustand store for workflow canvas state.
 * Manages nodes, edges, viewport, and selection with undo/redo.
 */
import { create } from "zustand";
import { persist, type StorageValue } from "zustand/middleware";
import type {
  NodeChange,
  EdgeChange,
  Viewport,
  OnNodesChange,
  OnEdgesChange,
} from "@xyflow/react";
import { applyNodeChanges, applyEdgeChanges } from "@xyflow/react";
import type { WorkflowNode, WorkflowEdge, CanvasSnapshot } from "../types";

// =============================================================================
// Constants
// =============================================================================

const MAX_HISTORY_SIZE = 50;
const STORAGE_KEY = "glyph-canvas-state";

// =============================================================================
// State Interface
// =============================================================================

interface CanvasState {
  // Core state
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  viewport: Viewport;

  // Selection
  selectedNodeId: string | null;
  selectedEdgeIds: string[];

  // History for undo/redo
  past: CanvasSnapshot[];
  future: CanvasSnapshot[];

  // Actions
  setNodes: (nodes: WorkflowNode[]) => void;
  setEdges: (edges: WorkflowEdge[]) => void;
  onNodesChange: OnNodesChange<WorkflowNode>;
  onEdgesChange: OnEdgesChange<WorkflowEdge>;
  setViewport: (viewport: Viewport) => void;
  selectNode: (nodeId: string | null) => void;
  selectEdges: (edgeIds: string[]) => void;
  addNode: (node: WorkflowNode) => void;
  addEdge: (edge: WorkflowEdge) => void;
  removeNode: (nodeId: string) => void;
  removeEdge: (edgeId: string) => void;
  updateNodeData: (nodeId: string, data: Partial<WorkflowNode["data"]>) => void;
  updateEdgeData: (edgeId: string, data: Partial<WorkflowEdge["data"]>) => void;

  // History actions
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Bulk operations
  clear: () => void;
  loadSnapshot: (snapshot: CanvasSnapshot) => void;
  getSnapshot: () => CanvasSnapshot;
}

// =============================================================================
// Persistence types
// =============================================================================

interface PersistedState {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  viewport: Viewport;
}

// =============================================================================
// Store
// =============================================================================

export const useCanvasStore = create<CanvasState>()(
  persist(
    (set, get) => ({
      // Initial state
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      selectedNodeId: null,
      selectedEdgeIds: [],
      past: [],
      future: [],

      setNodes: (nodes) => set({ nodes }),

      setEdges: (edges) => set({ edges }),

      onNodesChange: (changes: NodeChange<WorkflowNode>[]) => {
        set((state) => ({
          nodes: applyNodeChanges(changes, state.nodes),
        }));
      },

      onEdgesChange: (changes: EdgeChange<WorkflowEdge>[]) => {
        set((state) => ({
          edges: applyEdgeChanges(changes, state.edges),
        }));
      },

      setViewport: (viewport) => set({ viewport }),

      selectNode: (nodeId) => set({ selectedNodeId: nodeId }),

      selectEdges: (edgeIds) => set({ selectedEdgeIds: edgeIds }),

      addNode: (node) => {
        const { nodes, edges, viewport, past } = get();
        const snapshot: CanvasSnapshot = {
          nodes: JSON.parse(JSON.stringify(nodes)),
          edges: JSON.parse(JSON.stringify(edges)),
          viewport: { ...viewport },
        };
        const newPast = [...past, snapshot].slice(-MAX_HISTORY_SIZE);
        set({
          nodes: [...nodes, node],
          past: newPast,
          future: [],
        });
      },

      addEdge: (edge) => {
        const { nodes, edges, viewport, past } = get();
        const snapshot: CanvasSnapshot = {
          nodes: JSON.parse(JSON.stringify(nodes)),
          edges: JSON.parse(JSON.stringify(edges)),
          viewport: { ...viewport },
        };
        const newPast = [...past, snapshot].slice(-MAX_HISTORY_SIZE);
        set({
          edges: [...edges, edge],
          past: newPast,
          future: [],
        });
      },

      removeNode: (nodeId) => {
        const { nodes, edges, viewport, past, selectedNodeId } = get();
        const snapshot: CanvasSnapshot = {
          nodes: JSON.parse(JSON.stringify(nodes)),
          edges: JSON.parse(JSON.stringify(edges)),
          viewport: { ...viewport },
        };
        const newPast = [...past, snapshot].slice(-MAX_HISTORY_SIZE);
        set({
          nodes: nodes.filter((n) => n.id !== nodeId),
          edges: edges.filter(
            (e) => e.source !== nodeId && e.target !== nodeId,
          ),
          selectedNodeId: selectedNodeId === nodeId ? null : selectedNodeId,
          past: newPast,
          future: [],
        });
      },

      removeEdge: (edgeId) => {
        const { nodes, edges, viewport, past, selectedEdgeIds } = get();
        const snapshot: CanvasSnapshot = {
          nodes: JSON.parse(JSON.stringify(nodes)),
          edges: JSON.parse(JSON.stringify(edges)),
          viewport: { ...viewport },
        };
        const newPast = [...past, snapshot].slice(-MAX_HISTORY_SIZE);
        set({
          edges: edges.filter((e) => e.id !== edgeId),
          selectedEdgeIds: selectedEdgeIds.filter((id) => id !== edgeId),
          past: newPast,
          future: [],
        });
      },

      updateNodeData: (nodeId, data) => {
        set((state) => ({
          nodes: state.nodes.map((n) =>
            n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n,
          ),
        }));
      },

      updateEdgeData: (edgeId, data) => {
        set((state) => ({
          edges: state.edges.map((e) =>
            e.id === edgeId ? { ...e, data: { ...e.data, ...data } } : e,
          ),
        }));
      },

      undo: () => {
        const { past, nodes, edges, viewport, future } = get();
        if (past.length === 0) return;

        const previous = past[past.length - 1];
        const currentSnapshot: CanvasSnapshot = {
          nodes: JSON.parse(JSON.stringify(nodes)),
          edges: JSON.parse(JSON.stringify(edges)),
          viewport: { ...viewport },
        };

        set({
          nodes: previous.nodes,
          edges: previous.edges,
          viewport: previous.viewport,
          past: past.slice(0, -1),
          future: [...future, currentSnapshot],
        });
      },

      redo: () => {
        const { past, nodes, edges, viewport, future } = get();
        if (future.length === 0) return;

        const next = future[future.length - 1];
        const currentSnapshot: CanvasSnapshot = {
          nodes: JSON.parse(JSON.stringify(nodes)),
          edges: JSON.parse(JSON.stringify(edges)),
          viewport: { ...viewport },
        };

        set({
          nodes: next.nodes,
          edges: next.edges,
          viewport: next.viewport,
          past: [...past, currentSnapshot],
          future: future.slice(0, -1),
        });
      },

      canUndo: () => get().past.length > 0,

      canRedo: () => get().future.length > 0,

      clear: () =>
        set({
          nodes: [],
          edges: [],
          selectedNodeId: null,
          selectedEdgeIds: [],
          past: [],
          future: [],
        }),

      loadSnapshot: (snapshot) =>
        set({
          nodes: snapshot.nodes,
          edges: snapshot.edges,
          viewport: snapshot.viewport,
          past: [],
          future: [],
        }),

      getSnapshot: () => {
        const { nodes, edges, viewport } = get();
        return {
          nodes: JSON.parse(JSON.stringify(nodes)),
          edges: JSON.parse(JSON.stringify(edges)),
          viewport: { ...viewport },
        };
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state): PersistedState => ({
        nodes: state.nodes,
        edges: state.edges,
        viewport: state.viewport,
      }),
      storage: {
        getItem: (name): StorageValue<PersistedState> | null => {
          const str = sessionStorage.getItem(name);
          return str ? JSON.parse(str) : null;
        },
        setItem: (name, value) => {
          sessionStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => {
          sessionStorage.removeItem(name);
        },
      },
    },
  ),
);
