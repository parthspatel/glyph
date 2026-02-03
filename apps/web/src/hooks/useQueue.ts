/**
 * React Query hooks for queue management
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  queueApi,
  QueueFilters,
  QueueSort,
  RejectReason,
  ClaimRequest,
} from "../api/queue";
import { useQueueWebSocket } from "./useWebSocket";

const QUEUE_KEY = "queue";

/**
 * Hook to fetch user's task queue with filters and sorting
 */
export function useQueue(
  filters?: QueueFilters,
  sort?: QueueSort,
  page = 1,
  perPage = 20,
) {
  return useQuery({
    queryKey: [QUEUE_KEY, "list", filters, sort, page, perPage],
    queryFn: () => queueApi.getQueue(filters, sort, page, perPage),
    refetchInterval: 30000, // Refetch every 30s as backup to WebSocket
    staleTime: 10000, // Consider data stale after 10s
  });
}

/**
 * Hook to fetch queue statistics
 */
export function useQueueStats() {
  return useQuery({
    queryKey: [QUEUE_KEY, "stats"],
    queryFn: queueApi.getStats,
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000,
  });
}

/**
 * Hook to fetch active users on a project
 */
export function useProjectPresence(projectId: string | undefined) {
  return useQuery({
    queryKey: [QUEUE_KEY, "presence", projectId],
    queryFn: () => queueApi.getPresence(projectId!),
    enabled: !!projectId,
    refetchInterval: 30000,
  });
}

/**
 * Hook to accept a task assignment
 */
export function useAcceptTask() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (assignmentId: string) => queueApi.acceptTask(assignmentId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUEUE_KEY] });
      navigate(data.redirect_url);
    },
  });
}

/**
 * Hook to reject a task assignment
 */
export function useRejectTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      assignmentId,
      reason,
    }: {
      assignmentId: string;
      reason: RejectReason;
    }) => queueApi.rejectTask(assignmentId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUEUE_KEY] });
    },
  });
}

/**
 * Hook to claim a task from the pool
 */
export function useClaimTask() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (request: ClaimRequest) => queueApi.claimTask(request),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUEUE_KEY] });
      navigate(data.redirect_url);
    },
  });
}

/**
 * Hook that combines queue data with real-time WebSocket updates.
 * Establishes WebSocket connection and returns queue query result.
 */
export function useQueueWithRealtime(
  filters?: QueueFilters,
  sort?: QueueSort,
  page = 1,
  perPage = 20,
  currentProjectId?: string,
) {
  const { connected } = useQueueWebSocket(currentProjectId);
  const query = useQueue(filters, sort, page, perPage);

  return {
    ...query,
    wsConnected: connected,
  };
}
