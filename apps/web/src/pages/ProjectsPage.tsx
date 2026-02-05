/**
 * Projects list page with table, filtering, and bulk actions.
 */

import { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { RowSelectionState } from "@tanstack/react-table";
import { FolderKanban, Plus } from "lucide-react";
import { useProjects } from "../hooks/useProjects";
import {
  ProjectTable,
  ProjectFilters,
  BulkActions,
  useProjectFilters,
} from "../components/project";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProjectFilter, Project } from "../api/projects";

export function ProjectsPage() {
  const navigate = useNavigate();
  const { filter, setFilter } = useProjectFilters();
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const { data, isLoading, error } = useProjects(filter);

  const selectedIds = Object.keys(rowSelection).filter(
    (id) => rowSelection[id],
  );

  const handleFilterChange = useCallback(
    (newFilter: ProjectFilter) => {
      setFilter(newFilter);
      // Reset selection when filters change
      setRowSelection({});
    },
    [setFilter],
  );

  const handleProjectClick = (project: Project) => {
    navigate(`/projects/${project.project_id}`);
  };

  const handlePageChange = (newOffset: number) => {
    setFilter({ ...filter, offset: newOffset });
  };

  const pageSize = filter.limit ?? 20;
  const currentOffset = filter.offset ?? 0;
  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;
  const currentPage = Math.floor(currentOffset / pageSize);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FolderKanban className="size-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Projects</h1>
            <p className="text-muted-foreground">
              {data ? `${data.total} total projects` : "Loading..."}
            </p>
          </div>
        </div>
        <Button asChild>
          <Link to="/projects/new">
            <Plus className="size-4 mr-2" />
            New Project
          </Link>
        </Button>
      </header>

      {/* Filters */}
      <ProjectFilters filter={filter} onFilterChange={handleFilterChange} />

      {/* Error State */}
      {error && (
        <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-md p-4">
          Failed to load projects. Please try again.
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="bg-card rounded-lg border p-6 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {data && !isLoading && data.items.length === 0 && (
        <div className="bg-card rounded-lg border">
          <div className="text-center py-12 text-muted-foreground">
            <FolderKanban className="size-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium">No projects yet</p>
            <p className="text-sm mt-1">
              Get started by creating your first project
            </p>
            <Button asChild className="mt-4">
              <Link to="/projects/new">
                <Plus className="size-4 mr-2" />
                Create Project
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* Projects Table */}
      {data && !isLoading && data.items.length > 0 && (
        <div className="bg-card rounded-lg border overflow-hidden">
          <ProjectTable
            projects={data.items}
            rowSelection={rowSelection}
            onRowSelectionChange={setRowSelection}
            onProjectClick={handleProjectClick}
          />
        </div>
      )}

      {/* Pagination */}
      {data && data.total > pageSize && (
        <div className="flex items-center justify-between pt-4">
          <span className="text-sm text-muted-foreground">
            Showing {currentOffset + 1} -{" "}
            {Math.min(currentOffset + pageSize, data.total)} of {data.total}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                handlePageChange(Math.max(0, currentOffset - pageSize))
              }
              disabled={currentPage === 0}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              Page {currentPage + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentOffset + pageSize)}
              disabled={currentPage + 1 >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      <BulkActions
        selectedIds={selectedIds}
        onClearSelection={() => setRowSelection({})}
      />
    </div>
  );
}
