/**
 * Canvas to YAML converter.
 * Converts React Flow nodes/edges to WorkflowConfig YAML format.
 */
import * as yaml from "js-yaml";
import type {
  WorkflowNode,
  WorkflowEdge,
  WorkflowConfig,
  StepConfig,
  TransitionConfig,
  WorkflowMeta,
  NodeType,
  StepType,
} from "../types";

// =============================================================================
// Types
// =============================================================================

export interface CanvasToYamlInput {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  stepConfigs: Record<string, StepConfig>;
  workflowMeta: WorkflowMeta;
}

export interface PositionMetadata {
  /** Node positions keyed by node ID */
  positions: Record<string, { x: number; y: number }>;
}

// Step types that are actual workflow steps (not visual-only)
const STEP_TYPES: StepType[] = [
  "annotation",
  "review",
  "adjudication",
  "auto_process",
  "conditional",
  "sub_workflow",
];

function isStepType(nodeType: NodeType): nodeType is StepType {
  return STEP_TYPES.includes(nodeType as StepType);
}

// =============================================================================
// Conversion Functions
// =============================================================================

/**
 * Convert a canvas node to a step config for YAML.
 */
function nodeToStep(
  node: WorkflowNode,
  stepConfigs: Record<string, StepConfig>,
): StepConfig | null {
  const { nodeType } = node.data;

  // Skip visual-only nodes (start, end, fork, join)
  if (!isStepType(nodeType)) {
    return null;
  }

  // Use existing step config if available, otherwise create default
  const existingConfig = stepConfigs[node.id];
  if (existingConfig) {
    return existingConfig;
  }

  // Create default step config
  return {
    id: node.id,
    name: node.data.label,
    step_type: nodeType,
    settings: {},
  };
}

/**
 * Convert canvas edges to transitions for YAML.
 * Maps visual-only node connections to actual step connections.
 */
function edgesToTransitions(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
): TransitionConfig[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const transitions: TransitionConfig[] = [];

  // Helper to find the actual step node following a visual node
  function resolveToStep(nodeId: string, visited: Set<string>): string | null {
    if (visited.has(nodeId)) return null; // Prevent cycles
    visited.add(nodeId);

    const node = nodeMap.get(nodeId);
    if (!node) return null;

    const { nodeType } = node.data;

    // If it's an actual step, return its ID
    if (isStepType(nodeType)) {
      return nodeId;
    }

    // If it's end node, return special terminal state
    if (nodeType === "end") {
      return "_complete";
    }

    // For visual nodes (start, fork, join), follow outgoing edges
    const outgoingEdges = edges.filter((e) => e.source === nodeId);
    if (outgoingEdges.length > 0) {
      return resolveToStep(outgoingEdges[0].target, visited);
    }

    return null;
  }

  // Helper to find the actual step node before a visual node
  function resolveFromStep(
    nodeId: string,
    visited: Set<string>,
  ): string | null {
    if (visited.has(nodeId)) return null;
    visited.add(nodeId);

    const node = nodeMap.get(nodeId);
    if (!node) return null;

    const { nodeType } = node.data;

    if (isStepType(nodeType)) {
      return nodeId;
    }

    if (nodeType === "start") {
      return "_start";
    }

    // For visual nodes, follow incoming edges
    const incomingEdges = edges.filter((e) => e.target === nodeId);
    if (incomingEdges.length > 0) {
      return resolveFromStep(incomingEdges[0].source, visited);
    }

    return null;
  }

  for (const edge of edges) {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);

    if (!sourceNode || !targetNode) continue;

    const sourceType = sourceNode.data.nodeType;
    const targetType = targetNode.data.nodeType;

    // Direct step-to-step or step-to-end connection
    if (isStepType(sourceType)) {
      const toId = isStepType(targetType)
        ? edge.target
        : targetType === "end"
          ? "_complete"
          : resolveToStep(edge.target, new Set());

      if (toId) {
        transitions.push({
          from: edge.source,
          to: toId,
          condition: edge.data?.condition,
        });
      }
    }
    // Start node to step
    else if (sourceType === "start" && isStepType(targetType)) {
      transitions.push({
        from: "_start",
        to: edge.target,
        condition: edge.data?.condition,
      });
    }
    // Fork node - create transitions from fork's source to each target
    else if (sourceType === "fork") {
      const fromStep = resolveFromStep(edge.source, new Set());
      if (fromStep && isStepType(targetType)) {
        transitions.push({
          from: fromStep,
          to: edge.target,
          condition: edge.data?.condition,
        });
      }
    }
    // Join node - handled by the edges coming into it
    else if (targetType === "join") {
      const toStep = resolveToStep(edge.target, new Set());
      if (toStep && isStepType(sourceType)) {
        transitions.push({
          from: edge.source,
          to: toStep,
          condition: edge.data?.condition,
        });
      }
    }
  }

  return transitions;
}

/**
 * Extract position metadata for round-trip preservation.
 */
function extractPositions(nodes: WorkflowNode[]): PositionMetadata {
  const positions: Record<string, { x: number; y: number }> = {};

  for (const node of nodes) {
    positions[node.id] = {
      x: Math.round(node.position.x),
      y: Math.round(node.position.y),
    };
  }

  return { positions };
}

// =============================================================================
// Main Export
// =============================================================================

/**
 * Convert canvas state to YAML string.
 */
export function canvasToYaml(input: CanvasToYamlInput): string {
  const { nodes, edges, stepConfigs, workflowMeta } = input;

  // Convert nodes to steps (excluding visual-only nodes)
  const steps: StepConfig[] = [];
  for (const node of nodes) {
    const step = nodeToStep(node, stepConfigs);
    if (step) {
      steps.push(step);
    }
  }

  // Convert edges to transitions
  const transitions = edgesToTransitions(nodes, edges);

  // Build workflow config
  const config: WorkflowConfig = {
    version: workflowMeta.version,
    name: workflowMeta.name,
    workflow_type: workflowMeta.workflow_type,
    settings: workflowMeta.settings,
    steps,
    transitions,
  };

  // Extract positions for embedding as comment or metadata
  const positions = extractPositions(nodes);

  // Build YAML with position metadata as a special key
  const configWithMeta = {
    ...config,
    _metadata: {
      positions: positions.positions,
      generated_at: new Date().toISOString(),
    },
  };

  return yaml.dump(configWithMeta, {
    indent: 2,
    lineWidth: 120,
    noRefs: true,
    sortKeys: false,
  });
}

/**
 * Convert canvas state to WorkflowConfig object (without YAML serialization).
 */
export function canvasToConfig(input: CanvasToYamlInput): WorkflowConfig {
  const { nodes, edges, stepConfigs, workflowMeta } = input;

  const steps: StepConfig[] = [];
  for (const node of nodes) {
    const step = nodeToStep(node, stepConfigs);
    if (step) {
      steps.push(step);
    }
  }

  const transitions = edgesToTransitions(nodes, edges);

  return {
    version: workflowMeta.version,
    name: workflowMeta.name,
    workflow_type: workflowMeta.workflow_type,
    settings: workflowMeta.settings,
    steps,
    transitions,
  };
}
