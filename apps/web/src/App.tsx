import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Pages
import { HomePage } from './pages/HomePage';
import { ProjectsPage } from './pages/ProjectsPage';
import { TasksPage } from './pages/TasksPage';
import { AnnotatePage } from './pages/AnnotatePage';

export function App(): React.ReactElement {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:projectId/tasks" element={<TasksPage />} />
        <Route path="/annotate/:taskId" element={<AnnotatePage />} />
      </Routes>
    </div>
  );
}
