/**
 * Skip reasons API client.
 * Handles fetching skip reasons and skipping tasks.
 */

import { api } from "./client";

/**
 * Skip reason data structure.
 */
export interface SkipReason {
  skip_reason_id: string;
  code: string;
  label: string;
  scope: "system" | "project";
  project_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Task skip response.
 */
export interface TaskSkipResponse {
  task_skip_id: string;
  task_id: string;
  user_id: string;
  skip_reason_id: string;
  note?: string;
  created_at: string;
}

export const skipReasonsApi = {
  /**
   * Get skip reasons available for a project.
   * Includes both system and project-specific reasons.
   */
  getSkipReasons: (projectId: string): Promise<{ items: SkipReason[] }> =>
    api.get(`/projects/${projectId}/skip-reasons`),

  /**
   * Skip a task with a reason.
   */
  skipTask: (
    taskId: string,
    skipReasonId: string,
    note?: string
  ): Promise<TaskSkipResponse> =>
    api.post(`/tasks/${taskId}/skip`, {
      skip_reason_id: skipReasonId,
      note,
    }),
};
