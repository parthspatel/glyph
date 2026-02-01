import { Link } from "react-router-dom";
import { useTeams, type TeamSummary } from "../hooks/useTeams";

export function TeamsPage() {
  const { data, isLoading, error } = useTeams({ rootOnly: true });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="space-y-4 animate-pulse">
          <div className="h-8 w-32 bg-muted rounded" />
          <div className="h-4 w-24 bg-muted rounded" />
          <div className="space-y-3">
            <div className="h-16 bg-muted rounded" />
            <div className="h-16 bg-muted rounded" />
            <div className="h-16 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-md p-4">
          Failed to load teams. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
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
