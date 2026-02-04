/**
 * useWorkflowValidation - Hook for debounced workflow validation.
 */
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useCanvasStore } from "../stores/canvasStore";
import { useConfigStore } from "../stores/configStore";
import { validateWorkflow } from "../Validation/ValidationEngine";
import type { ValidationResult, ValidationIssue } from "../Validation/types";

// =============================================================================
// Types
// =============================================================================

export interface UseWorkflowValidationReturn {
  /** Latest validation result */
  result: ValidationResult | null;
  /** All validation issues */
  issues: ValidationIssue[];
  /** Issues for a specific node */
  getNodeIssues: (nodeId: string) => ValidationIssue[];
  /** Issues for a specific edge */
  getEdgeIssues: (edgeId: string) => ValidationIssue[];
  /** Whether workflow is valid */
  isValid: boolean;
  /** Error count */
  errorCount: number;
  /** Warning count */
  warningCount: number;
  /** Whether validation is in progress */
  isValidating: boolean;
  /** Manually trigger validation */
  validateNow: () => void;
}

// =============================================================================
// Hook
// =============================================================================

const VALIDATION_DEBOUNCE_MS = 500;

export function useWorkflowValidation(): UseWorkflowValidationReturn {
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Get store state
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const stepConfigs = useConfigStore((s) => s.stepConfigs);
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);

  // Run validation
  const runValidation = useCallback(() => {
    setIsValidating(true);

    // Run validation synchronously (fast enough for UI)
    const validationResult = validateWorkflow(nodes, edges, stepConfigs);
    setResult(validationResult);

    // Update node error states in canvas store
    for (const node of nodes) {
      const nodeIssues = validationResult.nodeErrors.get(node.id) || [];
      const hasError = nodeIssues.some((i) => i.severity === "error");
      const errorMessages = nodeIssues.map((i) => i.message);

      // Only update if changed
      if (node.data.hasError !== hasError ||
          JSON.stringify(node.data.errors) !== JSON.stringify(errorMessages)) {
        updateNodeData(node.id, {
          hasError,
          errors: errorMessages,
        });
      }
    }

    setIsValidating(false);
  }, [nodes, edges, stepConfigs, updateNodeData]);

  // Debounced validation on changes
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(runValidation, VALIDATION_DEBOUNCE_MS);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [nodes, edges, stepConfigs, runValidation]);

  // Manual validation trigger
  const validateNow = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    runValidation();
  }, [runValidation]);

  // Memoized getters
  const getNodeIssues = useCallback(
    (nodeId: string): ValidationIssue[] => {
      return result?.nodeErrors.get(nodeId) || [];
    },
    [result]
  );

  const getEdgeIssues = useCallback(
    (edgeId: string): ValidationIssue[] => {
      return result?.edgeErrors.get(edgeId) || [];
    },
    [result]
  );

  // Computed values
  const issues = result?.issues || [];
  const isValid = result?.valid ?? true;
  const errorCount = useMemo(
    () => issues.filter((i) => i.severity === "error").length,
    [issues]
  );
  const warningCount = useMemo(
    () => issues.filter((i) => i.severity === "warning").length,
    [issues]
  );

  return {
    result,
    issues,
    getNodeIssues,
    getEdgeIssues,
    isValid,
    errorCount,
    warningCount,
    isValidating,
    validateNow,
  };
}
