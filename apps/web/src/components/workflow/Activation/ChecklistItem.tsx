/**
 * ChecklistItem - Individual activation check item.
 */
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import type { ActivationCheck, CheckSeverity } from "./useActivationValidation";

// =============================================================================
// Types
// =============================================================================

interface ChecklistItemProps {
  check: ActivationCheck;
  onFix?: (fixAction: string) => void;
}

// =============================================================================
// Severity Icon Component
// =============================================================================

function SeverityIcon({ severity }: { severity: CheckSeverity }) {
  switch (severity) {
    case "blocker":
      return <XCircle className="h-5 w-5 text-destructive" />;
    case "warning":
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    case "passed":
      return <CheckCircle className="h-5 w-5 text-green-500" />;
  }
}

// =============================================================================
// Component
// =============================================================================

export function ChecklistItem({ check, onFix }: ChecklistItemProps) {
  return (
    <div
      className={`flex items-center justify-between rounded-md border p-3 ${
        check.severity === "blocker"
          ? "border-destructive/30 bg-destructive/5"
          : check.severity === "warning"
          ? "border-yellow-500/30 bg-yellow-500/5"
          : "border-green-500/30 bg-green-500/5"
      }`}
    >
      <div className="flex items-center gap-3">
        <SeverityIcon severity={check.severity} />
        <span
          className={`text-sm ${
            check.severity === "passed" ? "text-muted-foreground" : ""
          }`}
        >
          {check.message}
        </span>
      </div>

      {check.fix_action && check.severity !== "passed" && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onFix?.(check.fix_action!)}
        >
          Fix
          <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
