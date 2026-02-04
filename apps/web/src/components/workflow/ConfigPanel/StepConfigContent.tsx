/**
 * StepConfigContent - Routes to appropriate config form based on step type.
 * Placeholder forms - actual implementation in Plan 06.
 */
import { memo } from "react";
import {
  Pencil,
  Eye,
  Scale,
  Cog,
  GitBranch,
  GitFork,
  GitMerge,
  Layers,
  Play,
  Square,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { NodeType, StepConfig } from "../types";

// =============================================================================
// Placeholder Components
// =============================================================================

interface ConfigPlaceholderProps {
  stepType: NodeType;
  config: StepConfig | undefined;
}

const ConfigPlaceholder = memo(function ConfigPlaceholder({
  stepType,
  config,
}: ConfigPlaceholderProps) {
  const iconMap: Record<NodeType, typeof Pencil> = {
    start: Play,
    end: Square,
    annotation: Pencil,
    review: Eye,
    adjudication: Scale,
    auto_process: Cog,
    conditional: GitBranch,
    fork: GitFork,
    join: GitMerge,
    sub_workflow: Layers,
  };

  const Icon = iconMap[stepType] || Cog;

  const configSections: Record<NodeType, string[]> = {
    start: ["Entry point configuration"],
    end: ["Terminal state configuration", "Outcome label"],
    annotation: [
      "Layout assignment",
      "Assignment rules",
      "Required skills",
      "Timeout settings",
    ],
    review: [
      "Layout assignment",
      "Show previous annotations",
      "Assignment rules",
      "Timeout settings",
    ],
    adjudication: [
      "Layout assignment",
      "Agreement threshold",
      "Consensus metric",
      "Resolution strategy",
    ],
    auto_process: ["Processor type", "Configuration", "Error handling"],
    conditional: ["Condition expression", "Branch labels"],
    fork: ["Parallel branches", "Branch names"],
    join: ["Join mode (All / N of M / First)", "Timeout settings"],
    sub_workflow: ["Workflow selection", "Input mapping", "Output mapping"],
  };

  const sections = configSections[stepType] || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
        <Icon className="h-8 w-8 text-muted-foreground" />
        <div>
          <h3 className="font-medium capitalize">
            {stepType.replace("_", " ")} Configuration
          </h3>
          <p className="text-sm text-muted-foreground">
            Configure this step's behavior and settings
          </p>
        </div>
      </div>

      {/* Placeholder sections */}
      <div className="space-y-4">
        {sections.map((section, index) => (
          <div
            key={index}
            className={cn(
              "p-4 rounded-lg border border-dashed",
              "bg-muted/20 text-muted-foreground",
            )}
          >
            <p className="text-sm font-medium">{section}</p>
            <p className="text-xs mt-1">Configuration form coming in Plan 06</p>
          </div>
        ))}
      </div>

      {/* Current config display (debug) */}
      {config && (
        <div className="p-4 rounded-lg bg-muted/30">
          <h4 className="text-sm font-medium mb-2">Current Configuration</h4>
          <pre className="text-xs text-muted-foreground overflow-auto">
            {JSON.stringify(config, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
});

// =============================================================================
// Router Component
// =============================================================================

export interface StepConfigContentProps {
  stepType: NodeType;
  config: StepConfig | undefined;
  onConfigChange: (updates: Partial<StepConfig>) => void;
}

export const StepConfigContent = memo(function StepConfigContent({
  stepType,
  config,
  onConfigChange: _onConfigChange,
}: StepConfigContentProps) {
  // For now, render placeholder for all types
  // Plan 06 will implement actual forms using _onConfigChange
  void _onConfigChange; // Will be used in Plan 06
  return <ConfigPlaceholder stepType={stepType} config={config} />;
});
