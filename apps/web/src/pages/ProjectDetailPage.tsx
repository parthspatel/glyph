/**
 * Project detail/overview page.
 * Shows project information, metrics, and allows status management.
 */

import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useProject, useCloneProject } from '../hooks/useProjects';
import { ProjectOverview } from '../components/project/ProjectOverview';
import { ProjectActivity } from '../components/project/ProjectActivity';
import { StatusTransitionDialog } from '../components/project/StatusTransitionDialog';
import type { ProjectStatus } from '../api/projects';

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
      console.error('Failed to clone project:', err);
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
          <Link to="/projects" className="btn btn-primary">
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Breadcrumb */}
      <nav className="breadcrumb">
        <Link to="/projects">Projects</Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">{project.name}</span>
      </nav>

      <div className="project-detail-layout">
        {/* Main content */}
        <main className="project-detail-main">
          <ProjectOverview
            project={project}
            onStatusChange={handleStatusChange}
          />
        </main>

        {/* Sidebar */}
        <aside className="project-detail-sidebar">
          {/* Quick actions */}
          <section className="sidebar-section">
            <h2 className="sidebar-title">Actions</h2>
            <div className="sidebar-actions">
              <Link
                to={`/projects/${projectId}/edit`}
                className="btn btn-outline w-full"
              >
                ✏️ Edit Project
              </Link>

              <Link
                to={`/projects/${projectId}/tasks`}
                className="btn btn-outline w-full"
              >
                📋 View Tasks
              </Link>

              <button
                onClick={handleClone}
                disabled={cloneProject.isPending}
                className="btn btn-outline w-full"
              >
                {cloneProject.isPending ? 'Cloning...' : '📄 Clone Project'}
              </button>
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
