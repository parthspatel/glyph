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
} from "@tanstack/react-table";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Project, ProjectStatus } from "../../api/projects";

interface ProjectTableProps {
  projects: Project[];
  rowSelection: RowSelectionState;
  onRowSelectionChange: (selection: RowSelectionState) => void;
  onProjectClick?: (project: Project) => void;
}

function StatusBadge({ status }: { status: ProjectStatus }) {
  const statusColors: Record<ProjectStatus, string> = {
    draft: "bg-muted text-muted-foreground",
    active: "bg-success/10 text-success",
    paused: "bg-warning/10 text-warning",
    completed: "bg-info/10 text-info",
    archived: "bg-muted text-muted-foreground",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize",
        statusColors[status],
      )}
    >
      {status}
    </span>
  );
}

const columns: ColumnDef<Project>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <input
        type="checkbox"
        checked={table.getIsAllRowsSelected()}
        ref={(el) => {
          if (el) el.indeterminate = table.getIsSomeRowsSelected();
        }}
        onChange={table.getToggleAllRowsSelectedHandler()}
        className="size-4 rounded border-input cursor-pointer accent-primary focus:ring-2 focus:ring-ring focus:ring-offset-2"
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        checked={row.getIsSelected()}
        onChange={row.getToggleSelectedHandler()}
        className="size-4 rounded border-input cursor-pointer accent-primary focus:ring-2 focus:ring-ring focus:ring-offset-2"
        onClick={(e) => e.stopPropagation()}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <Link
        to={`/projects/${row.original.project_id}`}
        className="font-medium text-foreground hover:text-primary hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {row.getValue("name")}
      </Link>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
  },
  {
    accessorKey: "task_count",
    header: "Tasks",
    cell: ({ row }) => {
      const total = row.original.task_count ?? 0;
      const completed = row.original.completed_task_count ?? 0;
      return (
        <span className="text-muted-foreground">
          {completed}/{total}
        </span>
      );
    },
  },
  {
    id: "progress",
    header: "Progress",
    cell: ({ row }) => {
      const total = row.original.task_count ?? 0;
      const completed = row.original.completed_task_count ?? 0;
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
      return <span className="text-muted-foreground">{pct}%</span>;
    },
    enableSorting: false,
  },
  {
    accessorKey: "created_at",
    header: "Created",
    cell: ({ getValue }) => {
      const date = new Date(getValue() as string);
      return (
        <span className="text-muted-foreground">
          {date.toLocaleDateString()}
        </span>
      );
    },
  },
  {
    accessorKey: "created_by",
    header: "Owner",
    cell: ({ getValue }) => (
      <span className="text-muted-foreground">{getValue() as string}</span>
    ),
    enableHiding: true,
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <div className="flex items-center justify-end">
        <Button
          variant="ghost"
          size="sm"
          asChild
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          <Link to={`/projects/${row.original.project_id}`}>View</Link>
        </Button>
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
      const newSelection =
        typeof updater === "function" ? updater(rowSelection) : updater;
      onRowSelectionChange(newSelection);
    },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.project_id,
    enableRowSelection: true,
  });

  return (
    <div className="overflow-x-auto">
      {/* Column visibility toggle */}
      <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
        <span className="font-medium">Columns:</span>
        {table
          .getAllColumns()
          .filter((col) => col.getCanHide())
          .map((col) => (
            <label
              key={col.id}
              className="flex items-center gap-1.5 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={col.getIsVisible()}
                onChange={col.getToggleVisibilityHandler()}
                className="size-4 rounded border-input cursor-pointer accent-primary"
              />
              {col.id}
            </label>
          ))}
      </div>

      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className={cn(
                    "px-4 py-3 text-left font-medium text-muted-foreground",
                    header.column.getCanSort() &&
                      "cursor-pointer hover:bg-muted transition-colors select-none",
                  )}
                  onClick={header.column.getToggleSortingHandler()}
                >
                  <div className="flex items-center gap-1">
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                    {header.column.getIsSorted() &&
                      (header.column.getIsSorted() === "asc" ? (
                        <ChevronUp className="size-4" />
                      ) : (
                        <ChevronDown className="size-4" />
                      ))}
                  </div>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.length === 0 ? (
            <tr>
              <td
                colSpan={table.getVisibleFlatColumns().length}
                className="text-center py-8 text-muted-foreground"
              >
                No projects found
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={cn(
                  "border-b border-border transition-colors cursor-pointer",
                  "even:bg-muted/30",
                  "hover:bg-muted/50",
                  row.getIsSelected() && "bg-primary/5",
                )}
                onClick={() => onProjectClick?.(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
