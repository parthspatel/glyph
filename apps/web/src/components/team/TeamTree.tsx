import { Link } from 'react-router-dom';
import type { TeamTreeNode } from '../../hooks/useTeams';

interface TeamTreeProps {
  nodes: TeamTreeNode[];
  currentTeamId?: string;
}

export function TeamTree({ nodes, currentTeamId }: TeamTreeProps) {
  if (nodes.length === 0) {
    return <p className="text-muted">No teams found</p>;
  }

  return (
    <div className="team-tree">
      {nodes.map((node) => (
        <div
          key={node.team_id}
          style={{ paddingLeft: `${node.depth * 24}px` }}
          className={`team-tree-node ${node.team_id === currentTeamId ? 'current' : ''}`}
        >
          <Link to={`/teams/${node.team_id}`} className="team-tree-link">
            <div className="team-tree-content">
              {node.depth > 0 && <span className="tree-connector">└</span>}
              <div className="team-tree-info">
                <span className="team-name">{node.name}</span>
                {node.description && <span className="team-description">{node.description}</span>}
              </div>
            </div>
            <div className="team-tree-meta">
              <span>
                {node.member_count} member{node.member_count !== 1 ? 's' : ''}
              </span>
              {node.sub_team_count > 0 && (
                <span>
                  {node.sub_team_count} sub-team{node.sub_team_count !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </Link>
        </div>
      ))}
    </div>
  );
}
