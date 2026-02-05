/**
 * WorkflowModule - displays workflow preview and navigates to workflow designer.
 */

import { useNavigate } from "react-router-dom";
import { GitBranch } from "lucide-react";
import { ModuleCard } from "./ModuleCard";

export interface WorkflowModuleProps {
  projectId: string;
  hasWorkflow: boolean;
  stepCount?: number;
  workflowName?: string;
}

export function WorkflowModule({
  projectId,
  hasWorkflow,
  stepCount,
  workflowName,
}: WorkflowModuleProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/projects/${projectId}/workflow`);
  };

  // Build preview content
  let preview: React.ReactNode = null;
  if (hasWorkflow) {
    preview = (
      <div className="space-y-2">
        <span>
          {workflowName || `${stepCount || 0} steps configured`}
        </span>
        {/* Mini visual representation */}
        {stepCount && stepCount > 0 && (
          <div className="flex items-center gap-1 mt-2">
            {Array.from({ length: Math.min(stepCount, 3) }).map((_, i) => (
              <div key={i} className="flex items-center">
                <div className="w-6 h-4 rounded border bg-muted" />
                {i < Math.min(stepCount, 3) - 1 && (
                  <div className="w-3 h-0.5 bg-border" />
                )}
              </div>
            ))}
            {stepCount > 3 && (
              <span className="text-xs text-muted-foreground ml-1">
                +{stepCount - 3}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <ModuleCard
      title="Workflow"
      icon={<GitBranch />}
      status={hasWorkflow ? "configured" : "unconfigured"}
      preview={preview}
      emptyText="No workflow designed"
      emptyAction="Create Workflow"
      onClick={handleClick}
    />
  );
}
