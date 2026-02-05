/**
 * Project detail/overview page.
 * Shows project information with module grid for configuration.
 */

import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useProject, useCloneProject } from "../hooks/useProjects";
import {
  ProjectModuleGrid,
  ProjectModuleGridSkeleton,
} from "../components/project/ProjectModuleGrid";
import { ProjectActivity } from "../components/project/ProjectActivity";
import { StatusTransitionDialog } from "../components/project/StatusTransitionDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  ChevronRight,
  Pencil,
  ListTodo,
  Copy,
  Play,
  Pause,
  CheckCircle,
  Archive,
} from "lucide-react";
import type { ProjectStatus } from "../api/projects";

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

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { data: project, isLoading, error, refetch } = useProject(projectId);
  const cloneProject = useCloneProject();

  const [statusDialog, setStatusDialog] = useState<{
    open: boolean;
    targetStatus: ProjectStatus | null;
  }>({ open: false, targetStatus: null });

  const handleStatusChange = (status: ProjectStatus) => {
    setStatusDialog({ open: true, targetStatus: status });
  };

  const handleClone = async () => {
    if (!projectId) return;
    try {
      const cloned = await cloneProject.mutateAsync({
        id: projectId,
        options: {
          include_data_sources: true,
          include_settings: true,
        },
      });
      navigate(`/projects/${cloned.project_id}`);
    } catch (err) {
      console.error("Failed to clone project:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Breadcrumb skeleton */}
        <Skeleton className="h-4 w-48" />

        {/* Header skeleton */}
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>

        {/* Layout skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <div>
              <Skeleton className="h-6 w-32 mb-4" />
              <ProjectModuleGridSkeleton />
            </div>
            <div>
              <Skeleton className="h-6 w-24 mb-4" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-card rounded-lg border p-8 text-center">
          <AlertCircle className="size-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">
            Project Not Found
          </h2>
          <p className="text-muted-foreground mt-2">
            The project you're looking for doesn't exist or you don't have
            access.
          </p>
          <Button asChild className="mt-4">
            <Link to="/projects">Back to Projects</Link>
          </Button>
        </div>
      </div>
    );
  }

  const completionPct =
    project.task_count && project.task_count > 0
      ? Math.round(
          ((project.completed_task_count ?? 0) / project.task_count) * 100,
        )
      : 0;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm">
        <Link
          to="/projects"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Projects
        </Link>
        <ChevronRight className="size-4 text-muted-foreground" />
        <span className="text-foreground font-medium">{project.name}</span>
      </nav>

      {/* Header with status */}
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
          {project.description && (
            <p className="text-muted-foreground">{project.description}</p>
          )}
        </div>
        <StatusBadge status={project.status} />
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main content - takes 3 columns on large screens */}
        <main className="lg:col-span-3 space-y-6">
          {/* Configuration modules */}
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Configuration
            </h2>
            <ProjectModuleGrid project={project} onProjectUpdate={refetch} />
          </section>

          {/* Progress metrics */}
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Progress
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-card rounded-lg border p-4 border-l-4 border-l-primary">
                <p className="text-2xl font-bold text-foreground">
                  {project.task_count ?? 0}
                </p>
                <p className="text-sm text-muted-foreground">Total Tasks</p>
              </div>
              <div className="bg-card rounded-lg border p-4 border-l-4 border-l-success">
                <p className="text-2xl font-bold text-foreground">
                  {completionPct}%
                </p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
              <div className="bg-card rounded-lg border p-4 border-l-4 border-l-info">
                <p className="text-2xl font-bold text-foreground">
                  {project.completed_task_count ?? 0}
                </p>
                <p className="text-sm text-muted-foreground">Tasks Done</p>
              </div>
              <div className="bg-card rounded-lg border p-4 border-l-4 border-l-warning">
                <p className="text-2xl font-bold text-foreground">
                  {(project.task_count ?? 0) -
                    (project.completed_task_count ?? 0)}
                </p>
                <p className="text-sm text-muted-foreground">Remaining</p>
              </div>
            </div>
          </section>

          {/* Status actions */}
          <section className="bg-card rounded-lg border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Status Actions
            </h2>
            <div className="flex flex-wrap gap-3">
              {project.status === "draft" && (
                <Button onClick={() => handleStatusChange("active")}>
                  <Play className="size-4 mr-2" />
                  Activate Project
                </Button>
              )}
              {project.status === "active" && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => handleStatusChange("paused")}
                  >
                    <Pause className="size-4 mr-2" />
                    Pause
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleStatusChange("completed")}
                  >
                    <CheckCircle className="size-4 mr-2" />
                    Mark Complete
                  </Button>
                </>
              )}
              {project.status === "paused" && (
                <>
                  <Button onClick={() => handleStatusChange("active")}>
                    <Play className="size-4 mr-2" />
                    Resume
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleStatusChange("archived")}
                  >
                    <Archive className="size-4 mr-2" />
                    Archive
                  </Button>
                </>
              )}
              {project.status === "completed" && (
                <Button
                  variant="ghost"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleStatusChange("archived")}
                >
                  <Archive className="size-4 mr-2" />
                  Archive
                </Button>
              )}
              {project.status === "archived" && (
                <p className="text-sm text-muted-foreground">
                  This project has been archived.
                </p>
              )}
            </div>
          </section>
        </main>

        {/* Sidebar - 1 column */}
        <aside className="space-y-6">
          {/* Quick actions */}
          <section className="bg-card rounded-lg border p-4">
            <h2 className="text-sm font-semibold text-foreground mb-3">
              Actions
            </h2>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                asChild
              >
                <Link to={`/projects/${projectId}/edit`}>
                  <Pencil className="size-4 mr-2" />
                  Edit Project
                </Link>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start"
                asChild
              >
                <Link to={`/projects/${projectId}/tasks`}>
                  <ListTodo className="size-4 mr-2" />
                  View Tasks
                </Link>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleClone}
                disabled={cloneProject.isPending}
              >
                <Copy className="size-4 mr-2" />
                {cloneProject.isPending ? "Cloning..." : "Clone Project"}
              </Button>
            </div>
          </section>

          {/* Activity feed */}
          <ProjectActivity projectId={projectId!} />
        </aside>
      </div>

      {/* Status transition dialog */}
      {statusDialog.targetStatus && (
        <StatusTransitionDialog
          project={project}
          open={statusDialog.open}
          onOpenChange={(open) => setStatusDialog({ ...statusDialog, open })}
          targetStatus={statusDialog.targetStatus}
        />
      )}
    </div>
  );
}
