/**
 * Hook for fetching and managing activation validation state.
 */
import { useState, useCallback, useEffect, useMemo } from "react";

// =============================================================================
// Types
// =============================================================================

export type CheckSeverity = "blocker" | "warning" | "passed";
export type CheckCategory = "workflow" | "data_source" | "layouts" | "permissions";

export interface ActivationCheck {
  id: string;
  category: CheckCategory;
  severity: CheckSeverity;
  message: string;
  fix_action?: string;
}

export interface ActivationValidationResponse {
  can_activate: boolean;
  checks: ActivationCheck[];
}

export interface GroupedChecks {
  workflow: ActivationCheck[];
  data_source: ActivationCheck[];
  layouts: ActivationCheck[];
  permissions: ActivationCheck[];
}

export interface UseActivationValidationReturn {
  checks: ActivationCheck[];
  groupedChecks: GroupedChecks;
  canActivate: boolean;
  isLoading: boolean;
  error: string | null;
  blockerCount: number;
  warningCount: number;
  passedCount: number;
  refetch: () => Promise<void>;
}

// =============================================================================
// Severity ordering for sorting
// =============================================================================

const severityOrder: Record<CheckSeverity, number> = {
  blocker: 0,
  warning: 1,
  passed: 2,
};

// =============================================================================
// Hook
// =============================================================================

export function useActivationValidation(projectId: string): UseActivationValidationReturn {
  const [checks, setChecks] = useState<ActivationCheck[]>([]);
  const [canActivate, setCanActivate] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch validation data
  const fetchValidation = useCallback(async () => {
    if (!projectId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/projects/${projectId}/validate-activation`);

      if (!response.ok) {
        throw new Error(`Failed to fetch validation: ${response.statusText}`);
      }

      const data: ActivationValidationResponse = await response.json();

      // Sort checks: blockers first, then warnings, then passed
      const sortedChecks = [...data.checks].sort(
        (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
      );

      setChecks(sortedChecks);
      setCanActivate(data.can_activate);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // Fetch on mount and when projectId changes
  useEffect(() => {
    fetchValidation();
  }, [fetchValidation]);

  // Group checks by category
  const groupedChecks = useMemo((): GroupedChecks => {
    const groups: GroupedChecks = {
      workflow: [],
      data_source: [],
      layouts: [],
      permissions: [],
    };

    for (const check of checks) {
      if (check.category in groups) {
        groups[check.category].push(check);
      }
    }

    // Sort each group by severity
    for (const category of Object.keys(groups) as CheckCategory[]) {
      groups[category].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
    }

    return groups;
  }, [checks]);

  // Count by severity
  const blockerCount = useMemo(
    () => checks.filter((c) => c.severity === "blocker").length,
    [checks]
  );
  const warningCount = useMemo(
    () => checks.filter((c) => c.severity === "warning").length,
    [checks]
  );
  const passedCount = useMemo(
    () => checks.filter((c) => c.severity === "passed").length,
    [checks]
  );

  return {
    checks,
    groupedChecks,
    canActivate,
    isLoading,
    error,
    blockerCount,
    warningCount,
    passedCount,
    refetch: fetchValidation,
  };
}
