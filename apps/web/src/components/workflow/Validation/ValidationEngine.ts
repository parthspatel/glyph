/**
 * ValidationEngine - Comprehensive workflow validation.
 * Validates structure, configuration, and data flow.
 */
import type { WorkflowNode, WorkflowEdge, StepConfig, NodeType } from "../types";
import type { ValidationIssue, ValidationResult, ValidationCategory } from "./types";

// =============================================================================
// Types
// =============================================================================

interface ValidationContext {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  stepConfigs: Record<string, StepConfig>;
  nodeMap: Map<string, WorkflowNode>;
  outgoingEdges: Map<string, WorkflowEdge[]>;
  incomingEdges: Map<string, WorkflowEdge[]>;
}

// =============================================================================
// Helper Functions
// =============================================================================

function createIssue(
  category: ValidationCategory,
  message: string,
  options: {
    nodeId?: string;
    edgeId?: string;
    severity?: "error" | "warning";
    suggestion?: string;
  } = {}
): ValidationIssue {
  return {
    id: `${category}-${options.nodeId || options.edgeId || "global"}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    category,
    message,
    severity: options.severity || "error",
    nodeId: options.nodeId,
    edgeId: options.edgeId,
    suggestion: options.suggestion,
  };
}

function buildContext(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  stepConfigs: Record<string, StepConfig>
): ValidationContext {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const outgoingEdges = new Map<string, WorkflowEdge[]>();
  const incomingEdges = new Map<string, WorkflowEdge[]>();

  for (const node of nodes) {
    outgoingEdges.set(node.id, []);
    incomingEdges.set(node.id, []);
  }

  for (const edge of edges) {
    outgoingEdges.get(edge.source)?.push(edge);
    incomingEdges.get(edge.target)?.push(edge);
  }

  return { nodes, edges, stepConfigs, nodeMap, outgoingEdges, incomingEdges };
}

// =============================================================================
// Structure Validation
// =============================================================================

function validateStructure(ctx: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Find start and end nodes
  const startNodes = ctx.nodes.filter((n) => n.data.nodeType === "start");
  const endNodes = ctx.nodes.filter((n) => n.data.nodeType === "end");

  // Must have exactly one Start node
  if (startNodes.length === 0) {
    issues.push(
      createIssue("structure", "Workflow must have a Start node", {
        severity: "error",
        suggestion: "Add a Start node from the palette",
      })
    );
  } else if (startNodes.length > 1) {
    for (const node of startNodes.slice(1)) {
      issues.push(
        createIssue("structure", "Only one Start node is allowed", {
          nodeId: node.id,
          suggestion: "Remove this extra Start node",
        })
      );
    }
  }

  // Must have at least one End node
  if (endNodes.length === 0) {
    issues.push(
      createIssue("structure", "Workflow must have at least one End node", {
        severity: "error",
        suggestion: "Add an End node from the palette",
      })
    );
  }

  // Check reachability from Start (BFS)
  if (startNodes.length === 1) {
    const reachable = new Set<string>();
    const queue: string[] = [startNodes[0].id];

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      if (reachable.has(nodeId)) continue;
      reachable.add(nodeId);

      const outgoing = ctx.outgoingEdges.get(nodeId) || [];
      for (const edge of outgoing) {
        if (!reachable.has(edge.target)) {
          queue.push(edge.target);
        }
      }
    }

    // Check for unreachable nodes
    for (const node of ctx.nodes) {
      if (!reachable.has(node.id) && node.data.nodeType !== "start") {
        issues.push(
          createIssue(
            "structure",
            `Node "${node.data.label}" is not reachable from Start`,
            {
              nodeId: node.id,
              suggestion: "Connect this node to the workflow or remove it",
            }
          )
        );
      }
    }
  }

  // Check path to End (reverse BFS)
  if (endNodes.length > 0) {
    const canReachEnd = new Set<string>();
    const queue: string[] = endNodes.map((n) => n.id);

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      if (canReachEnd.has(nodeId)) continue;
      canReachEnd.add(nodeId);

      const incoming = ctx.incomingEdges.get(nodeId) || [];
      for (const edge of incoming) {
        if (!canReachEnd.has(edge.source)) {
          queue.push(edge.source);
        }
      }
    }

    // Check for dead-end nodes (excluding end nodes themselves)
    for (const node of ctx.nodes) {
      if (!canReachEnd.has(node.id) && node.data.nodeType !== "end") {
        issues.push(
          createIssue(
            "structure",
            `Node "${node.data.label}" has no path to End`,
            {
              nodeId: node.id,
              severity: "warning",
              suggestion: "Connect this node to an End node",
            }
          )
        );
      }
    }
  }

  // Check for orphan nodes (no connections at all)
  for (const node of ctx.nodes) {
    const hasOutgoing = (ctx.outgoingEdges.get(node.id) || []).length > 0;
    const hasIncoming = (ctx.incomingEdges.get(node.id) || []).length > 0;

    if (!hasOutgoing && !hasIncoming) {
      issues.push(
        createIssue(
          "structure",
          `Node "${node.data.label}" is completely disconnected`,
          {
            nodeId: node.id,
            suggestion: "Connect this node to the workflow or remove it",
          }
        )
      );
    }
  }

  // Validate Fork nodes (must have 2+ outgoing)
  for (const node of ctx.nodes.filter((n) => n.data.nodeType === "fork")) {
    const outgoing = ctx.outgoingEdges.get(node.id) || [];
    if (outgoing.length < 2) {
      issues.push(
        createIssue(
          "structure",
          `Fork node "${node.data.label}" must have at least 2 outgoing connections`,
          {
            nodeId: node.id,
            suggestion: "Add more branches from this Fork node",
          }
        )
      );
    }
  }

  // Validate Join nodes (must have 2+ incoming)
  for (const node of ctx.nodes.filter((n) => n.data.nodeType === "join")) {
    const incoming = ctx.incomingEdges.get(node.id) || [];
    if (incoming.length < 2) {
      issues.push(
        createIssue(
          "structure",
          `Join node "${node.data.label}" must have at least 2 incoming connections`,
          {
            nodeId: node.id,
            suggestion: "Connect more branches to this Join node",
          }
        )
      );
    }
  }

  return issues;
}

// =============================================================================
// Configuration Validation
// =============================================================================

const STEP_TYPES_REQUIRING_LAYOUT: NodeType[] = [
  "annotation",
  "review",
  "adjudication",
];

function validateConfig(ctx: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const node of ctx.nodes) {
    const { nodeType } = node.data;
    const config = ctx.stepConfigs[node.id];

    // Skip visual-only nodes
    if (["start", "end", "fork", "join"].includes(nodeType)) {
      continue;
    }

    // Layout required for annotation, review, adjudication
    if (STEP_TYPES_REQUIRING_LAYOUT.includes(nodeType)) {
      const layoutId = config?.settings?.layout_id;
      if (!layoutId) {
        issues.push(
          createIssue(
            "config",
            `Step "${node.data.label}" requires a layout assignment`,
            {
              nodeId: node.id,
              suggestion: "Assign a layout in the step configuration",
            }
          )
        );
      }
    }

    // Conditional nodes need an expression
    if (nodeType === "conditional") {
      const condition = config?.settings?.condition;
      if (!condition) {
        issues.push(
          createIssue(
            "config",
            `Condition node "${node.data.label}" requires an expression`,
            {
              nodeId: node.id,
              suggestion: "Add a condition expression in the configuration",
            }
          )
        );
      }
    }

    // Sub-workflow needs a workflow reference
    if (nodeType === "sub_workflow") {
      const subWorkflowId = config?.settings?.sub_workflow_id;
      if (!subWorkflowId) {
        issues.push(
          createIssue(
            "config",
            `Sub-workflow node "${node.data.label}" requires a workflow reference`,
            {
              nodeId: node.id,
              suggestion: "Select a workflow in the configuration",
            }
          )
        );
      }
    }

    // Validate threshold range for adjudication
    if (nodeType === "adjudication") {
      const threshold = config?.settings?.threshold;
      if (threshold !== undefined && (threshold < 0 || threshold > 1)) {
        issues.push(
          createIssue(
            "config",
            `Adjudication threshold must be between 0 and 1`,
            {
              nodeId: node.id,
              severity: "error",
              suggestion: "Set threshold between 0.0 and 1.0",
            }
          )
        );
      }
    }

    // Timeout validation (max 480 minutes)
    const timeout = config?.settings?.timeout_minutes;
    if (timeout !== undefined && timeout > 480) {
      issues.push(
        createIssue("config", `Timeout cannot exceed 480 minutes (8 hours)`, {
          nodeId: node.id,
          severity: "warning",
          suggestion: "Reduce timeout to 480 minutes or less",
        })
      );
    }
  }

  return issues;
}

// =============================================================================
// Data Flow Validation
// =============================================================================

function validateDataFlow(ctx: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Build set of step IDs for reference checking
  const stepIds = new Set(
    ctx.nodes
      .filter((n) => !["start", "end", "fork", "join"].includes(n.data.nodeType))
      .map((n) => n.id)
  );

  // Check each step's data flow configuration
  for (const node of ctx.nodes) {
    const config = ctx.stepConfigs[node.id];
    if (!config) continue;

    // Check for references to non-existent steps in condition expressions
    const condition = config.settings?.condition;
    if (condition) {
      // Extract step references like "steps.step_id"
      const stepRefRegex = /steps\.(\w+)/g;
      let match;
      while ((match = stepRefRegex.exec(condition)) !== null) {
        const referencedStepId = match[1];
        if (!stepIds.has(referencedStepId)) {
          issues.push(
            createIssue(
              "data_flow",
              `Unknown step reference "${referencedStepId}" in condition`,
              {
                nodeId: node.id,
                severity: "error",
                suggestion: `Check that step "${referencedStepId}" exists`,
              }
            )
          );
        }
      }
    }
  }

  return issues;
}

// =============================================================================
// Main Export
// =============================================================================

export function validateWorkflow(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  stepConfigs: Record<string, StepConfig>
): ValidationResult {
  const ctx = buildContext(nodes, edges, stepConfigs);

  // Run all validation passes
  const structureIssues = validateStructure(ctx);
  const configIssues = validateConfig(ctx);
  const dataFlowIssues = validateDataFlow(ctx);

  // Combine all issues
  const allIssues = [...structureIssues, ...configIssues, ...dataFlowIssues];

  // Group by node/edge
  const nodeErrors = new Map<string, ValidationIssue[]>();
  const edgeErrors = new Map<string, ValidationIssue[]>();

  for (const issue of allIssues) {
    if (issue.nodeId) {
      const existing = nodeErrors.get(issue.nodeId) || [];
      existing.push(issue);
      nodeErrors.set(issue.nodeId, existing);
    }
    if (issue.edgeId) {
      const existing = edgeErrors.get(issue.edgeId) || [];
      existing.push(issue);
      edgeErrors.set(issue.edgeId, existing);
    }
  }

  // Workflow is valid only if no errors (warnings are ok)
  const hasErrors = allIssues.some((i) => i.severity === "error");

  return {
    valid: !hasErrors,
    issues: allIssues,
    nodeErrors,
    edgeErrors,
    validatedAt: Date.now(),
  };
}
