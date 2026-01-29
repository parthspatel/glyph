/**
 * Projects table with TanStack Table.
 * Supports sorting, row selection, and column visibility.
 */

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
  type VisibilityState,
} from '@tanstack/react-table';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Project, ProjectStatus } from '../../api/projects';

interface ProjectTableProps {
  projects: Project[];
  rowSelection: RowSelectionState;
  onRowSelectionChange: (selection: RowSelectionState) => void;
  onProjectClick?: (project: Project) => void;
}

function StatusBadge({ status }: { status: ProjectStatus }) {
  const styles: Record<ProjectStatus, string> = {
    draft: 'status-badge status-draft',
    active: 'status-badge status-active',
    paused: 'status-badge status-paused',
    completed: 'status-badge status-completed',
    archived: 'status-badge status-archived',
  };

  return <span className={styles[status]}>{status}</span>;
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="progress-container">
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      <span className="progress-text">{value}%</span>
    </div>
  );
}

const columns: ColumnDef<Project>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <input
        type="checkbox"
        checked={table.getIsAllRowsSelected()}
        ref={(el) => {
          if (el) el.indeterminate = table.getIsSomeRowsSelected();
        }}
        onChange={table.getToggleAllRowsSelectedHandler()}
        className="checkbox"
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        checked={row.getIsSelected()}
        onChange={row.getToggleSelectedHandler()}
        className="checkbox"
        onClick={(e) => e.stopPropagation()}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => (
      <Link
        to={`/projects/${row.original.project_id}`}
        className="project-name-link"
        onClick={(e) => e.stopPropagation()}
      >
        {row.getValue('name')}
      </Link>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.getValue('status')} />,
  },
  {
    accessorKey: 'task_count',
    header: 'Tasks',
    cell: ({ row }) => {
      const total = row.original.task_count ?? 0;
      const completed = row.original.completed_task_count ?? 0;
      return `${completed}/${total}`;
    },
  },
  {
    id: 'progress',
    header: 'Progress',
    cell: ({ row }) => {
      const total = row.original.task_count ?? 0;
      const completed = row.original.completed_task_count ?? 0;
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
      return <ProgressBar value={pct} />;
    },
    enableSorting: false,
  },
  {
    accessorKey: 'created_at',
    header: 'Created',
    cell: ({ getValue }) => {
      const date = new Date(getValue() as string);
      return date.toLocaleDateString();
    },
  },
  {
    accessorKey: 'created_by',
    header: 'Owner',
    enableHiding: true,
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <div className="row-actions">
        <Link
          to={`/projects/${row.original.project_id}`}
          className="btn btn-sm btn-ghost"
          onClick={(e) => e.stopPropagation()}
        >
          View
        </Link>
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
];

export function ProjectTable({
  projects,
  rowSelection,
  onRowSelectionChange,
  onProjectClick,
}: ProjectTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    created_by: false,
  });

  const table = useReactTable({
    data: projects,
    columns,
    state: { sorting, rowSelection, columnVisibility },
    onSortingChange: setSorting,
    onRowSelectionChange: (updater) => {
      const newSelection = typeof updater === 'function' ? updater(rowSelection) : updater;
      onRowSelectionChange(newSelection);
    },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.project_id,
    enableRowSelection: true,
  });

  return (
    <div className="table-wrapper">
      {/* Column visibility toggle */}
      <div className="table-toolbar">
        <div className="column-toggle">
          <span className="column-toggle-label">Columns:</span>
          {table.getAllColumns()
            .filter(col => col.getCanHide())
            .map(col => (
              <label key={col.id} className="column-toggle-item">
                <input
                  type="checkbox"
                  checked={col.getIsVisible()}
                  onChange={col.getToggleVisibilityHandler()}
                />
                {col.id}
              </label>
            ))}
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={header.column.getCanSort() ? 'sortable' : ''}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="th-content">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() && (
                        <span className="sort-indicator">
                          {header.column.getIsSorted() === 'asc' ? ' ↑' : ' ↓'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={table.getVisibleFlatColumns().length} className="empty-state">
                  No projects found
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="table-row clickable"
                  onClick={() => onProjectClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
