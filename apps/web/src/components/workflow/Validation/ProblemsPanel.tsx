/**
 * ProblemsPanel - Collapsible panel showing validation issues.
 */
import { memo, useState, useCallback, useMemo } from "react";
import {
  ChevronUp,
  ChevronDown,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ValidationIssue, ValidationCategory } from "./types";

// =============================================================================
// Types
// =============================================================================

export interface ProblemsPanelProps {
  /** Validation issues to display */
  issues: ValidationIssue[];
  /** Called when an issue is clicked */
  onIssueClick?: (issue: ValidationIssue) => void;
  /** Additional class names */
  className?: string;
}

type FilterMode = "all" | "errors" | "warnings";

// =============================================================================
// Category Labels
// =============================================================================

const CATEGORY_LABELS: Record<ValidationCategory, string> = {
  structure: "Structure",
  config: "Configuration",
  data_flow: "Data Flow",
};

// =============================================================================
// Issue Row Component
// =============================================================================

interface IssueRowProps {
  issue: ValidationIssue;
  onClick?: () => void;
}

const IssueRow = memo(function IssueRow({ issue, onClick }: IssueRowProps) {
  const isError = issue.severity === "error";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-start gap-3 px-3 py-2 text-left text-sm",
        "hover:bg-muted/50 transition-colors",
        "border-l-2",
        isError ? "border-l-destructive" : "border-l-amber-500"
      )}
    >
      {isError ? (
        <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
      ) : (
        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
      )}

      <div className="flex-1 min-w-0">
        <p className={cn("font-medium", isError ? "text-destructive" : "text-amber-600")}>
          {issue.message}
        </p>
        {issue.suggestion && (
          <p className="text-xs text-muted-foreground mt-0.5">
            💡 {issue.suggestion}
          </p>
        )}
      </div>

      {issue.nodeId && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <ArrowRight className="h-3 w-3" />
          <span>Go to node</span>
        </div>
      )}
    </button>
  );
});

// =============================================================================
// Component
// =============================================================================

export const ProblemsPanel = memo(function ProblemsPanel({
  issues,
  onIssueClick,
  className,
}: ProblemsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");

  // Filter issues
  const filteredIssues = useMemo(() => {
    if (filterMode === "all") return issues;
    if (filterMode === "errors") return issues.filter((i) => i.severity === "error");
    return issues.filter((i) => i.severity === "warning");
  }, [issues, filterMode]);

  // Group by category
  const groupedIssues = useMemo(() => {
    const groups: Record<ValidationCategory, ValidationIssue[]> = {
      structure: [],
      config: [],
      data_flow: [],
    };

    for (const issue of filteredIssues) {
      groups[issue.category].push(issue);
    }

    return groups;
  }, [filteredIssues]);

  // Counts
  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;

  const handleIssueClick = useCallback(
    (issue: ValidationIssue) => {
      onIssueClick?.(issue);
    },
    [onIssueClick]
  );

  // Auto-expand when new errors appear
  // useEffect(() => {
  //   if (errorCount > 0 && !isExpanded) {
  //     setIsExpanded(true);
  //   }
  // }, [errorCount]);

  if (issues.length === 0) {
    return (
      <div
        className={cn(
          "border-t bg-muted/30 px-4 py-2 flex items-center gap-2",
          className
        )}
      >
        <span className="text-sm text-green-600 font-medium">
          ✓ No problems detected
        </span>
      </div>
    );
  }

  return (
    <div className={cn("border-t bg-background", className)}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-2 hover:bg-muted/50"
      >
        <div className="flex items-center gap-3">
          <span className="font-medium">Problems</span>
          {errorCount > 0 && (
            <Badge variant="destructive" className="h-5 px-1.5">
              {errorCount} error{errorCount !== 1 ? "s" : ""}
            </Badge>
          )}
          {warningCount > 0 && (
            <Badge
              variant="outline"
              className="h-5 px-1.5 text-amber-600 border-amber-500"
            >
              {warningCount} warning{warningCount !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="border-t">
          {/* Filter buttons */}
          <div className="flex items-center gap-1 px-4 py-2 border-b bg-muted/30">
            <Filter className="h-4 w-4 text-muted-foreground mr-1" />
            <Button
              variant={filterMode === "all" ? "secondary" : "ghost"}
              size="sm"
              className="h-6 text-xs"
              onClick={() => setFilterMode("all")}
            >
              All ({issues.length})
            </Button>
            <Button
              variant={filterMode === "errors" ? "secondary" : "ghost"}
              size="sm"
              className="h-6 text-xs"
              onClick={() => setFilterMode("errors")}
            >
              Errors ({errorCount})
            </Button>
            <Button
              variant={filterMode === "warnings" ? "secondary" : "ghost"}
              size="sm"
              className="h-6 text-xs"
              onClick={() => setFilterMode("warnings")}
            >
              Warnings ({warningCount})
            </Button>
          </div>

          {/* Issues list */}
          <div className="max-h-48 overflow-auto">
            {(Object.entries(groupedIssues) as [ValidationCategory, ValidationIssue[]][]).map(
              ([category, categoryIssues]) => {
                if (categoryIssues.length === 0) return null;

                return (
                  <div key={category}>
                    <div className="px-4 py-1.5 bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {CATEGORY_LABELS[category]}
                    </div>
                    {categoryIssues.map((issue) => (
                      <IssueRow
                        key={issue.id}
                        issue={issue}
                        onClick={() => handleIssueClick(issue)}
                      />
                    ))}
                  </div>
                );
              }
            )}
          </div>
        </div>
      )}
    </div>
  );
});
