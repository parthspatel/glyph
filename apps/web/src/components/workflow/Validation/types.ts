/**
 * Validation types for workflow validation.
 */

export type ValidationSeverity = "error" | "warning";
export type ValidationCategory = "structure" | "config" | "data_flow";

export interface ValidationIssue {
  /** Unique identifier for the issue */
  id: string;
  /** Node ID if issue is node-specific */
  nodeId?: string;
  /** Edge ID if issue is edge-specific */
  edgeId?: string;
  /** Severity level */
  severity: ValidationSeverity;
  /** Category for grouping */
  category: ValidationCategory;
  /** Human-readable message */
  message: string;
  /** Suggestion for fixing the issue */
  suggestion?: string;
}

export interface ValidationResult {
  /** Whether workflow is valid (no errors) */
  valid: boolean;
  /** All validation issues */
  issues: ValidationIssue[];
  /** Issues grouped by node ID */
  nodeErrors: Map<string, ValidationIssue[]>;
  /** Issues grouped by edge ID */
  edgeErrors: Map<string, ValidationIssue[]>;
  /** Timestamp of validation */
  validatedAt: number;
}

export interface ValidationState {
  /** Latest validation result */
  result: ValidationResult | null;
  /** Whether validation is running */
  isValidating: boolean;
}
