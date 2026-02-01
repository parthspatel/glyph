import { Link } from "react-router-dom";
import type { TeamTreeNode } from "../../hooks/useTeams";
import { cn } from "@/lib/utils";

interface TeamTreeProps {
  nodes: TeamTreeNode[];
  currentTeamId?: string;
}

export function TeamTree({ nodes, currentTeamId }: TeamTreeProps) {
  if (nodes.length === 0) {
    return <p className="text-muted-foreground text-sm py-2">No teams found</p>;
  }

  return (
    <div className="space-y-1">
      {nodes.map((node) => (
        <div
          key={node.team_id}
          className={cn(
            "rounded-md transition-colors",
            node.team_id === currentTeamId
              ? "bg-muted" // Neutral highlight for active navigation state (per user decision)
              : "hover:bg-muted/50",
          )}
        >
          <Link
            to={`/teams/${node.team_id}`}
            className={cn(
              "flex items-center justify-between p-2",
              node.team_id === currentTeamId && "font-semibold",
            )}
          >
            <div className="flex items-center gap-2">
              {node.depth > 0 && (
                <span
                  className="text-muted-foreground"
                  style={{ marginLeft: `${(node.depth - 1) * 16}px` }}
                >
                  └
                </span>
              )}
              <div className="min-w-0 flex-1">
                <span
                  className={cn(
                    "text-foreground",
                    node.team_id === currentTeamId && "font-semibold",
                  )}
                >
                  {node.name}
                </span>
                {node.description && (
                  <span className="text-xs text-muted-foreground truncate ml-2">
                    {node.description}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>
                {node.member_count} member{node.member_count !== 1 ? "s" : ""}
              </span>
              {node.sub_team_count > 0 && (
                <span>
                  {node.sub_team_count} sub-team
                  {node.sub_team_count !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </Link>
        </div>
      ))}
    </div>
  );
}
