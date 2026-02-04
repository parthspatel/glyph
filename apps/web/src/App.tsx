import { Routes, Route } from "react-router-dom";

// Layout
import { AppLayout, ProtectedRoute } from "./components/layout";

// Pages
import { HomePage } from "./pages/HomePage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { ProjectCreatePage } from "./pages/ProjectCreatePage";
import { ProjectEditPage } from "./pages/ProjectEditPage";
import { ProjectDetailPage } from "./pages/ProjectDetailPage";
import { TasksPage } from "./pages/TasksPage";
import { AnnotatePage } from "./pages/AnnotatePage";
import { UserProfilePage } from "./pages/UserProfilePage";
import { AdminUsersPage } from "./pages/admin/UsersPage";
import { ProjectTypesPage } from "./pages/admin/ProjectTypesPage";
import { LayoutPreviewPage } from "./pages/admin/layouts";
import { TeamsPage } from "./pages/TeamsPage";
import { TeamDetailPage } from "./pages/TeamDetailPage";
import { QueuePage } from "./pages/QueuePage";
import { TaskDetailPage } from "./pages/TaskDetailPage";
import { ReviewPage } from "./pages/ReviewPage";
import { AdjudicatePage } from "./pages/AdjudicatePage";

export function App() {
  return (
    <Routes>
      {/* Dev test route - no auth required */}
      <Route path="/dev/layout-preview" element={<LayoutPreviewPage />} />

      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/queue" element={<QueuePage />} />
        <Route path="/tasks/:taskId" element={<TaskDetailPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/new" element={<ProjectCreatePage />} />
        <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
        <Route path="/projects/:projectId/edit" element={<ProjectEditPage />} />
        <Route path="/projects/:projectId/tasks" element={<TasksPage />} />
        <Route path="/annotate/:taskId" element={<AnnotatePage />} />
        <Route path="/review/:taskId" element={<ReviewPage />} />
        <Route path="/adjudicate/:taskId" element={<AdjudicatePage />} />
        <Route path="/users/:userId" element={<UserProfilePage />} />
        <Route path="/teams" element={<TeamsPage />} />
        <Route path="/teams/:teamId" element={<TeamDetailPage />} />

        {/* Admin-only routes */}
        <Route element={<ProtectedRoute requiredRoles={["admin"]} />}>
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/project-types" element={<ProjectTypesPage />} />
          <Route
            path="/admin/layouts/:layoutId"
            element={<LayoutPreviewPage />}
          />
          <Route
            path="/admin/layouts/:layoutId/versions/:versionId"
            element={<LayoutPreviewPage />}
          />
        </Route>
      </Route>
    </Routes>
  );
}
