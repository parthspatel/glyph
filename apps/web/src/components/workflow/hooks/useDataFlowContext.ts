/**
 * useDataFlowContext - Hook for building data flow context and autocomplete suggestions.
 */
import { useMemo } from "react";
import { useCanvasStore } from "../stores/canvasStore";
import { useConfigStore } from "../stores/configStore";
import type { WorkflowNode, StepConfig } from "../types";

// =============================================================================
// Types
// =============================================================================

export interface DataFlowContext {
  /** Input data fields from data source schema */
  input: Record<string, FieldInfo>;
  /** Output from previous steps */
  steps: Record<string, StepOutputInfo>;
  /** Current task metadata */
  task: Record<string, FieldInfo>;
  /** Current user info */
  user: Record<string, FieldInfo>;
}

export interface FieldInfo {
  type: string;
  description?: string;
  children?: Record<string, FieldInfo>;
}

export interface StepOutputInfo {
  name: string;
  output: Record<string, FieldInfo>;
}

export interface AutocompleteSuggestion {
  label: string;
  insertText: string;
  detail?: string;
  kind: "variable" | "property" | "filter";
}

export interface UseDataFlowContextReturn {
  context: DataFlowContext;
  suggestions: AutocompleteSuggestion[];
  getSuggestionsForPath: (path: string) => AutocompleteSuggestion[];
  validateExpression: (expression: string) => string[];
}

// =============================================================================
// Nunjucks Filters
// =============================================================================

const NUNJUCKS_FILTERS: AutocompleteSuggestion[] = [
  {
    label: "lower",
    insertText: "lower",
    detail: "Convert to lowercase",
    kind: "filter",
  },
  {
    label: "upper",
    insertText: "upper",
    detail: "Convert to uppercase",
    kind: "filter",
  },
  {
    label: "capitalize",
    insertText: "capitalize",
    detail: "Capitalize first letter",
    kind: "filter",
  },
  { label: "title", insertText: "title", detail: "Title case", kind: "filter" },
  {
    label: "trim",
    insertText: "trim",
    detail: "Remove whitespace",
    kind: "filter",
  },
  {
    label: "truncate",
    insertText: "truncate(30)",
    detail: "Truncate to length",
    kind: "filter",
  },
  {
    label: "default",
    insertText: 'default("")',
    detail: "Default value if undefined",
    kind: "filter",
  },
  {
    label: "json",
    insertText: "json",
    detail: "Convert to JSON string",
    kind: "filter",
  },
  {
    label: "first",
    insertText: "first",
    detail: "First element of array",
    kind: "filter",
  },
  {
    label: "last",
    insertText: "last",
    detail: "Last element of array",
    kind: "filter",
  },
  {
    label: "length",
    insertText: "length",
    detail: "Length of array/string",
    kind: "filter",
  },
  {
    label: "join",
    insertText: 'join(", ")',
    detail: "Join array with separator",
    kind: "filter",
  },
  { label: "sort", insertText: "sort", detail: "Sort array", kind: "filter" },
  {
    label: "reverse",
    insertText: "reverse",
    detail: "Reverse array",
    kind: "filter",
  },
];

// =============================================================================
// Helper Functions
// =============================================================================

// parseJsonSchema can be used to parse actual data source schemas
// function parseJsonSchema(schemaJson: string): Record<string, FieldInfo> {
//   try {
//     const schema = JSON.parse(schemaJson);
//     return extractFieldsFromSchema(schema);
//   } catch {
//     return {};
//   }
// }

// Used when parsing actual data source schemas from JSON
// Called recursively for nested objects/arrays
export function extractFieldsFromSchema(
  schema: Record<string, unknown>,
): Record<string, FieldInfo> {
  const fields: Record<string, FieldInfo> = {};

  if (schema.type !== "object" || !schema.properties) {
    return fields;
  }

  const properties = schema.properties as Record<
    string,
    Record<string, unknown>
  >;
  for (const [name, prop] of Object.entries(properties)) {
    const fieldInfo: FieldInfo = {
      type: (prop.type as string) || "unknown",
      description: prop.description as string | undefined,
    };

    if (prop.type === "object" && prop.properties) {
      fieldInfo.children = extractFieldsFromSchema(
        prop as Record<string, unknown>,
      );
    }

    if (prop.type === "array" && prop.items) {
      const items = prop.items as Record<string, unknown>;
      if (items.type === "object" && items.properties) {
        fieldInfo.children = extractFieldsFromSchema(items);
      }
    }

    fields[name] = fieldInfo;
  }

  return fields;
}

function buildSuggestionsFromFields(
  fields: Record<string, FieldInfo>,
  prefix: string,
): AutocompleteSuggestion[] {
  const suggestions: AutocompleteSuggestion[] = [];

  for (const [name, info] of Object.entries(fields)) {
    const fullPath = prefix ? `${prefix}.${name}` : name;
    suggestions.push({
      label: name,
      insertText: fullPath,
      detail: `${info.type}${info.description ? ` - ${info.description}` : ""}`,
      kind: "property",
    });

    if (info.children) {
      suggestions.push(...buildSuggestionsFromFields(info.children, fullPath));
    }
  }

  return suggestions;
}

function getStepOutputSchema(
  stepConfig: StepConfig | undefined,
): Record<string, FieldInfo> {
  // Mock output schema based on step type
  if (!stepConfig) return {};

  switch (stepConfig.step_type) {
    case "annotation":
      return {
        annotations: {
          type: "array",
          description: "List of annotations",
          children: {
            label: { type: "string", description: "Annotation label" },
            value: { type: "any", description: "Annotation value" },
            confidence: { type: "number", description: "Confidence score" },
          },
        },
        completed_at: { type: "string", description: "Completion timestamp" },
        annotator_id: { type: "string", description: "Annotator ID" },
      };
    case "review":
      return {
        decision: { type: "string", description: "Review decision" },
        corrections: { type: "object", description: "Corrections made" },
        reviewer_id: { type: "string", description: "Reviewer ID" },
      };
    case "adjudication":
      return {
        final_annotation: {
          type: "object",
          description: "Final resolved annotation",
        },
        resolution_method: {
          type: "string",
          description: "How conflict was resolved",
        },
        adjudicator_id: { type: "string", description: "Adjudicator ID" },
      };
    default:
      return {};
  }
}

// =============================================================================
// Hook
// =============================================================================

export function useDataFlowContext(
  currentStepId?: string,
): UseDataFlowContextReturn {
  const nodes = useCanvasStore((s) => s.nodes);
  const stepConfigs = useConfigStore((s) => s.stepConfigs);

  const context = useMemo<DataFlowContext>(() => {
    // Build input context (from data source schema - mock for now)
    const input: Record<string, FieldInfo> = {
      id: { type: "string", description: "Item ID" },
      text: { type: "string", description: "Text content" },
      metadata: {
        type: "object",
        description: "Item metadata",
        children: {
          source: { type: "string", description: "Data source" },
          timestamp: { type: "string", description: "Creation time" },
        },
      },
    };

    // Build steps context from workflow
    const steps: Record<string, StepOutputInfo> = {};

    // Find steps that come before current step
    const stepNodes = nodes.filter(
      (n): n is WorkflowNode =>
        ["annotation", "review", "adjudication", "auto_process"].includes(
          n.data.nodeType,
        ) && n.id !== currentStepId,
    );

    for (const node of stepNodes) {
      const config = stepConfigs[node.id];
      steps[node.id] = {
        name: node.data.label,
        output: getStepOutputSchema(config),
      };
    }

    // Task metadata
    const task: Record<string, FieldInfo> = {
      id: { type: "string", description: "Task ID" },
      created_at: { type: "string", description: "Task creation time" },
      priority: { type: "number", description: "Task priority" },
      status: { type: "string", description: "Current status" },
    };

    // User info
    const user: Record<string, FieldInfo> = {
      id: { type: "string", description: "User ID" },
      name: { type: "string", description: "User name" },
      email: { type: "string", description: "User email" },
      role: { type: "string", description: "User role" },
    };

    return { input, steps, task, user };
  }, [nodes, stepConfigs, currentStepId]);

  const suggestions = useMemo<AutocompleteSuggestion[]>(() => {
    const all: AutocompleteSuggestion[] = [];

    // Top-level variables
    all.push({
      label: "input",
      insertText: "input",
      detail: "Input data",
      kind: "variable",
    });
    all.push({
      label: "steps",
      insertText: "steps",
      detail: "Step outputs",
      kind: "variable",
    });
    all.push({
      label: "task",
      insertText: "task",
      detail: "Task metadata",
      kind: "variable",
    });
    all.push({
      label: "user",
      insertText: "user",
      detail: "Current user",
      kind: "variable",
    });

    // Input fields
    all.push(...buildSuggestionsFromFields(context.input, "input"));

    // Step outputs
    for (const [stepId, stepInfo] of Object.entries(context.steps)) {
      all.push({
        label: stepId,
        insertText: `steps.${stepId}`,
        detail: `Output from ${stepInfo.name}`,
        kind: "variable",
      });
      all.push(
        ...buildSuggestionsFromFields(
          stepInfo.output,
          `steps.${stepId}.output`,
        ),
      );
    }

    // Task fields
    all.push(...buildSuggestionsFromFields(context.task, "task"));

    // User fields
    all.push(...buildSuggestionsFromFields(context.user, "user"));

    // Filters
    all.push(...NUNJUCKS_FILTERS);

    return all;
  }, [context]);

  const getSuggestionsForPath = useMemo(
    () =>
      (path: string): AutocompleteSuggestion[] => {
        if (!path) return suggestions.filter((s) => s.kind === "variable");

        return suggestions.filter(
          (s) => s.insertText.startsWith(path) && s.insertText !== path,
        );
      },
    [suggestions],
  );

  const validateExpression = useMemo(
    () =>
      (expression: string): string[] => {
        const errors: string[] = [];

        // Extract variable references from {{ ... }}
        const varRegex = /\{\{\s*([^}|]+)/g;
        let match;

        while ((match = varRegex.exec(expression)) !== null) {
          const varPath = match[1].trim();
          const parts = varPath.split(".");

          // Check if path is valid
          if (parts[0] === "input") {
            // Validate input path
            let current: Record<string, FieldInfo> | undefined = context.input;
            for (let i = 1; i < parts.length && current; i++) {
              const fieldInfo: FieldInfo | undefined = current[parts[i]];
              if (!fieldInfo) {
                errors.push(
                  `Unknown field: ${parts.slice(0, i + 1).join(".")}`,
                );
                break;
              }
              current = fieldInfo.children;
            }
          } else if (parts[0] === "steps" && parts.length >= 2) {
            const stepId = parts[1];
            if (!context.steps[stepId]) {
              errors.push(`Unknown step: ${stepId}`);
            }
          } else if (!["task", "user", "input", "steps"].includes(parts[0])) {
            errors.push(`Unknown variable: ${parts[0]}`);
          }
        }

        return errors;
      },
    [context],
  );

  return {
    context,
    suggestions,
    getSuggestionsForPath,
    validateExpression,
  };
}
