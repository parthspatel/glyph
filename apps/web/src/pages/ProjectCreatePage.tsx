/**
 * Project creation page.
 * Uses simplified 3-field form for fast project creation.
 * Full configuration happens on the project overview page via module chips.
 */

import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useCreateProject } from "../hooks/useProjects";
import {
  SimpleProjectForm,
  type SimpleProjectFormData,
} from "../components/project/SimpleProjectForm";

export function ProjectCreatePage() {
  const navigate = useNavigate();
  const createProject = useCreateProject();

  const handleSubmit = async (data: SimpleProjectFormData) => {
    try {
      const project = await createProject.mutateAsync({
        name: data.name,
        description: data.description,
        // Tags will be stored in project metadata in a future iteration
      });

      // Navigate to project overview (not edit page)
      navigate(`/projects/${project.project_id}`);

      // Show success toast with guidance
      toast.success("Project created!", {
        description: "Configure your project using the modules below.",
      });
    } catch (error) {
      console.error("Failed to create project:", error);
      toast.error("Failed to create project", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-foreground">Create Project</h1>
        <p className="text-muted-foreground mt-1">
          Start with the basics. You can configure details after creation.
        </p>
      </header>

      <SimpleProjectForm
        onSubmit={handleSubmit}
        isSubmitting={createProject.isPending}
      />
    </div>
  );
}
