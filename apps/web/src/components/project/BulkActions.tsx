/**
 * Bulk actions bar for selected projects.
 * Appears at bottom of screen when projects are selected.
 */

import { useBulkUpdateProjectStatus, useBulkDeleteProjects } from '../../hooks/useProjects';
import type { ProjectStatus } from '../../api/projects';

interface BulkActionsProps {
  selectedIds: string[];
  onClearSelection: () => void;
}

export function BulkActions({ selectedIds, onClearSelection }: BulkActionsProps) {
  const bulkUpdateStatus = useBulkUpdateProjectStatus();
  const bulkDelete = useBulkDeleteProjects();

  if (selectedIds.length === 0) return null;

  const handleStatusChange = (status: ProjectStatus) => {
    bulkUpdateStatus.mutate(
      { projectIds: selectedIds, status },
      { onSuccess: () => onClearSelection() }
    );
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete ${selectedIds.length} project(s)? This action cannot be undone.`)) {
      bulkDelete.mutate(selectedIds, {
        onSuccess: () => onClearSelection(),
      });
    }
  };

  const isLoading = bulkUpdateStatus.isPending || bulkDelete.isPending;

  return (
    <div className="bulk-actions-bar">
      <div className="bulk-actions-content">
        <span className="bulk-actions-count">
          {selectedIds.length} selected
        </span>

        <div className="bulk-actions-buttons">
          <select
            className="bulk-action-select"
            onChange={(e) => {
              if (e.target.value) {
                handleStatusChange(e.target.value as ProjectStatus);
                e.target.value = '';
              }
            }}
            disabled={isLoading}
            defaultValue=""
          >
            <option value="" disabled>Change status...</option>
            <option value="active">Activate</option>
            <option value="paused">Pause</option>
            <option value="archived">Archive</option>
          </select>

          <button
            className="btn btn-danger btn-sm"
            onClick={handleDelete}
            disabled={isLoading}
          >
            {bulkDelete.isPending ? 'Deleting...' : 'Delete'}
          </button>

          <button
            className="btn btn-ghost btn-sm"
            onClick={onClearSelection}
            disabled={isLoading}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
