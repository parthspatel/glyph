import { Navigate } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useUser";
import { Skeleton } from "@/components/ui/skeleton";

export function HomePage() {
  const { data: user, isLoading } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-4 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  // Role-based redirects
  switch (user?.global_role) {
    case "admin":
      // Admin stays on dashboard (this page becomes the dashboard)
      return <AdminDashboard />;
    case "team_lead":
      return <Navigate to="/teams" replace />;
    case "annotator":
    case "user":
    default:
      return <Navigate to="/projects" replace />;
  }
}

// Simple admin dashboard placeholder
function AdminDashboard() {
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's an overview of your annotation platform.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-card rounded-lg border p-4 border-l-4 border-l-primary hover:shadow-md transition-shadow">
          <h3 className="font-semibold text-foreground">Projects</h3>
          <p className="text-2xl font-bold text-foreground">--</p>
          <p className="text-sm text-muted-foreground">Active projects</p>
        </div>
        <div className="bg-card rounded-lg border p-4 border-l-4 border-l-info hover:shadow-md transition-shadow">
          <h3 className="font-semibold text-foreground">Users</h3>
          <p className="text-2xl font-bold text-foreground">--</p>
          <p className="text-sm text-muted-foreground">Team members</p>
        </div>
        <div className="bg-card rounded-lg border p-4 border-l-4 border-l-success hover:shadow-md transition-shadow">
          <h3 className="font-semibold text-foreground">Tasks</h3>
          <p className="text-2xl font-bold text-foreground">--</p>
          <p className="text-sm text-muted-foreground">Pending reviews</p>
        </div>
      </div>
    </div>
  );
}
