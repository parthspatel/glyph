import { Link } from 'react-router-dom';
import type { TeamMember } from '../../hooks/useTeams';

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
  const leaders = members.filter((m) => m.role === 'leader');
  const regularMembers = members.filter((m) => m.role === 'member');

  if (members.length === 0) {
    return <p className="text-muted">No members yet</p>;
  }

  const renderMemberRow = (member: TeamMember, showPromote: boolean, showDemote: boolean) => (
    <div key={member.user_id} className="member-row">
      <Link to={`/users/${member.user_id}`} className="member-info">
        <div className="member-avatar">
          {member.display_name.charAt(0).toUpperCase()}
        </div>
        <div className="member-details">
          <p className="member-name">{member.display_name}</p>
          <p className="member-email">{member.email}</p>
        </div>
      </Link>

      {canManage && (
        <div className="member-actions">
          {showPromote && onPromote && (
            <button
              onClick={() => onPromote(member.user_id)}
              disabled={isLoading}
              className="btn btn-link btn-sm"
            >
              Promote
            </button>
          )}
          {showDemote && onDemote && (
            <button
              onClick={() => onDemote(member.user_id)}
              disabled={isLoading}
              className="btn btn-link btn-sm text-muted"
            >
              Demote
            </button>
          )}
          {onRemove && (
            <button
              onClick={() => onRemove(member.user_id)}
              disabled={isLoading}
              className="btn btn-link btn-sm text-danger"
            >
              Remove
            </button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="member-list">
      {leaders.length > 0 && (
        <div className="member-group">
          <h4 className="member-group-title">Leaders ({leaders.length})</h4>
          <div className="member-group-list">
            {leaders.map((member) => renderMemberRow(member, false, leaders.length > 1))}
          </div>
        </div>
      )}

      {regularMembers.length > 0 && (
        <div className="member-group">
          <h4 className="member-group-title">Members ({regularMembers.length})</h4>
          <div className="member-group-list">
            {regularMembers.map((member) => renderMemberRow(member, true, false))}
          </div>
        </div>
      )}
    </div>
  );
}
