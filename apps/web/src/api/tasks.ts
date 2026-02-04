/**
 * Task API client for annotation interface.
 * Handles fetching tasks with their associated layout data.
 */
import { api } from "./client";
import type { LayoutConfig } from "@glyph/layout-runtime";

/**
 * Task with layout data for annotation.
 */
export interface TaskWithLayout {
  task_id: string;
  project_id: string;
  project_name: string;
  status: string;
  priority: number;
  input_data: Record<string, unknown>;
  layout: LayoutConfig;
  instructions?: string;
  step_id: string;
  step_type: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Draft for auto-saved annotation work.
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

export const tasksApi = {
  /**
   * Get a task with its layout for annotation.
   */
  getTaskForAnnotation: (taskId: string): Promise<TaskWithLayout> =>
    api.get<TaskWithLayout>(`/tasks/${taskId}/annotate`),

  /**
   * Save or update a draft.
   */
  saveDraft: (taskId: string, data: Record<string, unknown>): Promise<Draft> =>
    api.post<Draft>(`/tasks/${taskId}/drafts`, { data }),

  /**
   * Get the current user's draft for a task.
   */
  getDraft: (taskId: string): Promise<Draft> =>
    api.get<Draft>(`/tasks/${taskId}/drafts`),

  /**
   * Delete a draft (after submission).
   */
  deleteDraft: (taskId: string): Promise<void> =>
    api.delete(`/tasks/${taskId}/drafts`),
};
