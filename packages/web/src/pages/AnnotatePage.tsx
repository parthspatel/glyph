import React from 'react';
import { useParams, Link } from 'react-router-dom';

export function AnnotatePage(): React.ReactElement {
  const { taskId } = useParams<{ taskId: string }>();

  return (
    <div className="container" style={{ padding: '2rem' }}>
      <h1>Annotate Task</h1>
      <p style={{ color: 'var(--color-text-muted)' }}>
        Task ID: {taskId}
      </p>
      <div className="card" style={{ marginTop: '1rem' }}>
        <p>Annotation interface will be rendered here based on the task's layout.</p>
      </div>
      <Link to="/projects" style={{ marginTop: '1rem', display: 'inline-block' }}>
        ← Back to Projects
      </Link>
    </div>
  );
}
