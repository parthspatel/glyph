/**
 * Project detail/overview page.
 * Shows project information, metrics, and allows status management.
 */

import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useProject, useCloneProject } from "../hooks/useProjects";
import { ProjectOverview } from "../components/project/ProjectOverview";
import { ProjectActivity } from "../components/project/ProjectActivity";
import { StatusTransitionDialog } from "../components/project/StatusTransitionDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  ChevronRight,
  Pencil,
  ListTodo,
  Copy,
} from "lucide-react";
import type { ProjectStatus } from "../api/projects";

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { data: project, isLoading, error } = useProject(projectId);
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
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Breadcrumb skeleton */}
        <Skeleton className="h-4 w-48" />

        {/* Layout skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <Skeleton className="h-96" />
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
      <div className="max-w-6xl mx-auto p-6">
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

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main content */}
        <main className="lg:col-span-3">
          <ProjectOverview
            project={project}
            onStatusChange={handleStatusChange}
          />
        </main>

        {/* Sidebar */}
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
