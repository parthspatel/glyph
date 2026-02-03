/**
 * Project creation page.
 * Uses ProjectForm with empty default values.
 */

import { useNavigate } from "react-router-dom";
import { FolderPlus } from "lucide-react";
import { useCreateProject } from "../hooks/useProjects";
import {
  ProjectForm,
  type ProjectFormData,
} from "../components/project/ProjectForm";

export function ProjectCreatePage() {
  const navigate = useNavigate();
  const createProject = useCreateProject();

  const handleSubmit = async (data: ProjectFormData) => {
    try {
      const project = await createProject.mutateAsync({
        name: data.name,
        description: data.description,
        project_type_id: data.project_type_id,
      });
      navigate(`/projects/${project.project_id}`);
    } catch (error) {
      console.error("Failed to create project:", error);
      // Error handling would show toast/notification
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <header className="flex items-center gap-3">
        <FolderPlus className="size-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Create Project</h1>
          <p className="text-muted-foreground">
            Set up a new annotation project
          </p>
        </div>
      </header>

      <ProjectForm onSubmit={handleSubmit} />
    </div>
  );
}
