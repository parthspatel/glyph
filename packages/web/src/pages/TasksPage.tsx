import React from 'react';
import { useParams, Link } from 'react-router-dom';

export function TasksPage(): React.ReactElement {
  const { projectId } = useParams<{ projectId: string }>();

  return (
    <div className="container" style={{ padding: '2rem' }}>
      <h1>Tasks</h1>
      <p style={{ color: 'var(--color-text-muted)' }}>
        Project: {projectId}
      </p>
      <p>No tasks available.</p>
      <Link to="/projects" style={{ marginTop: '1rem', display: 'inline-block' }}>
        ← Back to Projects
      </Link>
    </div>
  );
}
