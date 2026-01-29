/**
 * Projects list page with table, filtering, and bulk actions.
 */

import { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { RowSelectionState } from "@tanstack/react-table";
import { useProjects } from "../hooks/useProjects";
import {
  ProjectTable,
  ProjectFilters,
  BulkActions,
  useProjectFilters,
} from "../components/project";
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
    <div className="page-container">
      {/* Header */}
      <header className="page-header">
        <div>
          <h1>Projects</h1>
          <p className="page-subtitle">
            {data ? `${data.total} total projects` : "Loading..."}
          </p>
        </div>
        <Link to="/projects/new" className="btn btn-primary">
          + New Project
        </Link>
      </header>

      {/* Filters */}
      <ProjectFilters filter={filter} onFilterChange={handleFilterChange} />

      {/* Error State */}
      {error && (
        <div className="error-banner">
          Failed to load projects. Please try again.
        </div>
      )}

      {/* Loading State */}
      {isLoading && <div className="loading-state">Loading projects...</div>}

      {/* Projects Table */}
      {data && !isLoading && (
        <div className="table-card">
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
        <div className="pagination">
          <span className="pagination-info">
            Showing {currentOffset + 1} -{" "}
            {Math.min(currentOffset + pageSize, data.total)} of {data.total}
          </span>
          <div className="pagination-buttons">
            <button
              onClick={() =>
                handlePageChange(Math.max(0, currentOffset - pageSize))
              }
              disabled={currentPage === 0}
              className="btn btn-outline btn-sm"
            >
              Previous
            </button>
            <span className="pagination-page">
              Page {currentPage + 1} of {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentOffset + pageSize)}
              disabled={currentPage + 1 >= totalPages}
              className="btn btn-outline btn-sm"
            >
              Next
            </button>
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
