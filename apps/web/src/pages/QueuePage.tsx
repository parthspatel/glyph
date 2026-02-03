/**
 * Task queue page for annotators.
 * Shows assigned tasks with filtering, sorting, and accept/reject actions.
 */

import { useState, useCallback } from "react";
import { ListTodo, RefreshCw, Wifi, WifiOff } from "lucide-react";
import {
  useQueueWithRealtime,
  useQueueStats,
  useAcceptTask,
  useRejectTask,
} from "../hooks/useQueue";
import { QueueTable, QueueFilters, RejectDialog } from "../components/queue";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  QueueFilters as FilterType,
  QueueSort,
  QueueItem,
  RejectReason,
} from "../api/queue";

export function QueuePage() {
  const [filters, setFilters] = useState<FilterType>({});
  const [sort, setSort] = useState<QueueSort>({
    by: "priority",
    order: "desc",
  });
  const [page, setPage] = useState(1);
  const [rejectItem, setRejectItem] = useState<QueueItem | null>(null);

  const { data, isLoading, error, refetch, isFetching, wsConnected } =
    useQueueWithRealtime(filters, sort, page, 20, filters.project_id);
  const { data: stats } = useQueueStats();
  const acceptMutation = useAcceptTask();
  const rejectMutation = useRejectTask();

  const handleFiltersChange = useCallback((newFilters: FilterType) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page when filters change
  }, []);

  const handleSortChange = useCallback((newSort: QueueSort) => {
    setSort(newSort);
    setPage(1);
  }, []);

  const handleAccept = useCallback(
    (assignmentId: string) => {
      acceptMutation.mutate(assignmentId);
    },
    [acceptMutation],
  );

  const handleReject = useCallback((item: QueueItem) => {
    setRejectItem(item);
  }, []);

  const handleRejectConfirm = useCallback(
    (reason: RejectReason) => {
      if (rejectItem) {
        rejectMutation.mutate(
          { assignmentId: rejectItem.assignment_id, reason },
          {
            onSettled: () => {
              setRejectItem(null);
            },
          },
        );
      }
    },
    [rejectItem, rejectMutation],
  );

  const pageSize = 20;
  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ListTodo className="size-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Queue</h1>
            <p className="text-muted-foreground flex items-center gap-2">
              {stats
                ? `${stats.total_pending} pending, ${stats.total_in_progress} in progress`
                : "Loading..."}
              {wsConnected ? (
                <span title="Real-time updates active">
                  <Wifi className="size-3 text-green-500" />
                </span>
              ) : (
                <span title="Connecting...">
                  <WifiOff className="size-3 text-muted-foreground" />
                </span>
              )}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw
            className={`size-4 mr-2 ${isFetching ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </header>

      {/* Stats Summary */}
      {stats && stats.by_project.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.by_project.slice(0, 4).map((project) => (
            <div
              key={project.project_id}
              className="bg-card rounded-lg border p-4"
            >
              <p className="text-sm font-medium text-foreground truncate">
                {project.project_name}
              </p>
              <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                <span>{project.pending} pending</span>
                <span>{project.in_progress} active</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <QueueFilters
        filters={filters}
        sort={sort}
        onFiltersChange={handleFiltersChange}
        onSortChange={handleSortChange}
        projects={
          stats?.by_project.map((p) => ({
            id: p.project_id,
            name: p.project_name,
          })) ?? []
        }
      />

      {/* Error State */}
      {error && (
        <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-md p-4">
          Failed to load queue. Please try again.
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="bg-card rounded-lg border p-6 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32" />
            </div>
          ))}
        </div>
      )}

      {/* Queue Table */}
      {data && !isLoading && (
        <div className="bg-card rounded-lg border overflow-hidden">
          <QueueTable
            items={data.items}
            onAccept={handleAccept}
            onReject={handleReject}
            isAccepting={
              acceptMutation.isPending ? acceptMutation.variables : undefined
            }
          />
        </div>
      )}

      {/* Pagination */}
      {data && data.total > pageSize && (
        <div className="flex items-center justify-between pt-4">
          <span className="text-sm text-muted-foreground">
            Showing {(page - 1) * pageSize + 1} -{" "}
            {Math.min(page * pageSize, data.total)} of {data.total}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Reject Dialog */}
      <RejectDialog
        open={!!rejectItem}
        onClose={() => setRejectItem(null)}
        onConfirm={handleRejectConfirm}
        isLoading={rejectMutation.isPending}
        taskTitle={rejectItem?.project_name}
      />
    </div>
  );
}
