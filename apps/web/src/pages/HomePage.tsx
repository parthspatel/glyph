import React from 'react';
import { Link } from 'react-router-dom';

export function HomePage(): React.ReactElement {
  return (
    <div className="container" style={{ padding: '2rem' }}>
      <h1>Glyph</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
        AI Data Annotation Platform
      </p>
      <nav>
        <Link to="/projects" className="btn btn-primary">
          View Projects
        </Link>
      </nav>
    </div>
  );
}
