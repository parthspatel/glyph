/**
 * Project form checklist sidebar.
 * Shows completion status and activation requirements.
 */

import { Check, Circle, CheckCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionStatus {
  basic: boolean;
  projectType: boolean;
  schema: boolean;
  dataSources: boolean;
  skills: boolean;
}

interface ProjectChecklistProps {
  sectionStatus: SectionStatus;
  onSectionClick: (section: string) => void;
  projectId?: string;
}

const SECTION_LABELS: Record<keyof SectionStatus, string> = {
  basic: "Basic Information",
  projectType: "Project Type",
  schema: "Schema",
  dataSources: "Data Sources",
  skills: "Skill Requirements",
};

export function ProjectChecklist({
  sectionStatus,
  onSectionClick,
  projectId,
}: ProjectChecklistProps) {
  const completedCount = Object.values(sectionStatus).filter(Boolean).length;
  const totalCount = Object.keys(sectionStatus).length;
  const completionPercent = Math.round((completedCount / totalCount) * 100);

  // Activation requirements (required to start accepting tasks)
  const activationRequirements = [
    {
      key: "schema",
      label: "Output schema defined",
      met: sectionStatus.schema,
    },
    {
      key: "dataSources",
      label: "At least one data source",
      met: sectionStatus.dataSources,
    },
  ];

  const canActivate = activationRequirements.every((r) => r.met) && projectId;

  return (
    <aside className="w-64 shrink-0">
      <div className="sticky top-6 space-y-4">
        {/* Progress Summary */}
        <div className="bg-card rounded-lg border p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Completion
          </h3>
          <div className="space-y-2">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <span className="text-sm text-muted-foreground text-right block">
              {completedCount}/{totalCount}
            </span>
          </div>
        </div>

        {/* Section Checklist */}
        <div className="bg-card rounded-lg border p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Sections
          </h3>
          <ul className="space-y-1">
            {(
              Object.entries(sectionStatus) as [keyof SectionStatus, boolean][]
            ).map(([key, complete]) => (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => onSectionClick(key)}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left transition-colors hover:bg-muted",
                    complete ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {complete ? (
                    <Check className="size-4 shrink-0 text-success" />
                  ) : (
                    <Circle className="size-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="truncate">{SECTION_LABELS[key]}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Activation Requirements */}
        <div className="bg-card rounded-lg border p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Activation Requirements
          </h3>
          <ul className="space-y-1">
            {activationRequirements.map((req) => (
              <li key={req.key}>
                <div
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 text-sm",
                    req.met ? "text-success" : "text-muted-foreground",
                  )}
                >
                  {req.met ? (
                    <Check className="size-4 shrink-0" />
                  ) : (
                    <X className="size-4 shrink-0" />
                  )}
                  <span className="truncate">{req.label}</span>
                  {!req.met && (
                    <button
                      type="button"
                      onClick={() => onSectionClick(req.key)}
                      className="ml-auto text-xs text-primary hover:underline"
                    >
                      Go
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {canActivate ? (
            <p className="text-sm text-success font-medium flex items-center gap-1.5 mt-3">
              <CheckCircle className="size-4" />
              Ready to activate!
            </p>
          ) : !projectId ? (
            <p className="text-xs text-muted-foreground mt-3">
              Save the project first, then add a data source to activate.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-3">
              Complete required items to activate project.
            </p>
          )}
        </div>

        {/* Help Text */}
        <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
          <p>
            <strong className="font-medium text-foreground">Tip:</strong> Use{" "}
            <kbd className="px-1.5 py-0.5 bg-background rounded border text-xs font-mono">
              Cmd+S
            </kbd>{" "}
            to save changes.
          </p>
        </div>
      </div>
    </aside>
  );
}
