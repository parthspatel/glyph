/**
 * Draft API client for auto-saved annotation work.
 */

import { api, ApiError } from "./client";

/**
 * Draft data structure.
 */
export interface Draft {
  draft_id: string;
  task_id: string;
  user_id: string;
  data: Record<string, unknown>;
  version: number;
  created_at: string;
  updated_at: string;
}

export const draftsApi = {
  /**
   * Save or update a draft for a task.
   * Upserts: creates if none exists, updates if exists.
   */
  saveDraft: (
    taskId: string,
    data: Record<string, unknown>
  ): Promise<Draft> => api.post<Draft>(`/tasks/${taskId}/drafts`, { data }),

  /**
   * Get the current user's draft for a task.
   * Returns null if no draft exists.
   */
  getDraft: async (taskId: string): Promise<Draft | null> => {
    try {
      return await api.get<Draft>(`/tasks/${taskId}/drafts`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Delete a draft (typically after submission).
   */
  deleteDraft: (taskId: string): Promise<void> =>
    api.delete(`/tasks/${taskId}/drafts`),
};
