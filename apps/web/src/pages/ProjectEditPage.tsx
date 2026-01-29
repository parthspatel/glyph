/**
 * Project edit page.
 * Loads existing project and uses ProjectForm for editing.
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useProject, useUpdateProject } from '../hooks/useProjects';
import { ProjectForm, type ProjectFormData } from '../components/project/ProjectForm';

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
      console.error('Failed to update project:', error);
      // Error handling would show toast/notification
    }
  };

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="loading-state">Loading project...</div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="page-container">
        <div className="error-state">
          <h2>Project Not Found</h2>
          <p>The project you're looking for doesn't exist or you don't have access.</p>
          <button onClick={() => navigate('/projects')} className="btn btn-primary">
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <h1>Edit Project</h1>
        <p className="page-subtitle">
          {project.name}
        </p>
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
