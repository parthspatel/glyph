/**
 * Project activity feed component.
 * Displays recent events for a project.
 */

import { Link } from 'react-router-dom';

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

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function activityMessage(event: ActivityEvent): string {
  switch (event.action) {
    case 'created':
      return 'created the project';
    case 'updated':
      return 'updated project settings';
    case 'status_changed':
      return `changed status to ${event.changes?.new_status ?? 'unknown'}`;
    case 'data_source_added':
      return 'added a data source';
    case 'data_source_removed':
      return 'removed a data source';
    case 'activated':
      return 'activated the project';
    case 'paused':
      return 'paused the project';
    case 'completed':
      return 'marked project as complete';
    case 'archived':
      return 'archived the project';
    default:
      return event.action.replace(/_/g, ' ');
  }
}

function ActivityIcon({ action }: { action: string }) {
  const icons: Record<string, string> = {
    created: '🎉',
    updated: '✏️',
    status_changed: '🔄',
    activated: '▶️',
    paused: '⏸️',
    completed: '✅',
    archived: '📦',
    data_source_added: '➕',
    data_source_removed: '➖',
  };
  return <span className="activity-icon">{icons[action] ?? '📝'}</span>;
}

export function ProjectActivity({ projectId }: ProjectActivityProps) {
  // Placeholder data - would come from useProjectActivity hook
  const events: ActivityEvent[] = [
    {
      id: '1',
      action: 'created',
      actor_name: 'You',
      timestamp: new Date().toISOString(),
    },
  ];

  return (
    <section className="activity-section">
      <div className="activity-header">
        <h2 className="section-title">Recent Activity</h2>
        <Link
          to={`/audit?project_id=${projectId}`}
          className="activity-view-all"
        >
          View all
        </Link>
      </div>

      {events.length > 0 ? (
        <ul className="activity-list">
          {events.map((event) => (
            <li key={event.id} className="activity-item">
              <div className="activity-icon-wrapper">
                <ActivityIcon action={event.action} />
              </div>
              <div className="activity-content">
                <p className="activity-message">
                  <span className="activity-actor">{event.actor_name}</span>
                  {' '}{activityMessage(event)}
                </p>
                <p className="activity-time">
                  {formatRelativeTime(event.timestamp)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="activity-empty">No recent activity</p>
      )}
    </section>
  );
}
