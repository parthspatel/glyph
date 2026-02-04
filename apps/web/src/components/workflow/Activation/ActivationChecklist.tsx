/**
 * ActivationChecklist - Modal showing project activation validation status.
 */
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Rocket, XCircle, AlertTriangle, CheckCircle } from "lucide-react";
import { ChecklistItem } from "./ChecklistItem";
import { useActivationValidation, type CheckCategory } from "./useActivationValidation";

// =============================================================================
// Types
// =============================================================================

interface ActivationChecklistProps {
  projectId: string;
  projectName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActivate: () => Promise<void>;
  onNavigate: (section: string) => void;
}

// =============================================================================
// Category Labels
// =============================================================================

const categoryLabels: Record<CheckCategory, string> = {
  workflow: "Workflow",
  data_source: "Data Source",
  layouts: "Layouts",
  permissions: "Permissions",
};

const categoryIcons: Record<CheckCategory, React.ReactNode> = {
  workflow: <Rocket className="h-4 w-4" />,
  data_source: <CheckCircle className="h-4 w-4" />,
  layouts: <CheckCircle className="h-4 w-4" />,
  permissions: <CheckCircle className="h-4 w-4" />,
};

// =============================================================================
// Component
// =============================================================================

export function ActivationChecklist({
  projectId,
  projectName,
  open,
  onOpenChange,
  onActivate,
  onNavigate,
}: ActivationChecklistProps) {
  const {
    groupedChecks,
    canActivate,
    isLoading,
    error,
    blockerCount,
    warningCount,
    passedCount,
  } = useActivationValidation(projectId);

  // Handle fix navigation
  const handleFix = useCallback(
    (fixAction: string) => {
      onNavigate(fixAction);
      onOpenChange(false);
    },
    [onNavigate, onOpenChange]
  );

  // Handle activate
  const handleActivate = useCallback(async () => {
    await onActivate();
    onOpenChange(false);
  }, [onActivate, onOpenChange]);

  // Render category section
  const renderCategory = (category: CheckCategory) => {
    const checks = groupedChecks[category];
    if (checks.length === 0) return null;

    return (
      <div key={category} className="space-y-2">
        <div className="flex items-center gap-2">
          {categoryIcons[category]}
          <h4 className="text-sm font-medium">{categoryLabels[category]}</h4>
        </div>
        <div className="space-y-2 ml-6">
          {checks.map((check) => (
            <ChecklistItem key={check.id} check={check} onFix={handleFix} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            Activate Project
          </DialogTitle>
          <DialogDescription>
            Review the checklist below before activating <strong>{projectName}</strong>
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-8 text-destructive">
            <XCircle className="mr-2 h-5 w-5" />
            {error}
          </div>
        ) : (
          <>
            {/* Summary badges */}
            <div className="flex items-center gap-2">
              {blockerCount > 0 && (
                <Badge variant="destructive">
                  <XCircle className="mr-1 h-3 w-3" />
                  {blockerCount} blocker{blockerCount !== 1 ? "s" : ""}
                </Badge>
              )}
              {warningCount > 0 && (
                <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                  <AlertTriangle className="mr-1 h-3 w-3" />
                  {warningCount} warning{warningCount !== 1 ? "s" : ""}
                </Badge>
              )}
              {passedCount > 0 && (
                <Badge variant="outline" className="border-green-500 text-green-600">
                  <CheckCircle className="mr-1 h-3 w-3" />
                  {passedCount} passed
                </Badge>
              )}
            </div>

            {/* Checklist */}
            <ScrollArea className="max-h-[400px] pr-4">
              <div className="space-y-6">
                {(["workflow", "data_source", "layouts", "permissions"] as CheckCategory[]).map(
                  renderCategory
                )}
              </div>
            </ScrollArea>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleActivate}
            disabled={!canActivate || isLoading}
          >
            {canActivate ? (
              <>
                <Rocket className="mr-2 h-4 w-4" />
                Activate Project
              </>
            ) : (
              <>
                <XCircle className="mr-2 h-4 w-4" />
                Fix Blockers First
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
