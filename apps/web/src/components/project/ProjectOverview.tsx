/**
 * Project overview component.
 * Displays all key project information in scrollable sections.
 */

import { Link } from "react-router-dom";
import type { Project, ProjectStatus } from "../../api/projects";

interface ProjectOverviewProps {
  project: Project;
  onStatusChange?: (status: ProjectStatus) => void;
}

function StatusBadge({ status }: { status: ProjectStatus }) {
  const styles: Record<ProjectStatus, string> = {
    draft: "status-badge status-draft",
    active: "status-badge status-active",
    paused: "status-badge status-paused",
    completed: "status-badge status-completed",
    archived: "status-badge status-archived",
  };

  return <span className={styles[status]}>{status}</span>;
}

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="metric-card">
      <div className="metric-header">
        {icon}
        <span className="metric-label">{label}</span>
      </div>
      <p className="metric-value">{value}</p>
    </div>
  );
}

// SchemaPreview can be used when project type data includes schemas
// function SchemaPreview({ schema }: { schema?: object | null }) {
//   if (!schema || Object.keys(schema).length === 0) {
//     return <span className="text-gray-400 text-sm">Not configured</span>;
//   }
//   const preview = JSON.stringify(schema, null, 2);
//   const truncated = preview.length > 200 ? preview.slice(0, 200) + '...' : preview;
//   return <pre className="schema-preview"><code>{truncated}</code></pre>;
// }

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
    <div className="project-overview">
      {/* Header with status and actions */}
      <div className="project-header">
        <div className="project-title-section">
          <h1 className="project-title">{project.name}</h1>
          {project.description && (
            <p className="project-description">{project.description}</p>
          )}
        </div>
        <div className="project-header-actions">
          <StatusBadge status={project.status} />
        </div>
      </div>

      {/* Key metrics */}
      <div className="metrics-grid">
        <MetricCard
          label="Tasks"
          value={project.task_count ?? 0}
          icon={<span className="metric-icon">📋</span>}
        />
        <MetricCard
          label="Completion"
          value={`${completionPct}%`}
          icon={<span className="metric-icon">✓</span>}
        />
        <MetricCard
          label="Active"
          value={project.status === "active" ? "Yes" : "No"}
          icon={<span className="metric-icon">⚡</span>}
        />
        <MetricCard
          label="Data Sources"
          value={0}
          icon={<span className="metric-icon">📁</span>}
        />
      </div>

      {/* Configuration summary */}
      <section className="overview-section">
        <h2 className="section-title">Configuration</h2>
        <dl className="config-grid">
          <div className="config-item">
            <dt className="config-label">Project Type</dt>
            <dd className="config-value">
              {project.project_type_id ?? "Not set"}
            </dd>
          </div>
          <div className="config-item">
            <dt className="config-label">Owner</dt>
            <dd className="config-value">{project.created_by}</dd>
          </div>
          <div className="config-item">
            <dt className="config-label">Created</dt>
            <dd className="config-value">
              {new Date(project.created_at).toLocaleDateString()}
            </dd>
          </div>
          <div className="config-item">
            <dt className="config-label">Updated</dt>
            <dd className="config-value">
              {new Date(project.updated_at).toLocaleDateString()}
            </dd>
          </div>
        </dl>
      </section>

      {/* Status actions */}
      {onStatusChange && (
        <section className="overview-section">
          <h2 className="section-title">Status Actions</h2>
          <div className="status-actions">
            {project.status === "draft" && (
              <button
                onClick={() => onStatusChange("active")}
                className="btn btn-primary"
              >
                Activate Project
              </button>
            )}
            {project.status === "active" && (
              <>
                <button
                  onClick={() => onStatusChange("paused")}
                  className="btn btn-outline"
                >
                  Pause
                </button>
                <button
                  onClick={() => onStatusChange("completed")}
                  className="btn btn-outline"
                >
                  Mark Complete
                </button>
              </>
            )}
            {project.status === "paused" && (
              <>
                <button
                  onClick={() => onStatusChange("active")}
                  className="btn btn-primary"
                >
                  Resume
                </button>
                <button
                  onClick={() => onStatusChange("archived")}
                  className="btn btn-ghost text-red-600"
                >
                  Archive
                </button>
              </>
            )}
            {project.status === "completed" && (
              <button
                onClick={() => onStatusChange("archived")}
                className="btn btn-ghost text-red-600"
              >
                Archive
              </button>
            )}
          </div>
        </section>
      )}

      {/* Edit link */}
      <div className="overview-actions">
        <Link
          to={`/projects/${project.project_id}/edit`}
          className="btn btn-outline"
        >
          Edit Project Settings
        </Link>
      </div>
    </div>
  );
}
