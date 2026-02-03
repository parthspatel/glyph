/**
 * Project activity feed component.
 * Displays recent events for a project with a timeline design.
 */

import { Link } from "react-router-dom";

interface ActivityEvent {
  id: string;
  action: string;
  actor_name: string;
  timestamp: string;
  changes?: Record<string, unknown>;
}

interface ProjectActivityProps {
  projectId: string;
}

function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function activityMessage(event: ActivityEvent): string {
  switch (event.action) {
    case "created":
      return "created the project";
    case "updated":
      return "updated project settings";
    case "status_changed":
      return `changed status to ${event.changes?.new_status ?? "unknown"}`;
    case "data_source_added":
      return "added a data source";
    case "data_source_removed":
      return "removed a data source";
    case "activated":
      return "activated the project";
    case "paused":
      return "paused the project";
    case "completed":
      return "marked project as complete";
    case "archived":
      return "archived the project";
    default:
      return event.action.replace(/_/g, " ");
  }
}

function ActivityIcon({ action }: { action: string }) {
  const icons: Record<string, string> = {
    created: "🎉",
    updated: "✏️",
    status_changed: "🔄",
    activated: "▶️",
    paused: "⏸️",
    completed: "✅",
    archived: "📦",
    data_source_added: "➕",
    data_source_removed: "➖",
  };
  return <span className="text-xs">{icons[action] ?? "📝"}</span>;
}

export function ProjectActivity({ projectId }: ProjectActivityProps) {
  // Placeholder data - would come from useProjectActivity hook
  const events: ActivityEvent[] = [
    {
      id: "1",
      action: "created",
      actor_name: "You",
      timestamp: new Date().toISOString(),
    },
  ];

  return (
    <section className="bg-card rounded-lg border p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-foreground">
          Recent Activity
        </h2>
        <Link
          to={`/audit?project_id=${projectId}`}
          className="text-xs text-primary hover:underline"
        >
          View all
        </Link>
      </div>

      {events.length > 0 ? (
        <ul className="relative space-y-0">
          {events.map((event, index) => (
            <li key={event.id} className="relative flex gap-3 py-2">
              {/* Timeline line */}
              {index < events.length - 1 && (
                <div className="absolute left-3 top-8 bottom-0 w-0.5 bg-border" />
              )}

              {/* Icon dot on timeline */}
              <div className="relative z-10 flex items-center justify-center size-6 rounded-full bg-muted border-2 border-background shrink-0">
                <ActivityIcon action={event.action} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground leading-tight">
                  <span className="font-medium">{event.actor_name}</span>{" "}
                  {activityMessage(event)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatRelativeTime(event.timestamp)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-center py-4 text-sm text-muted-foreground">
          No recent activity
        </p>
      )}
    </section>
  );
}
