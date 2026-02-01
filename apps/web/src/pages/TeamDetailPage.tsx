import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  useTeam,
  useTeamTree,
  useTeamMembers,
  useAddTeamMember,
  useRemoveTeamMember,
  useUpdateTeamMember,
} from "../hooks/useTeams";
import { useCurrentUser } from "../hooks/useUser";
import { TeamTree, MemberList, AddMemberModal } from "../components/team";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function TeamDetailPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const [showAddMember, setShowAddMember] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: team, isLoading: teamLoading } = useTeam(teamId!);
  const { data: treeData } = useTeamTree(teamId!);
  const { data: membersData, isLoading: membersLoading } = useTeamMembers(
    teamId!,
  );
  const { data: currentUser } = useCurrentUser();

  const addMember = useAddTeamMember(teamId!);
  const removeMember = useRemoveTeamMember(teamId!);
  const updateMember = useUpdateTeamMember(teamId!);

  // Check if current user can manage this team
  const canManage =
    currentUser?.global_role === "admin" ||
    membersData?.items.some(
      (m) => m.user_id === currentUser?.user_id && m.role === "leader",
    );

  const handleAddMember = async (data: { user_id: string; role: string }) => {
    setError(null);
    try {
      await addMember.mutateAsync(data);
      setShowAddMember(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add member");
    }
  };

  const handleRemoveMember = async (userId: string) => {
    setError(null);
    if (!confirm("Are you sure you want to remove this member?")) return;
    try {
      await removeMember.mutateAsync(userId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    }
  };

  const handlePromote = async (userId: string) => {
    setError(null);
    try {
      await updateMember.mutateAsync({ userId, role: "leader" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to promote member");
    }
  };

  const handleDemote = async (userId: string) => {
    setError(null);
    try {
      await updateMember.mutateAsync({ userId, role: "member" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to demote member");
    }
  };

  if (teamLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="space-y-4 animate-pulse">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-4 w-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-md p-4">
          Team not found
        </div>
      </div>
    );
  }

  const existingMemberIds = membersData?.items.map((m) => m.user_id) || [];

  const statusColors: Record<string, string> = {
    active: "bg-success/10 text-success border-success/20",
    inactive: "bg-muted text-muted-foreground border-border",
    archived: "bg-warning/10 text-warning border-warning/20",
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm">
        <Link
          to="/teams"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Teams
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-foreground">{team.name}</span>
      </nav>

      {/* Header */}
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">{team.name}</h1>
          <span
            className={cn(
              "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
              statusColors[team.status] || statusColors.inactive,
            )}
          >
            {team.status}
          </span>
        </div>
        {team.description && (
          <p className="text-muted-foreground mt-2">{team.description}</p>
        )}
        {team.parent_team_id && (
          <p className="text-sm text-muted-foreground">
            Parent team:{" "}
            <Link
              to={`/teams/${team.parent_team_id}`}
              className="text-primary hover:underline"
            >
              View parent
            </Link>
          </p>
        )}
      </header>

      {/* Error display */}
      {error && (
        <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-md p-4 flex items-center justify-between">
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={() => setError(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg border p-4 border-l-4 border-l-primary">
          <p className="text-2xl font-bold text-foreground">
            {team.member_count}
          </p>
          <p className="text-sm text-muted-foreground">Members</p>
        </div>
        <div className="bg-card rounded-lg border p-4 border-l-4 border-l-info">
          <p className="text-2xl font-bold text-foreground">
            {team.leader_count}
          </p>
          <p className="text-sm text-muted-foreground">Leaders</p>
        </div>
        <div className="bg-card rounded-lg border p-4 border-l-4 border-l-success">
          <p className="text-2xl font-bold text-foreground">
            {team.sub_teams.length}
          </p>
          <p className="text-sm text-muted-foreground">Sub-teams</p>
        </div>
        {team.capacity && (
          <div className="bg-card rounded-lg border p-4 border-l-4 border-l-warning">
            <p className="text-2xl font-bold text-foreground">
              {team.capacity}
            </p>
            <p className="text-sm text-muted-foreground">Capacity</p>
          </div>
        )}
      </div>

      {/* Members Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Members</h2>
          {canManage && (
            <Button size="sm" onClick={() => setShowAddMember(true)}>
              Add Member
            </Button>
          )}
        </div>

        {membersLoading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-16 bg-muted rounded" />
            <div className="h-16 bg-muted rounded" />
          </div>
        ) : (
          <div className="bg-card rounded-lg border p-4">
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
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            Team Hierarchy
          </h2>
          <div className="bg-card rounded-lg border p-4">
            {treeData && (
              <TeamTree nodes={treeData.items} currentTeamId={teamId} />
            )}
          </div>
        </section>
      )}

      {/* Specializations */}
      {team.specializations.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            Specializations
          </h2>
          <div className="flex flex-wrap gap-2">
            {team.specializations.map((spec, i) => (
              <span
                key={i}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs bg-muted text-muted-foreground"
              >
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
