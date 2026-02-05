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
import { ChevronUp, ChevronDown, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Project, ProjectStatus } from "../../api/projects";

interface ProjectTableProps {
  projects: Project[];
  rowSelection: RowSelectionState;
  onRowSelectionChange: (selection: RowSelectionState) => void;
  onProjectClick?: (project: Project) => void;
}

function StatusBadge({ status }: { status: ProjectStatus }) {
  const statusConfig: Record<
    ProjectStatus,
    { bg: string; text: string; dot: string }
  > = {
    draft: {
      bg: "bg-slate-100 dark:bg-slate-800",
      text: "text-slate-600 dark:text-slate-400",
      dot: "bg-slate-400",
    },
    active: {
      bg: "bg-emerald-50 dark:bg-emerald-950",
      text: "text-emerald-700 dark:text-emerald-400",
      dot: "bg-emerald-500",
    },
    paused: {
      bg: "bg-amber-50 dark:bg-amber-950",
      text: "text-amber-700 dark:text-amber-400",
      dot: "bg-amber-500",
    },
    completed: {
      bg: "bg-blue-50 dark:bg-blue-950",
      text: "text-blue-700 dark:text-blue-400",
      dot: "bg-blue-500",
    },
    archived: {
      bg: "bg-gray-100 dark:bg-gray-800",
      text: "text-gray-500 dark:text-gray-500",
      dot: "bg-gray-400",
    },
  };

  const config = statusConfig[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium capitalize",
        config.bg,
        config.text,
      )}
    >
      <span className={cn("size-1.5 rounded-full", config.dot)} />
      {status}
    </span>
  );
}

function ProgressBar({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            pct === 100
              ? "bg-emerald-500"
              : pct > 0
                ? "bg-primary"
                : "bg-transparent",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground w-8 text-right">
        {pct}%
      </span>
    </div>
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
      return <ProgressBar completed={completed} total={total} />;
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

  const hiddenColumnCount = table
    .getAllColumns()
    .filter((col) => col.getCanHide() && !col.getIsVisible()).length;

  return (
    <div className="overflow-x-auto">
      {/* Table header with column visibility dropdown */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <span className="text-sm text-muted-foreground">
          {projects.length} project{projects.length !== 1 ? "s" : ""}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Settings2 className="size-4" />
              Columns
              {hiddenColumnCount > 0 && (
                <span className="ml-1 size-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center">
                  {hiddenColumnCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {table
              .getAllColumns()
              .filter((col) => col.getCanHide())
              .map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.id}
                  checked={col.getIsVisible()}
                  onCheckedChange={(value) => col.toggleVisibility(!!value)}
                  className="capitalize"
                >
                  {col.id.replace(/_/g, " ")}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
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
