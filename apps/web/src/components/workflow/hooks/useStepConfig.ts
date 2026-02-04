/**
 * useStepConfig - Hook for managing step configuration state.
 */
import { useCallback, useMemo } from "react";
import { useConfigStore } from "../stores/configStore";
import { useCanvasStore } from "../stores/canvasStore";
import type { StepConfig } from "../types";

export interface UseStepConfigResult {
  /** Current step configuration */
  config: StepConfig | undefined;
  /** Update the step configuration */
  updateConfig: (updates: Partial<StepConfig>) => void;
  /** Update step settings */
  updateSettings: (settings: Partial<StepConfig["settings"]>) => void;
  /** Validation errors for this step */
  errors: string[];
  /** Whether the step has errors */
  hasErrors: boolean;
  /** Whether the config has unsaved changes */
  isDirty: boolean;
}

export function useStepConfig(nodeId: string | null): UseStepConfigResult {
  const getStepConfig = useConfigStore((s) => s.getStepConfig);
  const updateStepConfig = useConfigStore((s) => s.updateStepConfig);
  const isDirty = useConfigStore((s) => s.isDirty);
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);

  // Get current config
  const config = useMemo(() => {
    if (!nodeId) return undefined;
    return getStepConfig(nodeId);
  }, [nodeId, getStepConfig]);

  // Get errors from node data
  const nodes = useCanvasStore((s) => s.nodes);
  const errors = useMemo(() => {
    if (!nodeId) return [];
    const node = nodes.find((n) => n.id === nodeId);
    return node?.data.errors ?? [];
  }, [nodeId, nodes]);

  // Update config
  const handleUpdateConfig = useCallback(
    (updates: Partial<StepConfig>) => {
      if (!nodeId) return;
      updateStepConfig(nodeId, updates);

      // Also update node label if name changed
      if (updates.name) {
        updateNodeData(nodeId, { label: updates.name });
      }
    },
    [nodeId, updateStepConfig, updateNodeData]
  );

  // Update settings helper
  const handleUpdateSettings = useCallback(
    (settings: Partial<StepConfig["settings"]>) => {
      if (!nodeId || !config) return;
      updateStepConfig(nodeId, {
        settings: { ...config.settings, ...settings },
      });
    },
    [nodeId, config, updateStepConfig]
  );

  return {
    config,
    updateConfig: handleUpdateConfig,
    updateSettings: handleUpdateSettings,
    errors,
    hasErrors: errors.length > 0,
    isDirty: isDirty(),
  };
}
