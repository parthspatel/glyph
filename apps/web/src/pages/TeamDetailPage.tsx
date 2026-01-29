import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  useTeam,
  useTeamTree,
  useTeamMembers,
  useAddTeamMember,
  useRemoveTeamMember,
  useUpdateTeamMember,
} from '../hooks/useTeams';
import { useCurrentUser } from '../hooks/useUser';
import { TeamTree, MemberList, AddMemberModal } from '../components/team';

export function TeamDetailPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const [showAddMember, setShowAddMember] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: team, isLoading: teamLoading } = useTeam(teamId!);
  const { data: treeData } = useTeamTree(teamId!);
  const { data: membersData, isLoading: membersLoading } = useTeamMembers(teamId!);
  const { data: currentUser } = useCurrentUser();

  const addMember = useAddTeamMember(teamId!);
  const removeMember = useRemoveTeamMember(teamId!);
  const updateMember = useUpdateTeamMember(teamId!);

  // Check if current user can manage this team
  const canManage =
    currentUser?.global_role === 'admin' ||
    membersData?.items.some(
      (m) => m.user_id === currentUser?.user_id && m.role === 'leader'
    );

  const handleAddMember = async (data: { user_id: string; role: string }) => {
    setError(null);
    try {
      await addMember.mutateAsync(data);
      setShowAddMember(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add member');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    setError(null);
    if (!confirm('Are you sure you want to remove this member?')) return;
    try {
      await removeMember.mutateAsync(userId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  const handlePromote = async (userId: string) => {
    setError(null);
    try {
      await updateMember.mutateAsync({ userId, role: 'leader' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to promote member');
    }
  };

  const handleDemote = async (userId: string) => {
    setError(null);
    try {
      await updateMember.mutateAsync({ userId, role: 'member' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to demote member');
    }
  };

  if (teamLoading) {
    return (
      <div className="page-container">
        <div className="loading-skeleton">
          <div className="skeleton-text skeleton-text-lg" />
          <div className="skeleton-text skeleton-text-md" />
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="page-container">
        <div className="error-banner">Team not found</div>
      </div>
    );
  }

  const existingMemberIds = membersData?.items.map((m) => m.user_id) || [];

  return (
    <div className="page-container">
      {/* Breadcrumb */}
      <nav className="breadcrumb">
        <Link to="/teams">Teams</Link>
        <span className="breadcrumb-separator">/</span>
        <span>{team.name}</span>
      </nav>

      {/* Header */}
      <header className="team-header">
        <div className="team-title-row">
          <h1>{team.name}</h1>
          <span className={`status-badge status-${team.status}`}>{team.status}</span>
        </div>
        {team.description && <p className="team-description">{team.description}</p>}
        {team.parent_team_id && (
          <p className="team-parent">
            Parent team:{' '}
            <Link to={`/teams/${team.parent_team_id}`}>View parent</Link>
          </p>
        )}
      </header>

      {/* Error display */}
      {error && (
        <div className="error-banner">
          {error}
          <button onClick={() => setError(null)} className="btn btn-link">
            Dismiss
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card stat-primary">
          <p className="stat-value">{team.member_count}</p>
          <p className="stat-label">Members</p>
        </div>
        <div className="stat-card stat-info">
          <p className="stat-value">{team.leader_count}</p>
          <p className="stat-label">Leaders</p>
        </div>
        <div className="stat-card stat-success">
          <p className="stat-value">{team.sub_teams.length}</p>
          <p className="stat-label">Sub-teams</p>
        </div>
        {team.capacity && (
          <div className="stat-card stat-warning">
            <p className="stat-value">{team.capacity}</p>
            <p className="stat-label">Capacity</p>
          </div>
        )}
      </div>

      {/* Members Section */}
      <section className="section">
        <div className="section-header">
          <h2>Members</h2>
          {canManage && (
            <button onClick={() => setShowAddMember(true)} className="btn btn-primary btn-sm">
              Add Member
            </button>
          )}
        </div>

        {membersLoading ? (
          <div className="loading-skeleton">
            <div className="skeleton-block" />
            <div className="skeleton-block" />
          </div>
        ) : (
          <div className="card">
            <MemberList
              members={membersData?.items || []}
              canManage={canManage || false}
              onRemove={handleRemoveMember}
              onPromote={handlePromote}
              onDemote={handleDemote}
              isLoading={removeMember.isPending || updateMember.isPending}
            />
          </div>
        )}
      </section>

      {/* Sub-teams / Tree Section */}
      {(team.sub_teams.length > 0 || (treeData?.items?.length ?? 0) > 1) && (
        <section className="section">
          <h2>Team Hierarchy</h2>
          <div className="card">
            {treeData && <TeamTree nodes={treeData.items} currentTeamId={teamId} />}
          </div>
        </section>
      )}

      {/* Specializations */}
      {team.specializations.length > 0 && (
        <section className="section">
          <h2>Specializations</h2>
          <div className="tag-list">
            {team.specializations.map((spec, i) => (
              <span key={i} className="tag">
                {spec}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Add Member Modal */}
      {showAddMember && (
        <AddMemberModal
          onAdd={handleAddMember}
          onClose={() => setShowAddMember(false)}
          isLoading={addMember.isPending}
          existingMemberIds={existingMemberIds}
        />
      )}
    </div>
  );
}
