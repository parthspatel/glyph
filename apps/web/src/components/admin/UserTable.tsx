import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
} from '@tanstack/react-table';
import { useState } from 'react';
import type { UserSummary } from '../../hooks/useUsers';

interface UserTableProps {
  users: UserSummary[];
  rowSelection: RowSelectionState;
  onRowSelectionChange: (selection: RowSelectionState) => void;
  onUserClick: (user: UserSummary) => void;
}

const columns: ColumnDef<UserSummary>[] = [
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
  },
  {
    accessorKey: 'display_name',
    header: 'Name',
    cell: ({ row }) => (
      <div className="user-name-cell">
        <span className="user-name">{row.original.display_name}</span>
        {row.original.department && (
          <span className="user-department">({row.original.department})</span>
        )}
      </div>
    ),
  },
  {
    accessorKey: 'email',
    header: 'Email',
    cell: ({ getValue }) => <span className="user-email">{getValue() as string}</span>,
  },
  {
    accessorKey: 'global_role',
    header: 'Role',
    cell: ({ getValue }) => {
      const role = getValue() as string;
      return <span className={`role-badge role-${role}`}>{role}</span>;
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ getValue }) => {
      const status = getValue() as string;
      return <span className={`status-badge status-${status}`}>{status}</span>;
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
      const newSelection = typeof updater === 'function' ? updater(rowSelection) : updater;
      onRowSelectionChange(newSelection);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.user_id,
    enableRowSelection: true,
  });

  return (
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
              <td colSpan={columns.length} className="empty-state">
                No users found
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="table-row clickable"
                onClick={() => onUserClick(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
