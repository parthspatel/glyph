/**
 * Queue table with TanStack Table.
 * Displays user's assigned tasks with accept/reject actions.
 */

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { useState } from 'react';
import { ChevronUp, ChevronDown, Check, X, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { QueueItem } from '../../api/queue';

interface QueueTableProps {
  items: QueueItem[];
  onAccept: (assignmentId: string) => void;
  onReject: (item: QueueItem) => void;
  isAccepting?: string;
}

function StatusBadge({ status }: { status: QueueItem['status'] }) {
  const statusConfig = {
    assigned: { color: 'bg-blue-100 text-blue-700', label: 'Assigned' },
    accepted: { color: 'bg-green-100 text-green-700', label: 'Accepted' },
    in_progress: { color: 'bg-amber-100 text-amber-700', label: 'In Progress' },
  };

  const config = statusConfig[status] ?? statusConfig.assigned;

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        config.color
      )}
    >
      {config.label}
    </span>
  );
}

function StepTypeBadge({ stepType }: { stepType: string }) {
  const typeConfig: Record<string, { color: string; label: string }> = {
    annotation: { color: 'bg-purple-100 text-purple-700', label: 'Annotation' },
    review: { color: 'bg-cyan-100 text-cyan-700', label: 'Review' },
    adjudication: { color: 'bg-orange-100 text-orange-700', label: 'Adjudication' },
  };

  const config = typeConfig[stepType.toLowerCase()] ?? {
    color: 'bg-muted text-muted-foreground',
    label: stepType,
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize',
        config.color
      )}
    >
      {config.label}
    </span>
  );
}

function PriorityIndicator({ priority }: { priority: number }) {
  // Priority ranges from -100 to 100, normalize for display
  const level =
    priority >= 50 ? 'high' : priority >= 0 ? 'medium' : 'low';

  const config = {
    high: { color: 'text-red-500', icon: AlertCircle, label: 'High' },
    medium: { color: 'text-amber-500', icon: Clock, label: 'Medium' },
    low: { color: 'text-muted-foreground', icon: Clock, label: 'Low' },
  };

  const { color, label } = config[level];

  return (
    <div className={cn('flex items-center gap-1', color)}>
      <span className="font-medium">{priority}</span>
      <span className="text-xs">({label})</span>
    </div>
  );
}

function formatTimeInQueue(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

export function QueueTable({
  items,
  onAccept,
  onReject,
  isAccepting,
}: QueueTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns: ColumnDef<QueueItem>[] = [
    {
      accessorKey: 'project_name',
      header: 'Project',
      cell: ({ row }) => (
        <span className="font-medium text-foreground">
          {row.getValue('project_name')}
        </span>
      ),
    },
    {
      accessorKey: 'step_type',
      header: 'Type',
      cell: ({ row }) => <StepTypeBadge stepType={row.getValue('step_type')} />,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.getValue('status')} />,
    },
    {
      accessorKey: 'priority',
      header: 'Priority',
      cell: ({ row }) => <PriorityIndicator priority={row.getValue('priority')} />,
    },
    {
      accessorKey: 'time_in_queue_seconds',
      header: 'In Queue',
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {formatTimeInQueue(row.getValue('time_in_queue_seconds'))}
        </span>
      ),
    },
    {
      accessorKey: 'assigned_at',
      header: 'Assigned',
      cell: ({ getValue }) => {
        const date = new Date(getValue() as string);
        return (
          <span className="text-muted-foreground">
            {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const item = row.original;
        const isLoading = isAccepting === item.assignment_id;
        const canAccept = item.status === 'assigned';

        return (
          <div className="flex items-center justify-end gap-2">
            {canAccept && (
              <>
                <Button
                  variant="default"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAccept(item.assignment_id);
                  }}
                  disabled={isLoading}
                  className="h-8"
                >
                  <Check className="size-4 mr-1" />
                  {isLoading ? 'Accepting...' : 'Accept'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onReject(item);
                  }}
                  disabled={isLoading}
                  className="h-8"
                >
                  <X className="size-4 mr-1" />
                  Reject
                </Button>
              </>
            )}
            {!canAccept && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = `/annotate/${item.task_id}`;
                }}
                className="h-8"
              >
                Continue
              </Button>
            )}
          </div>
        );
      },
      enableSorting: false,
    },
  ];

  const table = useReactTable({
    data: items,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.assignment_id,
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
                    'px-4 py-3 text-left font-medium text-muted-foreground',
                    header.column.getCanSort() &&
                      'cursor-pointer hover:bg-muted transition-colors select-none'
                  )}
                  onClick={header.column.getToggleSortingHandler()}
                >
                  <div className="flex items-center gap-1">
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                    {header.column.getIsSorted() &&
                      (header.column.getIsSorted() === 'asc' ? (
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
                className="text-center py-12 text-muted-foreground"
              >
                <div className="flex flex-col items-center gap-2">
                  <Clock className="size-12 opacity-50" />
                  <p className="text-lg font-medium">No tasks in queue</p>
                  <p className="text-sm">
                    New tasks will appear here when assigned
                  </p>
                </div>
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={cn(
                  'border-b border-border transition-colors',
                  'even:bg-muted/30',
                  'hover:bg-muted/50'
                )}
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
