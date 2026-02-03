/**
 * Queue API client for task management
 */
import { api } from './client';

// Types matching the backend API responses
export interface QueueItem {
  assignment_id: string;
  task_id: string;
  project_id: string;
  project_name: string;
  step_id: string;
  step_type: string;
  status: 'assigned' | 'accepted' | 'in_progress';
  priority: number;
  assigned_at: string;
  time_in_queue_seconds: number;
  estimated_duration_minutes?: number;
  input_data_preview?: Record<string, unknown>;
}

export interface QueueListResponse {
  items: QueueItem[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface ProjectQueueStats {
  project_id: string;
  project_name: string;
  pending: number;
  in_progress: number;
}

export interface QueueStats {
  total_pending: number;
  total_in_progress: number;
  by_project: ProjectQueueStats[];
}

export interface QueueFilters {
  project_id?: string;
  step_type?: string;
  status?: string;
}

export interface QueueSort {
  by?: 'priority' | 'age' | 'project';
  order?: 'asc' | 'desc';
}

export type RejectReason =
  | { type: 'conflict_of_interest' }
  | { type: 'unclear_instructions' }
  | { type: 'missing_context' }
  | { type: 'outside_expertise' }
  | { type: 'schedule_conflict' }
  | { type: 'technical_issues' }
  | { type: 'other'; details: string };

export interface AcceptResponse {
  assignment_id: string;
  task_id: string;
  redirect_url: string;
}

export interface ClaimRequest {
  task_id: string;
  step_id: string;
}

export interface UserPresence {
  user_id: string;
  display_name: string;
  avatar_url?: string;
  last_seen_at: string;
}

export interface PresenceResponse {
  project_id: string;
  active_users: UserPresence[];
}

// API functions
export const queueApi = {
  /**
   * Get current user's task queue
   */
  getQueue: (
    filters?: QueueFilters,
    sort?: QueueSort,
    page = 1,
    perPage = 20
  ): Promise<QueueListResponse> =>
    api.get<QueueListResponse>('/queue', {
      params: {
        ...filters,
        ...sort,
        page,
        per_page: perPage,
      },
    }),

  /**
   * Get queue statistics
   */
  getStats: (): Promise<QueueStats> => api.get<QueueStats>('/queue/stats'),

  /**
   * Get active users on a project
   */
  getPresence: (projectId: string): Promise<PresenceResponse> =>
    api.get<PresenceResponse>(`/queue/presence/${projectId}`),

  /**
   * Accept a task assignment
   */
  acceptTask: (assignmentId: string): Promise<AcceptResponse> =>
    api.post<AcceptResponse>(`/queue/${assignmentId}/accept`),

  /**
   * Reject a task assignment with a reason
   */
  rejectTask: (assignmentId: string, reason: RejectReason): Promise<void> =>
    api.post(`/queue/${assignmentId}/reject`, { reason }),

  /**
   * Claim a task from the pool (for pool assignment mode)
   */
  claimTask: (request: ClaimRequest): Promise<AcceptResponse> =>
    api.post<AcceptResponse>('/queue/claim', request),
};
