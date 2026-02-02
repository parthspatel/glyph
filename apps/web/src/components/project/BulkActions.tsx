/**
 * Bulk actions bar for selected projects.
 * Appears at bottom of screen when projects are selected.
 */

import {
  useBulkUpdateProjectStatus,
  useBulkDeleteProjects,
} from "../../hooks/useProjects";
import { Button } from "@/components/ui/button";
import type { ProjectStatus } from "../../api/projects";

interface BulkActionsProps {
  selectedIds: string[];
  onClearSelection: () => void;
}

export function BulkActions({
  selectedIds,
  onClearSelection,
}: BulkActionsProps) {
  const bulkUpdateStatus = useBulkUpdateProjectStatus();
  const bulkDelete = useBulkDeleteProjects();

  if (selectedIds.length === 0) return null;

  const handleStatusChange = (status: ProjectStatus) => {
    bulkUpdateStatus.mutate(
      { projectIds: selectedIds, status },
      { onSuccess: () => onClearSelection() },
    );
  };

  const handleDelete = () => {
    if (
      confirm(
        `Are you sure you want to delete ${selectedIds.length} project(s)? This action cannot be undone.`,
      )
    ) {
      bulkDelete.mutate(selectedIds, {
        onSuccess: () => onClearSelection(),
      });
    }
  };

  const isLoading = bulkUpdateStatus.isPending || bulkDelete.isPending;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg z-40 animate-in slide-in-from-bottom-2">
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">
          {selectedIds.length} selected
        </span>

        <div className="flex items-center gap-3">
          <select
            className="px-3 py-1.5 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
            onChange={(e) => {
              if (e.target.value) {
                handleStatusChange(e.target.value as ProjectStatus);
                e.target.value = "";
              }
            }}
            disabled={isLoading}
            defaultValue=""
          >
            <option value="" disabled>
              Change status...
            </option>
            <option value="active">Activate</option>
            <option value="paused">Pause</option>
            <option value="archived">Archive</option>
          </select>

          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={isLoading}
          >
            {bulkDelete.isPending ? "Deleting..." : "Delete"}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            disabled={isLoading}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
