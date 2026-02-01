import { Navigate } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useUser";
import { Skeleton } from "@/components/ui/skeleton";

export function HomePage() {
  const { data: user, isLoading } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="space-y-6">
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's an overview of your annotation platform.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-6">
          <h3 className="font-semibold">Projects</h3>
          <p className="text-2xl font-bold">--</p>
          <p className="text-sm text-muted-foreground">Active projects</p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <h3 className="font-semibold">Users</h3>
          <p className="text-2xl font-bold">--</p>
          <p className="text-sm text-muted-foreground">Team members</p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <h3 className="font-semibold">Tasks</h3>
          <p className="text-2xl font-bold">--</p>
          <p className="text-sm text-muted-foreground">Pending reviews</p>
        </div>
      </div>
    </div>
  );
}
