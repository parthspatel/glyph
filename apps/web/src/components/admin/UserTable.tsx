import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
} from "@tanstack/react-table";
import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import type { UserSummary } from "../../hooks/useUsers";
import { cn } from "@/lib/utils";

interface UserTableProps {
  users: UserSummary[];
  rowSelection: RowSelectionState;
  onRowSelectionChange: (selection: RowSelectionState) => void;
  onUserClick: (user: UserSummary) => void;
}

const roleColors: Record<string, string> = {
  admin: "bg-primary/10 text-primary",
  manager: "bg-info/10 text-info",
  annotator: "bg-muted text-muted-foreground",
  user: "bg-muted text-muted-foreground",
};

const statusColors: Record<string, string> = {
  active: "bg-success/10 text-success",
  inactive: "bg-muted text-muted-foreground",
  suspended: "bg-destructive/10 text-destructive",
};

const columns: ColumnDef<UserSummary>[] = [
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
        className={cn(
          "size-4 rounded border-input cursor-pointer",
          "accent-primary",
          "focus:ring-2 focus:ring-ring focus:ring-offset-2",
        )}
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        checked={row.getIsSelected()}
        onChange={row.getToggleSelectedHandler()}
        className={cn(
          "size-4 rounded border-input cursor-pointer",
          "accent-primary",
          "focus:ring-2 focus:ring-ring focus:ring-offset-2",
        )}
        onClick={(e) => e.stopPropagation()}
      />
    ),
    enableSorting: false,
  },
  {
    accessorKey: "display_name",
    header: "Name",
    cell: ({ row }) => (
      <div className="flex items-baseline gap-1">
        <span className="font-medium text-foreground">
          {row.original.display_name}
        </span>
        {row.original.department && (
          <span className="text-muted-foreground text-xs">
            ({row.original.department})
          </span>
        )}
      </div>
    ),
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ getValue }) => (
      <span className="text-muted-foreground">{getValue() as string}</span>
    ),
  },
  {
    accessorKey: "global_role",
    header: "Role",
    cell: ({ getValue }) => {
      const role = getValue() as string;
      return (
        <span
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize",
            roleColors[role] || roleColors.user,
          )}
        >
          {role}
        </span>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ getValue }) => {
      const status = getValue() as string;
      return (
        <span
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize",
            statusColors[status] || statusColors.inactive,
          )}
        >
          {status}
        </span>
      );
    },
  },
];

export function UserTable({
  users,
  rowSelection,
  onRowSelectionChange,
  onUserClick,
}: UserTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data: users,
    columns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: (updater) => {
      const newSelection =
        typeof updater === "function" ? updater(rowSelection) : updater;
      onRowSelectionChange(newSelection);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.user_id,
    enableRowSelection: true,
  });

  return (
    <div className="overflow-x-auto">
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
                    {header.column.getIsSorted() && (
                      <span className="text-foreground">
                        {header.column.getIsSorted() === "asc" ? (
                          <ChevronUp className="size-4" />
                        ) : (
                          <ChevronDown className="size-4" />
                        )}
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
              <td
                colSpan={columns.length}
                className="text-center py-8 text-muted-foreground"
              >
                No users found
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
                onClick={() => onUserClick(row.original)}
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
