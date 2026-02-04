/**
 * Workflow designer component exports.
 */

// Canvas
export { WorkflowCanvas } from "./Canvas/WorkflowCanvas";
export type { WorkflowCanvasProps } from "./Canvas/WorkflowCanvas";

// Nodes
export { nodeTypes } from "./Canvas/nodes";
export {
  StartNode,
  EndNode,
  AnnotationNode,
  ReviewNode,
  AdjudicationNode,
  AutoProcessNode,
  ConditionNode,
  ForkNode,
  JoinNode,
  SubWorkflowNode,
} from "./Canvas/nodes";

// Edges
export { edgeTypes, TransitionEdge } from "./Canvas/edges/TransitionEdge";

// Sidebar
export { NodePalette } from "./Sidebar";
export type { NodePaletteProps } from "./Sidebar";

// Config Panel
export { StepConfigPanel, PanelHeader, StepConfigContent } from "./ConfigPanel";
export type { StepConfigPanelProps } from "./ConfigPanel";

// Hooks
export { useCanvasActions } from "./hooks/useCanvasActions";
export { useStepConfig } from "./hooks/useStepConfig";

// Stores
export { useCanvasStore } from "./stores/canvasStore";
export { useConfigStore } from "./stores/configStore";

// Types
export type {
  StepType,
  VisualNodeType,
  NodeType,
  WorkflowType,
  Visibility,
  AgreementMetric,
  StepSettings,
  StepConfig,
  TransitionConditionType,
  TransitionCondition,
  TransitionConfig,
  WorkflowSettings,
  WorkflowConfig,
  WorkflowNodeData,
  WorkflowNode,
  WorkflowEdgeData,
  WorkflowEdge,
  CanvasSnapshot,
  ConfigSnapshot,
  WorkflowMeta,
} from "./types";
