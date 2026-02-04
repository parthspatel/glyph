/**
 * Zustand store for workflow configuration state.
 * Manages step configs and workflow metadata with separate undo/redo.
 */
import { create } from "zustand";
import { persist, type StorageValue } from "zustand/middleware";
import type {
  StepConfig,
  WorkflowMeta,
  WorkflowType,
  WorkflowSettings,
  ConfigSnapshot,
} from "../types";

// =============================================================================
// Constants
// =============================================================================

const MAX_HISTORY_SIZE = 50;
const STORAGE_KEY = "glyph-config-state";

// =============================================================================
// State Interface
// =============================================================================

interface ConfigState {
  // Core state
  stepConfigs: Record<string, StepConfig>;
  workflowMeta: WorkflowMeta;
  dirty: boolean;

  // History for undo/redo
  past: ConfigSnapshot[];
  future: ConfigSnapshot[];

  // Step config actions
  setStepConfig: (nodeId: string, config: StepConfig) => void;
  updateStepConfig: (nodeId: string, updates: Partial<StepConfig>) => void;
  removeStepConfig: (nodeId: string) => void;
  getStepConfig: (nodeId: string) => StepConfig | undefined;

  // Workflow meta actions
  setWorkflowMeta: (meta: WorkflowMeta) => void;
  updateWorkflowMeta: (updates: Partial<WorkflowMeta>) => void;
  setWorkflowName: (name: string) => void;
  setWorkflowType: (type: WorkflowType) => void;
  setWorkflowSettings: (settings: WorkflowSettings) => void;

  // Dirty state
  markDirty: () => void;
  markClean: () => void;
  isDirty: () => boolean;

  // History actions
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Bulk operations
  clear: () => void;
  loadSnapshot: (snapshot: ConfigSnapshot) => void;
  getSnapshot: () => ConfigSnapshot;
}

// =============================================================================
// Initial State
// =============================================================================

const defaultWorkflowMeta: WorkflowMeta = {
  name: "Untitled Workflow",
  version: "1.0",
  workflow_type: "single",
  settings: {},
};

// =============================================================================
// Persistence types
// =============================================================================

interface PersistedState {
  stepConfigs: Record<string, StepConfig>;
  workflowMeta: WorkflowMeta;
}

// =============================================================================
// Helper: Create snapshot for history
// =============================================================================

function createSnapshot(
  stepConfigs: Record<string, StepConfig>,
  workflowMeta: WorkflowMeta,
): ConfigSnapshot {
  return {
    stepConfigs: JSON.parse(JSON.stringify(stepConfigs)),
    workflowMeta: JSON.parse(JSON.stringify(workflowMeta)),
  };
}

// =============================================================================
// Store
// =============================================================================

export const useConfigStore = create<ConfigState>()(
  persist(
    (set, get) => ({
      // Initial state
      stepConfigs: {},
      workflowMeta: { ...defaultWorkflowMeta },
      dirty: false,
      past: [],
      future: [],

      setStepConfig: (nodeId, config) => {
        const { stepConfigs, workflowMeta, past } = get();
        const snapshot = createSnapshot(stepConfigs, workflowMeta);
        const newPast = [...past, snapshot].slice(-MAX_HISTORY_SIZE);
        set({
          stepConfigs: { ...stepConfigs, [nodeId]: config },
          dirty: true,
          past: newPast,
          future: [],
        });
      },

      updateStepConfig: (nodeId, updates) => {
        const { stepConfigs, workflowMeta, past } = get();
        const existing = stepConfigs[nodeId];
        if (!existing) return;

        const snapshot = createSnapshot(stepConfigs, workflowMeta);
        const newPast = [...past, snapshot].slice(-MAX_HISTORY_SIZE);
        set({
          stepConfigs: {
            ...stepConfigs,
            [nodeId]: { ...existing, ...updates },
          },
          dirty: true,
          past: newPast,
          future: [],
        });
      },

      removeStepConfig: (nodeId) => {
        const { stepConfigs, workflowMeta, past } = get();
        const snapshot = createSnapshot(stepConfigs, workflowMeta);
        const newPast = [...past, snapshot].slice(-MAX_HISTORY_SIZE);
        const newConfigs = { ...stepConfigs };
        delete newConfigs[nodeId];
        set({
          stepConfigs: newConfigs,
          dirty: true,
          past: newPast,
          future: [],
        });
      },

      getStepConfig: (nodeId) => get().stepConfigs[nodeId],

      setWorkflowMeta: (meta) => {
        const { stepConfigs, workflowMeta, past } = get();
        const snapshot = createSnapshot(stepConfigs, workflowMeta);
        const newPast = [...past, snapshot].slice(-MAX_HISTORY_SIZE);
        set({
          workflowMeta: meta,
          dirty: true,
          past: newPast,
          future: [],
        });
      },

      updateWorkflowMeta: (updates) => {
        const { stepConfigs, workflowMeta, past } = get();
        const snapshot = createSnapshot(stepConfigs, workflowMeta);
        const newPast = [...past, snapshot].slice(-MAX_HISTORY_SIZE);
        set({
          workflowMeta: { ...workflowMeta, ...updates },
          dirty: true,
          past: newPast,
          future: [],
        });
      },

      setWorkflowName: (name) => {
        const { workflowMeta } = get();
        set({
          workflowMeta: { ...workflowMeta, name },
          dirty: true,
        });
      },

      setWorkflowType: (type) => {
        const { stepConfigs, workflowMeta, past } = get();
        const snapshot = createSnapshot(stepConfigs, workflowMeta);
        const newPast = [...past, snapshot].slice(-MAX_HISTORY_SIZE);
        set({
          workflowMeta: { ...workflowMeta, workflow_type: type },
          dirty: true,
          past: newPast,
          future: [],
        });
      },

      setWorkflowSettings: (settings) => {
        const { stepConfigs, workflowMeta, past } = get();
        const snapshot = createSnapshot(stepConfigs, workflowMeta);
        const newPast = [...past, snapshot].slice(-MAX_HISTORY_SIZE);
        set({
          workflowMeta: { ...workflowMeta, settings },
          dirty: true,
          past: newPast,
          future: [],
        });
      },

      markDirty: () => set({ dirty: true }),

      markClean: () => set({ dirty: false }),

      isDirty: () => get().dirty,

      undo: () => {
        const { past, stepConfigs, workflowMeta, future } = get();
        if (past.length === 0) return;

        const previous = past[past.length - 1];
        const currentSnapshot = createSnapshot(stepConfigs, workflowMeta);

        set({
          stepConfigs: previous.stepConfigs,
          workflowMeta: previous.workflowMeta,
          dirty: true,
          past: past.slice(0, -1),
          future: [...future, currentSnapshot],
        });
      },

      redo: () => {
        const { past, stepConfigs, workflowMeta, future } = get();
        if (future.length === 0) return;

        const next = future[future.length - 1];
        const currentSnapshot = createSnapshot(stepConfigs, workflowMeta);

        set({
          stepConfigs: next.stepConfigs,
          workflowMeta: next.workflowMeta,
          dirty: true,
          past: [...past, currentSnapshot],
          future: future.slice(0, -1),
        });
      },

      canUndo: () => get().past.length > 0,

      canRedo: () => get().future.length > 0,

      clear: () =>
        set({
          stepConfigs: {},
          workflowMeta: { ...defaultWorkflowMeta },
          dirty: false,
          past: [],
          future: [],
        }),

      loadSnapshot: (snapshot) =>
        set({
          stepConfigs: snapshot.stepConfigs,
          workflowMeta: snapshot.workflowMeta,
          dirty: false,
          past: [],
          future: [],
        }),

      getSnapshot: () => {
        const { stepConfigs, workflowMeta } = get();
        return createSnapshot(stepConfigs, workflowMeta);
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state): PersistedState => ({
        stepConfigs: state.stepConfigs,
        workflowMeta: state.workflowMeta,
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
