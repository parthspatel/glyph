import { Link } from 'react-router-dom';
import { useTeams, type TeamSummary } from '../hooks/useTeams';

export function TeamsPage() {
  const { data, isLoading, error } = useTeams({ rootOnly: true });

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="loading-skeleton">
          <div className="skeleton-text skeleton-text-lg" />
          <div className="skeleton-block" />
          <div className="skeleton-block" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="error-banner">Failed to load teams. Please try again.</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1>Teams</h1>
          <p className="page-subtitle">{data?.total || 0} teams total</p>
        </div>
      </header>

      {data?.items.length === 0 ? (
        <div className="empty-state">No teams found</div>
      ) : (
        <div className="card">
          <div className="team-list">
            {data?.items.map((team: TeamSummary) => (
              <Link key={team.team_id} to={`/teams/${team.team_id}`} className="team-list-item">
                <div className="team-list-info">
                  <h3 className="team-list-name">{team.name}</h3>
                  {team.description && (
                    <p className="team-list-description">{team.description}</p>
                  )}
                </div>
                <div className="team-list-meta">
                  <span>{team.member_count} members</span>
                  {team.sub_team_count > 0 && <span>{team.sub_team_count} sub-teams</span>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
