/**
 * StepConfigPanel - Slide-out panel for step configuration.
 * Opens when a node is selected, slides from right at 3/4 width.
 */
import { memo, useCallback, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCanvasStore } from "../stores/canvasStore";
import { useCanvasActions } from "../hooks/useCanvasActions";
import { useStepConfig } from "../hooks/useStepConfig";
import { PanelHeader } from "./PanelHeader";
import { StepConfigContent } from "./StepConfigContent";

// =============================================================================
// Component
// =============================================================================

export interface StepConfigPanelProps {
  /** Callback when panel closes */
  onClose?: () => void;
}

export const StepConfigPanel = memo(function StepConfigPanel({
  onClose,
}: StepConfigPanelProps) {
  const selectedNodeId = useCanvasStore((s) => s.selectedNodeId);
  const nodes = useCanvasStore((s) => s.nodes);
  const selectNode = useCanvasStore((s) => s.selectNode);
  const { deleteSelected } = useCanvasActions();

  // Get selected node
  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return nodes.find((n) => n.id === selectedNodeId) ?? null;
  }, [selectedNodeId, nodes]);

  // Get step config
  const { config, updateConfig } = useStepConfig(selectedNodeId);

  // Handle close
  const handleClose = useCallback(() => {
    selectNode(null);
    onClose?.();
  }, [selectNode, onClose]);

  // Handle open change from Sheet
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        handleClose();
      }
    },
    [handleClose],
  );

  // Handle name change
  const handleNameChange = useCallback(
    (name: string) => {
      updateConfig({ name });
    },
    [updateConfig],
  );

  // Handle delete
  const handleDelete = useCallback(() => {
    deleteSelected();
    handleClose();
  }, [deleteSelected, handleClose]);

  // Don't render if no node selected
  if (!selectedNode) {
    return null;
  }

  return (
    <Sheet open={!!selectedNode} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="w-[75vw] sm:max-w-[75vw] p-0 flex flex-col"
      >
        {/* Visually hidden accessibility elements for screen readers */}
        <SheetTitle className="sr-only">
          Configure Step: {selectedNode.data.label}
        </SheetTitle>
        <SheetDescription className="sr-only">
          Configure settings for the{" "}
          {selectedNode.data.nodeType.replace("_", " ")} step
        </SheetDescription>

        {/* Header */}
        <PanelHeader
          node={selectedNode}
          onNameChange={handleNameChange}
          onDelete={handleDelete}
          onClose={handleClose}
        />

        {/* Scrollable content */}
        <ScrollArea className="flex-1">
          <div className="p-6">
            <StepConfigContent
              stepType={selectedNode.data.nodeType}
              config={config}
              onConfigChange={updateConfig}
            />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
});
