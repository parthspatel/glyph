/**
 * Adjudication API client.
 * Handles adjudicator operations: fetching conflicting annotations and submitting resolutions.
 */

import { api } from "./client";
import type { LayoutConfig } from "@glyph/layout-runtime";
import type { Annotation } from "@glyph/types";

/**
 * Annotation with annotator info for comparison.
 */
export interface AnnotationForComparison {
  annotation_id: string;
  user_id: string;
  user_name: string;
  data: Record<string, unknown>;
  submitted_at: string;
  quality_score?: number;
}

/**
 * Task data for adjudication including all conflicting annotations.
 */
export interface TaskForAdjudication {
  task_id: string;
  project_id: string;
  project_name: string;
  status: string;
  input_data: Record<string, unknown>;
  layout: LayoutConfig;
  instructions?: string;
  step_id: string;
  step_type: string;
  /** All annotations that need to be adjudicated */
  annotations: AnnotationForComparison[];
  /** Consensus metrics if calculated */
  consensus_metrics?: {
    agreement_score?: number;
    method?: string;
  };
  created_at: string;
  updated_at: string;
}

/**
 * Request to submit a resolution.
 */
export interface SubmitResolutionRequest {
  /** Final resolved annotation data */
  data: Record<string, unknown>;
  /** ID of annotation used as base, if any */
  source_annotation_id?: string;
  /** Adjudicator's notes explaining the resolution */
  notes?: string;
}

export const adjudicationApi = {
  /**
   * Get a task with all annotations for adjudication.
   */
  getTaskForAdjudication: (taskId: string): Promise<TaskForAdjudication> =>
    api.get<TaskForAdjudication>(`/tasks/${taskId}/adjudicate`),

  /**
   * Submit the final resolution for a task.
   */
  submitResolution: (
    taskId: string,
    request: SubmitResolutionRequest
  ): Promise<Annotation> =>
    api.post<Annotation>(`/tasks/${taskId}/adjudicate`, request),
};
