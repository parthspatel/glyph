import { Link } from "react-router-dom";
import { Users } from "lucide-react";
import { useTeams, type TeamSummary } from "../hooks/useTeams";
import { Skeleton } from "@/components/ui/skeleton";

export function TeamsPage() {
  const { data, isLoading, error } = useTeams({ rootOnly: true });

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        {/* List skeleton */}
        <div className="bg-card rounded-lg border divide-y divide-border">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-4 flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-64" />
              </div>
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-md p-4">
          Failed to load teams. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <header className="flex items-center gap-3">
        <Users className="size-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Teams</h1>
          <p className="text-muted-foreground">
            {data?.total || 0} teams total
          </p>
        </div>
      </header>

      {data?.items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No teams found
        </div>
      ) : (
        <div className="bg-card rounded-lg border divide-y divide-border">
          {data?.items.map((team: TeamSummary) => (
            <Link
              key={team.team_id}
              to={`/teams/${team.team_id}`}
              className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-foreground">{team.name}</h3>
                {team.description && (
                  <p className="text-sm text-muted-foreground mt-1 truncate">
                    {team.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground ml-4">
                <span>{team.member_count} members</span>
                {team.sub_team_count > 0 && (
                  <span>{team.sub_team_count} sub-teams</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
