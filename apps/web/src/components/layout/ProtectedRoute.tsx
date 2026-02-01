import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useUser";
import { Skeleton } from "@/components/ui/skeleton";

interface ProtectedRouteProps {
  requiredRoles?: string[];
  redirectPath?: string;
  children?: React.ReactNode;
}

export function ProtectedRoute({
  requiredRoles,
  redirectPath = "/",
  children,
}: ProtectedRouteProps) {
  const location = useLocation();
  const { data: user, isLoading, error } = useCurrentUser();

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="space-y-4 w-full max-w-md">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    );
  }

  // Not authenticated - redirect to login (or home for now)
  // Store intended destination in location state for post-login redirect
  if (error || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role requirements
  if (requiredRoles && requiredRoles.length > 0) {
    const hasRequiredRole = requiredRoles.includes(user.global_role);
    if (!hasRequiredRole) {
      // User is authenticated but lacks permission
      return <Navigate to={redirectPath} replace />;
    }
  }

  // Authorized - render children or Outlet for nested routes
  return children ? <>{children}</> : <Outlet />;
}
