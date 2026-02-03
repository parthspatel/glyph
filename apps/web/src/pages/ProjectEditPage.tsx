/**
 * Project edit page.
 * Loads existing project and uses ProjectForm for editing.
 */

import { useParams, useNavigate } from "react-router-dom";
import { AlertCircle, Pencil } from "lucide-react";
import { useProject, useUpdateProject } from "../hooks/useProjects";
import {
  ProjectForm,
  type ProjectFormData,
} from "../components/project/ProjectForm";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export function ProjectEditPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { data: project, isLoading, error } = useProject(projectId);
  const updateProject = useUpdateProject();

  const handleSubmit = async (data: ProjectFormData) => {
    if (!projectId) return;

    try {
      await updateProject.mutateAsync({
        id: projectId,
        data: {
          name: data.name,
          description: data.description,
          project_type_id: data.project_type_id,
        },
      });
      navigate(`/projects/${projectId}`);
    } catch (error) {
      console.error("Failed to update project:", error);
      // Error handling would show toast/notification
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded" />
          <div>
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64 mt-1" />
          </div>
        </div>

        {/* Form skeleton */}
        <div className="bg-card rounded-lg border p-6 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-32 mt-4" />
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="bg-card rounded-lg border p-8 text-center">
          <AlertCircle className="size-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">
            Project Not Found
          </h2>
          <p className="text-muted-foreground mt-2">
            The project you're looking for doesn't exist or you don't have
            access.
          </p>
          <Button onClick={() => navigate("/projects")} className="mt-4">
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <header className="flex items-center gap-3">
        <Pencil className="size-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Edit Project</h1>
          <p className="text-muted-foreground">{project.name}</p>
        </div>
      </header>

      <ProjectForm
        defaultValues={{
          project_id: project.project_id,
          name: project.name,
          description: project.description ?? undefined,
          project_type_id: project.project_type_id ?? undefined,
          status: project.status,
        }}
        onSubmit={handleSubmit}
        isEdit
      />
    </div>
  );
}
