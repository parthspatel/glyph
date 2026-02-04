/**
 * Review API client.
 * Handles reviewer operations: fetching tasks for review, submitting reviews, and comments.
 */

import { api } from "./client";
import type { LayoutConfig } from "@glyph/layout-runtime";
import type { Review, ReviewAction, ReviewComment } from "@glyph/types";

/**
 * Task data for review including original annotation.
 */
export interface TaskForReview {
  task_id: string;
  project_id: string;
  project_name: string;
  status: string;
  input_data: Record<string, unknown>;
  layout: LayoutConfig;
  instructions?: string;
  step_id: string;
  step_type: string;
  /** The annotation being reviewed */
  annotation: {
    annotation_id: string;
    user_id: string;
    user_name: string;
    data: Record<string, unknown>;
    submitted_at: string;
  };
  /** Previous reviews on this annotation, if any */
  previous_reviews?: Review[];
  created_at: string;
  updated_at: string;
}

/**
 * Request to submit a review.
 */
export interface SubmitReviewRequest {
  /** ID of the annotation being reviewed */
  annotation_id: string;
  /** Review action: approve, reject, or request_changes */
  action: ReviewAction;
  /** Corrected data if reviewer made edits */
  corrected_data?: Record<string, unknown>;
  /** Summary note for the annotator */
  summary_note?: string;
}

/**
 * Request to add a comment to a review.
 */
export interface AddCommentRequest {
  /** JSON path or field identifier for the commented content */
  path: string;
  /** Comment content */
  content: string;
}

export const reviewsApi = {
  /**
   * Get a task with its annotation for review.
   */
  getTaskForReview: (taskId: string): Promise<TaskForReview> =>
    api.get<TaskForReview>(`/tasks/${taskId}/review`),

  /**
   * Submit a review for a task.
   */
  submitReview: (taskId: string, request: SubmitReviewRequest): Promise<Review> =>
    api.post<Review>(`/tasks/${taskId}/reviews`, request),

  /**
   * Add a comment to a review.
   */
  addReviewComment: (
    taskId: string,
    reviewId: string,
    request: AddCommentRequest
  ): Promise<ReviewComment> =>
    api.post<ReviewComment>(`/tasks/${taskId}/reviews/${reviewId}/comments`, request),

  /**
   * Get all reviews for a task.
   */
  getReviews: (taskId: string): Promise<Review[]> =>
    api.get<Review[]>(`/tasks/${taskId}/reviews`),
};
