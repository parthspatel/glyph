/**
 * Annotation submission API client.
 */

import { api, ApiError } from "./client";

/**
 * Annotation data structure.
 */
export interface Annotation {
  annotation_id: string;
  task_id: string;
  step_id: string;
  user_id: string;
  assignment_id: string;
  project_id: string;
  data: Record<string, unknown>;
  status: string;
  version: number;
  created_at: string;
  updated_at: string;
  submitted_at?: string;
  time_spent_ms?: number;
}

/**
 * Request to submit an annotation.
 */
export interface SubmitAnnotationRequest {
  /** Annotation data */
  data: Record<string, unknown>;
  /** Time spent on this annotation in milliseconds */
  time_spent_ms?: number;
  /** Client-side metadata (browser, version, etc.) */
  client_metadata?: Record<string, unknown>;
}

/**
 * Next task response.
 */
export interface NextTaskResponse {
  task_id: string;
  project_id: string;
}

export const annotationsApi = {
  /**
   * Submit an annotation for a task.
   */
  submitAnnotation: (
    taskId: string,
    request: SubmitAnnotationRequest
  ): Promise<Annotation> => api.post<Annotation>(`/tasks/${taskId}/annotations`, request),

  /**
   * Get the next task for the current user.
   * Returns null if no tasks available.
   */
  getNextTask: async (projectId?: string): Promise<NextTaskResponse | null> => {
    try {
      return await api.get<NextTaskResponse>("/queue/next", {
        params: projectId ? { project_id: projectId } : undefined,
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  },
};
