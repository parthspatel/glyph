/**
 * Workflow designer type definitions.
 * Mirrors backend workflow-engine config types for TypeScript.
 */
import type { Node, Edge, Viewport } from "@xyflow/react";

// =============================================================================
// Step Types (matches backend StepType enum)
// =============================================================================

export type StepType =
  | "annotation"
  | "review"
  | "adjudication"
  | "auto_process"
  | "conditional"
  | "sub_workflow";

// Visual-only node types (not backend step types)
export type VisualNodeType = "start" | "end" | "fork" | "join";

// All node types including visual-only
export type NodeType = StepType | VisualNodeType;

// =============================================================================
// Workflow Types (matches backend WorkflowType enum)
// =============================================================================

export type WorkflowType = "single" | "multi_adjudication" | "custom";

// =============================================================================
// Step Settings (matches backend StepSettingsConfig)
// =============================================================================

export type Visibility = "blind" | "visible" | "sequential";

export type AgreementMetric =
  | "exact_match"
  | "jaccard"
  | "cohen_kappa"
  | "fleiss_kappa"
  | "custom";

export interface StepSettings {
  /** Timeout in minutes (default 120, max 480) */
  timeout_minutes?: number;
  /** Visibility mode for annotators */
  visibility?: Visibility;
  /** Required roles for assignment */
  required_roles?: string[];
  /** Required skills for assignment */
  required_skills?: string[];
  /** Condition expression for conditional steps */
  condition?: string;
  /** Sub-workflow ID for sub_workflow steps */
  sub_workflow_id?: string;
  /** Minimum number of annotators required */
  min_annotators?: number;
  /** Agreement metric for consensus calculation */
  agreement_metric?: AgreementMetric;
  /** Threshold for consensus (0.0 to 1.0) */
  threshold?: number;
  /** Whether previous annotations are visible */
  show_previous?: boolean;
  /** Layout ID for UI rendering */
  layout_id?: string;
}

// =============================================================================
// Step Configuration (matches backend StepConfig)
// =============================================================================

export interface StepConfig {
  /** Unique step identifier within the workflow */
  id: string;
  /** Human-readable step name */
  name: string;
  /** Type of step */
  step_type: StepType;
  /** Step-specific settings */
  settings: StepSettings;
  /** Reference to a step library template */
  ref_name?: string;
  /** Overrides for step library template */
  overrides?: Record<string, unknown>;
}

// =============================================================================
// Transition Configuration (matches backend TransitionConfig)
// =============================================================================

export type TransitionConditionType =
  | "always"
  | "on_complete"
  | "on_agreement"
  | "on_disagreement"
  | "expression";

export interface TransitionCondition {
  /** Type of condition */
  type: TransitionConditionType;
  /** Expression for "expression" condition type */
  expression?: string;
  /** Threshold for agreement conditions */
  threshold?: number;
}

export interface TransitionConfig {
  /** Source step ID */
  from: string;
  /** Destination step ID (use "_complete" or "_failed" for terminal) */
  to: string;
  /** Condition for this transition */
  condition?: TransitionCondition;
}

// =============================================================================
// Workflow Settings (matches backend WorkflowSettingsConfig)
// =============================================================================

export interface WorkflowSettings {
  /** Minimum annotators at workflow level */
  min_annotators?: number;
  /** Default consensus threshold */
  consensus_threshold?: number;
}

// =============================================================================
// Workflow Configuration (matches backend WorkflowConfig)
// =============================================================================

export interface WorkflowConfig {
  /** Configuration version (e.g., "1.0") */
  version: string;
  /** Human-readable workflow name */
  name: string;
  /** Type of workflow */
  workflow_type: WorkflowType;
  /** Global workflow settings */
  settings: WorkflowSettings;
  /** Step definitions */
  steps: StepConfig[];
  /** Transitions between steps */
  transitions: TransitionConfig[];
}

// =============================================================================
// React Flow Node/Edge Extensions
// =============================================================================

/** Custom data stored on workflow nodes */
export type WorkflowNodeData = {
  /** Display label for the node */
  label: string;
  /** Node/step type */
  nodeType: NodeType;
  /** Step configuration (undefined for visual-only nodes) */
  stepConfig?: StepConfig;
  /** Whether node has validation errors */
  hasError?: boolean;
  /** Error messages */
  errors?: string[];
  /** Index signature for React Flow compatibility */
  [key: string]: unknown;
};

/** Workflow node extending React Flow Node */
export type WorkflowNode = Node<WorkflowNodeData, NodeType>;

/** Custom data stored on workflow edges */
export type WorkflowEdgeData = {
  /** Transition condition */
  condition?: TransitionCondition;
  /** Display label for the edge */
  label?: string;
  /** Index signature for React Flow compatibility */
  [key: string]: unknown;
};

/** Workflow edge extending React Flow Edge */
export type WorkflowEdge = Edge<WorkflowEdgeData>;

// =============================================================================
// Canvas State Types
// =============================================================================

export interface CanvasSnapshot {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  viewport: Viewport;
}

export interface ConfigSnapshot {
  stepConfigs: Record<string, StepConfig>;
  workflowMeta: WorkflowMeta;
}

export interface WorkflowMeta {
  name: string;
  version: string;
  workflow_type: WorkflowType;
  settings: WorkflowSettings;
}
