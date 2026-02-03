/**
 * Project overview component.
 * Displays all key project information in scrollable sections.
 */

import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Project, ProjectStatus } from "../../api/projects";

interface ProjectOverviewProps {
  project: Project;
  onStatusChange?: (status: ProjectStatus) => void;
}

function StatusBadge({ status }: { status: ProjectStatus }) {
  const statusColors: Record<ProjectStatus, string> = {
    draft: "bg-muted text-muted-foreground",
    active: "bg-success/10 text-success",
    paused: "bg-warning/10 text-warning",
    completed: "bg-info/10 text-info",
    archived: "bg-muted text-muted-foreground",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium capitalize",
        statusColors[status],
      )}
    >
      {status}
    </span>
  );
}

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  className?: string;
}

function MetricCard({ label, value, icon, className }: MetricCardProps) {
  return (
    <div className={cn("bg-card rounded-lg border p-4", className)}>
      <div className="text-2xl mb-1">{icon}</div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

export function ProjectOverview({
  project,
  onStatusChange,
}: ProjectOverviewProps) {
  const completionPct =
    project.task_count && project.task_count > 0
      ? Math.round(
          ((project.completed_task_count ?? 0) / project.task_count) * 100,
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* Header with status */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
          {project.description && (
            <p className="text-muted-foreground">{project.description}</p>
          )}
        </div>
        <StatusBadge status={project.status} />
      </div>

      {/* Key metrics with semantic border accents */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Tasks"
          value={project.task_count ?? 0}
          icon={<span>📋</span>}
          className="border-l-4 border-l-primary"
        />
        <MetricCard
          label="Completion"
          value={`${completionPct}%`}
          icon={<span>✓</span>}
          className="border-l-4 border-l-success"
        />
        <MetricCard
          label="Active"
          value={project.status === "active" ? "Yes" : "No"}
          icon={<span>⚡</span>}
          className="border-l-4 border-l-info"
        />
        <MetricCard
          label="Data Sources"
          value={0}
          icon={<span>📁</span>}
          className="border-l-4 border-l-warning"
        />
      </div>

      {/* Configuration summary */}
      <section className="bg-card rounded-lg border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Configuration
        </h2>
        <dl className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <dt className="text-sm text-muted-foreground">Project Type</dt>
            <dd className="text-sm font-medium text-foreground">
              {project.project_type_id ?? "Not set"}
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="text-sm text-muted-foreground">Owner</dt>
            <dd className="text-sm font-medium text-foreground">
              {project.created_by}
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="text-sm text-muted-foreground">Created</dt>
            <dd className="text-sm font-medium text-foreground">
              {new Date(project.created_at).toLocaleDateString()}
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="text-sm text-muted-foreground">Updated</dt>
            <dd className="text-sm font-medium text-foreground">
              {new Date(project.updated_at).toLocaleDateString()}
            </dd>
          </div>
        </dl>
      </section>

      {/* Status actions */}
      {onStatusChange && (
        <section className="bg-card rounded-lg border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Status Actions
          </h2>
          <div className="flex flex-wrap gap-3">
            {project.status === "draft" && (
              <Button onClick={() => onStatusChange("active")}>
                Activate Project
              </Button>
            )}
            {project.status === "active" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => onStatusChange("paused")}
                >
                  Pause
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onStatusChange("completed")}
                >
                  Mark Complete
                </Button>
              </>
            )}
            {project.status === "paused" && (
              <>
                <Button onClick={() => onStatusChange("active")}>Resume</Button>
                <Button
                  variant="ghost"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => onStatusChange("archived")}
                >
                  Archive
                </Button>
              </>
            )}
            {project.status === "completed" && (
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => onStatusChange("archived")}
              >
                Archive
              </Button>
            )}
          </div>
        </section>
      )}

      {/* Edit link */}
      <div className="pt-4">
        <Button variant="outline" asChild>
          <Link to={`/projects/${project.project_id}/edit`}>
            Edit Project Settings
          </Link>
        </Button>
      </div>
    </div>
  );
}
