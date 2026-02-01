import { Link } from "react-router-dom";
import type { TeamMember } from "../../hooks/useTeams";
import { Button } from "@/components/ui/button";

interface MemberListProps {
  members: TeamMember[];
  canManage: boolean;
  onRemove?: (userId: string) => void;
  onPromote?: (userId: string) => void;
  onDemote?: (userId: string) => void;
  isLoading?: boolean;
}

export function MemberList({
  members,
  canManage,
  onRemove,
  onPromote,
  onDemote,
  isLoading,
}: MemberListProps) {
  const leaders = members.filter((m) => m.role === "leader");
  const regularMembers = members.filter((m) => m.role === "member");

  if (members.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-4 text-center">
        No members yet
      </p>
    );
  }

  const renderMemberRow = (
    member: TeamMember,
    showPromote: boolean,
    showDemote: boolean,
  ) => (
    <div key={member.user_id} className="flex items-center justify-between p-3">
      <Link
        to={`/users/${member.user_id}`}
        className="flex items-center gap-3 min-w-0 flex-1 hover:opacity-80 transition-opacity"
      >
        <div className="size-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">
          {member.display_name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground truncate">
            {member.display_name}
          </p>
          <p className="text-sm text-muted-foreground truncate">
            {member.email}
          </p>
        </div>
      </Link>

      {canManage && (
        <div className="flex items-center gap-1">
          {showPromote && onPromote && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPromote(member.user_id)}
              disabled={isLoading}
            >
              Promote
            </Button>
          )}
          {showDemote && onDemote && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDemote(member.user_id)}
              disabled={isLoading}
            >
              Demote
            </Button>
          )}
          {onRemove && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(member.user_id)}
              disabled={isLoading}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              Remove
            </Button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {leaders.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Leaders ({leaders.length})
          </h4>
          <div className="bg-card rounded-lg border divide-y divide-border">
            {leaders.map((member) =>
              renderMemberRow(member, false, leaders.length > 1),
            )}
          </div>
        </div>
      )}

      {regularMembers.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Members ({regularMembers.length})
          </h4>
          <div className="bg-card rounded-lg border divide-y divide-border">
            {regularMembers.map((member) =>
              renderMemberRow(member, true, false),
            )}
          </div>
        </div>
      )}
    </div>
  );
}
