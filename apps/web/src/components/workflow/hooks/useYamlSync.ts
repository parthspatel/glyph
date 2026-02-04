/**
 * useYamlSync - Hook for managing Visual/YAML tab sync.
 * Handles bidirectional conversion between canvas state and YAML.
 */
import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { useCanvasStore } from "../stores/canvasStore";
import { useConfigStore } from "../stores/configStore";
import { canvasToYaml } from "../converters/canvasToYaml";
import { yamlToCanvas } from "../converters/yamlToCanvas";

// =============================================================================
// Types
// =============================================================================

export type EditorTab = "visual" | "yaml";

export interface UseYamlSyncReturn {
  /** Current active tab */
  activeTab: EditorTab;
  /** Set active tab (triggers sync) */
  setActiveTab: (tab: EditorTab) => void;
  /** Current YAML content */
  yamlContent: string;
  /** Update YAML content (without syncing to canvas) */
  setYamlContent: (yaml: string) => void;
  /** Sync YAML to canvas (called on tab switch) */
  syncYamlToCanvas: () => boolean;
  /** Sync canvas to YAML (called on tab switch) */
  syncCanvasToYaml: () => void;
  /** Current validation errors */
  validationErrors: string[];
  /** Whether YAML has unsaved changes */
  yamlDirty: boolean;
}

// =============================================================================
// Hook
// =============================================================================

export function useYamlSync(): UseYamlSyncReturn {
  const [activeTab, setActiveTabState] = useState<EditorTab>("visual");
  const [yamlContent, setYamlContentState] = useState("");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [yamlDirty, setYamlDirty] = useState(false);
  const lastSyncedYaml = useRef<string>("");

  // Canvas store actions
  const { nodes, edges, loadSnapshot, getSnapshot } = useCanvasStore();

  // Config store actions
  const {
    stepConfigs,
    workflowMeta,
    loadSnapshot: loadConfigSnapshot,
  } = useConfigStore();

  // Sync canvas state to YAML
  const syncCanvasToYaml = useCallback(() => {
    const yaml = canvasToYaml({
      nodes,
      edges,
      stepConfigs,
      workflowMeta,
    });
    setYamlContentState(yaml);
    lastSyncedYaml.current = yaml;
    setYamlDirty(false);
    setValidationErrors([]);
  }, [nodes, edges, stepConfigs, workflowMeta]);

  // Sync YAML to canvas state
  const syncYamlToCanvas = useCallback((): boolean => {
    const result = yamlToCanvas(yamlContent);

    if (result.errors.length > 0) {
      setValidationErrors(result.errors);
      toast.error("Cannot switch to Visual view", {
        description: `Fix ${result.errors.length} error(s) in YAML first`,
      });
      return false;
    }

    // Load into canvas store
    loadSnapshot({
      nodes: result.nodes,
      edges: result.edges,
      viewport: getSnapshot().viewport,
    });

    // Load into config store
    loadConfigSnapshot({
      stepConfigs: result.stepConfigs,
      workflowMeta: result.workflowMeta,
    });

    lastSyncedYaml.current = yamlContent;
    setYamlDirty(false);
    setValidationErrors([]);
    return true;
  }, [yamlContent, loadSnapshot, loadConfigSnapshot, getSnapshot]);

  // Set YAML content (tracks dirty state)
  const setYamlContent = useCallback((yaml: string) => {
    setYamlContentState(yaml);
    setYamlDirty(yaml !== lastSyncedYaml.current);
  }, []);

  // Handle tab switch with sync
  const setActiveTab = useCallback(
    (tab: EditorTab) => {
      if (tab === activeTab) return;

      if (tab === "yaml") {
        // Switching to YAML: sync canvas → YAML
        syncCanvasToYaml();
        setActiveTabState("yaml");
      } else {
        // Switching to Visual: sync YAML → canvas
        if (yamlDirty) {
          const success = syncYamlToCanvas();
          if (!success) {
            // Stay on YAML tab if sync failed
            return;
          }
        }
        setActiveTabState("visual");
      }
    },
    [activeTab, yamlDirty, syncCanvasToYaml, syncYamlToCanvas],
  );

  return {
    activeTab,
    setActiveTab,
    yamlContent,
    setYamlContent,
    syncYamlToCanvas,
    syncCanvasToYaml,
    validationErrors,
    yamlDirty,
  };
}
