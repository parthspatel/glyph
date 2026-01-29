/**
 * Project creation page.
 * Uses ProjectForm with empty default values.
 */

import { useNavigate } from 'react-router-dom';
import { useCreateProject } from '../hooks/useProjects';
import { ProjectForm, type ProjectFormData } from '../components/project/ProjectForm';

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
      console.error('Failed to create project:', error);
      // Error handling would show toast/notification
    }
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <h1>Create Project</h1>
        <p className="page-subtitle">
          Set up a new annotation project
        </p>
      </header>

      <ProjectForm onSubmit={handleSubmit} />
    </div>
  );
}
