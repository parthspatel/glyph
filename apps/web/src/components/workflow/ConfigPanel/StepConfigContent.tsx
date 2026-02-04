/**
 * StepConfigContent - Routes to appropriate config forms based on step type.
 * Uses the forms from Plan 06 for actual configuration.
 */
import { memo, useCallback } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// cn imported for potential future use
// import { cn } from "@/lib/utils";
import type { NodeType, StepConfig, StepSettings } from "../types";
import {
  LayoutAssignment,
  ConsensusConfig,
  AssignmentConfig,
  CompletionCriteria,
  ConditionEditor,
} from "./forms";

// =============================================================================
// Icon Map
// =============================================================================

const ICON_MAP: Record<NodeType, typeof Pencil> = {
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

// =============================================================================
// Visual-Only Node Config (Start, End, Fork, Join)
// =============================================================================

interface VisualNodeConfigProps {
  stepType: NodeType;
}

const VisualNodeConfig = memo(function VisualNodeConfig({
  stepType,
}: VisualNodeConfigProps) {
  const Icon = ICON_MAP[stepType] || Cog;

  const descriptions: Record<string, string> = {
    start: "This is the entry point of the workflow. All tasks begin here.",
    end: "This is the terminal state. Tasks reaching this node are complete.",
    fork: "Splits execution into multiple parallel branches.",
    join: "Waits for parallel branches to complete before continuing.",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
        <Icon className="h-8 w-8 text-muted-foreground" />
        <div>
          <h3 className="font-medium capitalize">
            {stepType.replace("_", " ")} Node
          </h3>
          <p className="text-sm text-muted-foreground">
            {descriptions[stepType] || "Visual control node"}
          </p>
        </div>
      </div>

      <div className="p-4 rounded-lg border border-dashed bg-muted/20">
        <p className="text-sm text-muted-foreground">
          This is a visual-only node with no additional configuration options.
        </p>
      </div>
    </div>
  );
});

// =============================================================================
// Annotation Step Config
// =============================================================================

interface AnnotationConfigProps {
  config: StepConfig | undefined;
  onConfigChange: (updates: Partial<StepConfig>) => void;
}

const AnnotationConfig = memo(function AnnotationConfig({
  config,
  onConfigChange,
}: AnnotationConfigProps) {
  const settings = config?.settings ?? {};

  const handleSettingsChange = useCallback(
    (updates: Partial<StepSettings>) => {
      onConfigChange({
        settings: { ...settings, ...updates },
      });
    },
    [settings, onConfigChange],
  );

  return (
    <Tabs defaultValue="layout" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="layout">Layout</TabsTrigger>
        <TabsTrigger value="assignment">Assignment</TabsTrigger>
        <TabsTrigger value="consensus">Consensus</TabsTrigger>
        <TabsTrigger value="completion">Completion</TabsTrigger>
      </TabsList>

      <TabsContent value="layout" className="mt-6">
        <LayoutAssignment
          value={settings.layout_id}
          onChange={(layoutId) => handleSettingsChange({ layout_id: layoutId })}
        />
      </TabsContent>

      <TabsContent value="assignment" className="mt-6">
        <AssignmentConfig settings={settings} onChange={handleSettingsChange} />
      </TabsContent>

      <TabsContent value="consensus" className="mt-6">
        <ConsensusConfig settings={settings} onChange={handleSettingsChange} />
      </TabsContent>

      <TabsContent value="completion" className="mt-6">
        <CompletionCriteria
          settings={settings}
          onChange={handleSettingsChange}
        />
      </TabsContent>
    </Tabs>
  );
});

// =============================================================================
// Review Step Config
// =============================================================================

const ReviewConfig = memo(function ReviewConfig({
  config,
  onConfigChange,
}: AnnotationConfigProps) {
  const settings = config?.settings ?? {};

  const handleSettingsChange = useCallback(
    (updates: Partial<StepSettings>) => {
      onConfigChange({
        settings: { ...settings, ...updates },
      });
    },
    [settings, onConfigChange],
  );

  return (
    <Tabs defaultValue="layout" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="layout">Layout</TabsTrigger>
        <TabsTrigger value="assignment">Assignment</TabsTrigger>
        <TabsTrigger value="completion">Completion</TabsTrigger>
      </TabsList>

      <TabsContent value="layout" className="mt-6">
        <LayoutAssignment
          value={settings.layout_id}
          onChange={(layoutId) => handleSettingsChange({ layout_id: layoutId })}
        />
        {/* Show previous annotations toggle */}
        <div className="mt-6 flex items-center gap-2">
          <input
            id="show-prev"
            type="checkbox"
            checked={settings.show_previous ?? true}
            onChange={(e) =>
              handleSettingsChange({ show_previous: e.target.checked })
            }
            className="h-4 w-4 rounded border-gray-300"
          />
          <label htmlFor="show-prev" className="text-sm">
            Show previous annotations to reviewer
          </label>
        </div>
      </TabsContent>

      <TabsContent value="assignment" className="mt-6">
        <AssignmentConfig settings={settings} onChange={handleSettingsChange} />
      </TabsContent>

      <TabsContent value="completion" className="mt-6">
        <CompletionCriteria
          settings={settings}
          onChange={handleSettingsChange}
        />
      </TabsContent>
    </Tabs>
  );
});

// =============================================================================
// Adjudication Step Config
// =============================================================================

const AdjudicationConfig = memo(function AdjudicationConfig({
  config,
  onConfigChange,
}: AnnotationConfigProps) {
  const settings = config?.settings ?? {};

  const handleSettingsChange = useCallback(
    (updates: Partial<StepSettings>) => {
      onConfigChange({
        settings: { ...settings, ...updates },
      });
    },
    [settings, onConfigChange],
  );

  return (
    <Tabs defaultValue="layout" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="layout">Layout</TabsTrigger>
        <TabsTrigger value="consensus">Consensus</TabsTrigger>
        <TabsTrigger value="assignment">Assignment</TabsTrigger>
      </TabsList>

      <TabsContent value="layout" className="mt-6">
        <LayoutAssignment
          value={settings.layout_id}
          onChange={(layoutId) => handleSettingsChange({ layout_id: layoutId })}
        />
      </TabsContent>

      <TabsContent value="consensus" className="mt-6">
        <ConsensusConfig settings={settings} onChange={handleSettingsChange} />
      </TabsContent>

      <TabsContent value="assignment" className="mt-6">
        <AssignmentConfig settings={settings} onChange={handleSettingsChange} />
      </TabsContent>
    </Tabs>
  );
});

// =============================================================================
// Auto-Process Step Config
// =============================================================================

const AutoProcessConfig = memo(function AutoProcessConfig(
  _props: AnnotationConfigProps,
) {
  const Icon = ICON_MAP.auto_process;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
        <Icon className="h-8 w-8 text-muted-foreground" />
        <div>
          <h3 className="font-medium">Auto-Process Step</h3>
          <p className="text-sm text-muted-foreground">
            Automated processing without human intervention
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Processor Type</label>
          <select className="w-full rounded-md border bg-background px-3 py-2">
            <option value="ml_inference">ML Inference</option>
            <option value="rule_based">Rule-Based Processing</option>
            <option value="webhook">External Webhook</option>
            <option value="script">Custom Script</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Configuration</label>
          <textarea
            className="w-full rounded-md border bg-background px-3 py-2 font-mono text-sm"
            rows={4}
            placeholder='{"model": "text-classifier-v2", "threshold": 0.9}'
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">On Error</label>
          <select className="w-full rounded-md border bg-background px-3 py-2">
            <option value="retry">Retry (up to 3 times)</option>
            <option value="skip">Skip and continue</option>
            <option value="manual">Send to manual review</option>
            <option value="fail">Fail the task</option>
          </select>
        </div>
      </div>
    </div>
  );
});

// =============================================================================
// Condition Step Config
// =============================================================================

const ConditionConfig = memo(function ConditionConfig({
  config,
  onConfigChange,
}: AnnotationConfigProps) {
  const settings = config?.settings ?? {};

  const handleSettingsChange = useCallback(
    (updates: Partial<StepSettings>) => {
      onConfigChange({
        settings: { ...settings, ...updates },
      });
    },
    [settings, onConfigChange],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
        <GitBranch className="h-8 w-8 text-muted-foreground" />
        <div>
          <h3 className="font-medium">Conditional Branch</h3>
          <p className="text-sm text-muted-foreground">
            Routes tasks based on conditions
          </p>
        </div>
      </div>

      <ConditionEditor settings={settings} onChange={handleSettingsChange} />
    </div>
  );
});

// =============================================================================
// Sub-Workflow Step Config
// =============================================================================

const SubWorkflowConfig = memo(function SubWorkflowConfig(
  _props: AnnotationConfigProps,
) {
  const Icon = ICON_MAP.sub_workflow;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
        <Icon className="h-8 w-8 text-muted-foreground" />
        <div>
          <h3 className="font-medium">Sub-Workflow</h3>
          <p className="text-sm text-muted-foreground">
            Embeds another workflow as a step
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Workflow</label>
          <select className="w-full rounded-md border bg-background px-3 py-2">
            <option value="">Choose a workflow...</option>
            <option value="wf_review_loop">Review Loop</option>
            <option value="wf_quality_check">Quality Check</option>
            <option value="wf_escalation">Escalation Flow</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Input Mapping</label>
          <textarea
            className="w-full rounded-md border bg-background px-3 py-2 font-mono text-sm"
            rows={3}
            placeholder="task.data → sub.input"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Output Mapping</label>
          <textarea
            className="w-full rounded-md border bg-background px-3 py-2 font-mono text-sm"
            rows={3}
            placeholder="sub.result → task.annotation"
          />
        </div>
      </div>
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
  onConfigChange,
}: StepConfigContentProps) {
  // Visual-only nodes
  if (["start", "end", "fork", "join"].includes(stepType)) {
    return <VisualNodeConfig stepType={stepType} />;
  }

  // Step-specific configs
  switch (stepType) {
    case "annotation":
      return (
        <AnnotationConfig config={config} onConfigChange={onConfigChange} />
      );
    case "review":
      return <ReviewConfig config={config} onConfigChange={onConfigChange} />;
    case "adjudication":
      return (
        <AdjudicationConfig config={config} onConfigChange={onConfigChange} />
      );
    case "auto_process":
      return (
        <AutoProcessConfig config={config} onConfigChange={onConfigChange} />
      );
    case "conditional":
      return (
        <ConditionConfig config={config} onConfigChange={onConfigChange} />
      );
    case "sub_workflow":
      return (
        <SubWorkflowConfig config={config} onConfigChange={onConfigChange} />
      );
    default:
      return <VisualNodeConfig stepType={stepType} />;
  }
});
