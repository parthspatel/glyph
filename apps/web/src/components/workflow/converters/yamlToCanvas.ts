/**
 * YAML to Canvas converter.
 * Parses WorkflowConfig YAML and converts to React Flow nodes/edges.
 */
import * as yaml from "js-yaml";
import dagre from "dagre";
import type {
  WorkflowNode,
  WorkflowEdge,
  WorkflowConfig,
  StepConfig,
  TransitionConfig,
  WorkflowMeta,
  NodeType,
  StepType,
  WorkflowNodeData,
} from "../types";

// =============================================================================
// Types
// =============================================================================

export interface YamlToCanvasResult {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  stepConfigs: Record<string, StepConfig>;
  workflowMeta: WorkflowMeta;
  errors: string[];
}

interface PositionMetadata {
  positions?: Record<string, { x: number; y: number }>;
}

interface WorkflowConfigWithMeta extends WorkflowConfig {
  _metadata?: PositionMetadata;
}

// =============================================================================
// Constants
// =============================================================================

const NODE_WIDTH = 180;
const NODE_HEIGHT = 60;
const START_END_SIZE = 50;

const STEP_TYPE_TO_NODE_TYPE: Record<StepType, NodeType> = {
  annotation: "annotation",
  review: "review",
  adjudication: "adjudication",
  auto_process: "auto_process",
  conditional: "conditional",
  sub_workflow: "sub_workflow",
};

// =============================================================================
// Auto-Layout
// =============================================================================

function autoLayout(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
): WorkflowNode[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 50, ranksep: 80 });

  // Add nodes to dagre
  for (const node of nodes) {
    const isSmall = node.data.nodeType === "start" || node.data.nodeType === "end";
    g.setNode(node.id, {
      width: isSmall ? START_END_SIZE : NODE_WIDTH,
      height: isSmall ? START_END_SIZE : NODE_HEIGHT,
    });
  }

  // Add edges to dagre
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  // Run layout
  dagre.layout(g);

  // Apply positions
  return nodes.map((node) => {
    const nodeWithPos = g.node(node.id);
    const isSmall = node.data.nodeType === "start" || node.data.nodeType === "end";
    const width = isSmall ? START_END_SIZE : NODE_WIDTH;
    const height = isSmall ? START_END_SIZE : NODE_HEIGHT;

    return {
      ...node,
      position: {
        x: nodeWithPos.x - width / 2,
        y: nodeWithPos.y - height / 2,
      },
    };
  });
}

// =============================================================================
// Validation
// =============================================================================

function validateConfig(config: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config || typeof config !== "object") {
    errors.push("Invalid YAML: expected an object");
    return { valid: false, errors };
  }

  const cfg = config as Record<string, unknown>;

  if (!cfg.version) {
    errors.push("Missing required field: version");
  }
  if (!cfg.name) {
    errors.push("Missing required field: name");
  }
  if (!cfg.workflow_type) {
    errors.push("Missing required field: workflow_type");
  }
  if (!Array.isArray(cfg.steps)) {
    errors.push("Missing or invalid field: steps (expected array)");
  }
  if (!Array.isArray(cfg.transitions)) {
    errors.push("Missing or invalid field: transitions (expected array)");
  }

  // Validate steps
  if (Array.isArray(cfg.steps)) {
    for (let i = 0; i < cfg.steps.length; i++) {
      const step = cfg.steps[i] as Record<string, unknown>;
      if (!step.id) {
        errors.push(`Step ${i}: missing required field 'id'`);
      }
      if (!step.name) {
        errors.push(`Step ${i}: missing required field 'name'`);
      }
      if (!step.step_type) {
        errors.push(`Step ${i}: missing required field 'step_type'`);
      }
    }
  }

  // Validate transitions
  if (Array.isArray(cfg.transitions)) {
    for (let i = 0; i < cfg.transitions.length; i++) {
      const trans = cfg.transitions[i] as Record<string, unknown>;
      if (!trans.from) {
        errors.push(`Transition ${i}: missing required field 'from'`);
      }
      if (!trans.to) {
        errors.push(`Transition ${i}: missing required field 'to'`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// =============================================================================
// Conversion Functions
// =============================================================================

function stepToNode(
  step: StepConfig,
  position: { x: number; y: number } | undefined,
): WorkflowNode {
  const nodeType = STEP_TYPE_TO_NODE_TYPE[step.step_type] || "auto_process";

  const data: WorkflowNodeData = {
    label: step.name,
    nodeType,
    stepConfig: step,
  };

  return {
    id: step.id,
    type: nodeType,
    position: position || { x: 0, y: 0 },
    data,
  };
}

function createStartNode(position?: { x: number; y: number }): WorkflowNode {
  return {
    id: "_start",
    type: "start",
    position: position || { x: 0, y: 0 },
    data: {
      label: "Start",
      nodeType: "start",
    },
  };
}

function createEndNode(position?: { x: number; y: number }): WorkflowNode {
  return {
    id: "_complete",
    type: "end",
    position: position || { x: 0, y: 0 },
    data: {
      label: "End",
      nodeType: "end",
    },
  };
}

function transitionToEdge(
  transition: TransitionConfig,
  index: number,
): WorkflowEdge {
  return {
    id: `edge-${transition.from}-${transition.to}-${index}`,
    source: transition.from,
    target: transition.to,
    type: "transition",
    data: {
      condition: transition.condition,
      label: transition.condition?.type || undefined,
    },
  };
}

// =============================================================================
// Main Export
// =============================================================================

/**
 * Parse YAML string and convert to canvas state.
 */
export function yamlToCanvas(yamlString: string): YamlToCanvasResult {
  const errors: string[] = [];
  let parsedConfig: WorkflowConfigWithMeta;

  // Parse YAML
  try {
    parsedConfig = yaml.load(yamlString) as WorkflowConfigWithMeta;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown parse error";
    return {
      nodes: [],
      edges: [],
      stepConfigs: {},
      workflowMeta: {
        name: "Untitled",
        version: "1.0",
        workflow_type: "single",
        settings: {},
      },
      errors: [`YAML parse error: ${message}`],
    };
  }

  // Validate structure
  const validation = validateConfig(parsedConfig);
  if (!validation.valid) {
    return {
      nodes: [],
      edges: [],
      stepConfigs: {},
      workflowMeta: {
        name: "Untitled",
        version: "1.0",
        workflow_type: "single",
        settings: {},
      },
      errors: validation.errors,
    };
  }

  // Extract position metadata
  const positions = parsedConfig._metadata?.positions || {};

  // Build workflow meta
  const workflowMeta: WorkflowMeta = {
    name: parsedConfig.name,
    version: parsedConfig.version,
    workflow_type: parsedConfig.workflow_type,
    settings: parsedConfig.settings || {},
  };

  // Build step configs map
  const stepConfigs: Record<string, StepConfig> = {};
  for (const step of parsedConfig.steps) {
    stepConfigs[step.id] = step;
  }

  // Create nodes from steps
  const nodes: WorkflowNode[] = [];
  const hasStart = parsedConfig.transitions.some((t) => t.from === "_start");
  const hasEnd = parsedConfig.transitions.some((t) => t.to === "_complete");

  // Add start node if there are transitions from _start
  if (hasStart) {
    nodes.push(createStartNode(positions["_start"]));
  }

  // Add step nodes
  for (const step of parsedConfig.steps) {
    nodes.push(stepToNode(step, positions[step.id]));
  }

  // Add end node if there are transitions to _complete
  if (hasEnd) {
    nodes.push(createEndNode(positions["_complete"]));
  }

  // Create edges from transitions
  const edges: WorkflowEdge[] = parsedConfig.transitions.map((t, i) =>
    transitionToEdge(t, i),
  );

  // Auto-layout if no positions provided
  const needsLayout = Object.keys(positions).length === 0;
  const finalNodes = needsLayout ? autoLayout(nodes, edges) : nodes;

  return {
    nodes: finalNodes,
    edges,
    stepConfigs,
    workflowMeta,
    errors,
  };
}

/**
 * Parse YAML and return just the config object (for validation).
 */
export function parseYamlConfig(
  yamlString: string,
): { config: WorkflowConfig | null; errors: string[] } {
  try {
    const parsed = yaml.load(yamlString) as WorkflowConfigWithMeta;
    const validation = validateConfig(parsed);

    if (!validation.valid) {
      return { config: null, errors: validation.errors };
    }

    // Remove metadata before returning
    const { _metadata: _, ...config } = parsed;
    return { config: config as WorkflowConfig, errors: [] };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown parse error";
    return { config: null, errors: [`YAML parse error: ${message}`] };
  }
}
