import React from 'react';
import { Link } from 'react-router-dom';

export function ProjectsPage(): React.ReactElement {
  return (
    <div className="container" style={{ padding: '2rem' }}>
      <h1>Projects</h1>
      <p style={{ color: 'var(--color-text-muted)' }}>
        No projects yet. Create one to get started.
      </p>
      <Link to="/" style={{ marginTop: '1rem', display: 'inline-block' }}>
        ← Back to Home
      </Link>
    </div>
  );
}
