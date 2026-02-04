//! Review endpoints for reviewer actions on annotations.
//!
//! Reviews allow reviewers to approve, reject, or request changes
//! on submitted annotations.

use axum::{extract::Path, http::StatusCode, routing::post, Extension, Json, Router};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use utoipa::ToSchema;
use uuid::Uuid;

use glyph_domain::{AnnotationId, Review, ReviewAction, ReviewComment, ReviewId, TaskId, UserId};

use crate::ApiError;

// =============================================================================
// Request/Response Types
// =============================================================================

/// Request to submit a review.
#[derive(Debug, Deserialize, ToSchema)]
pub struct SubmitReviewRequest {
    /// ID of the annotation being reviewed
    pub annotation_id: String,
    /// Action: approve, reject, or request_changes
    pub action: String,
    /// Corrected data if reviewer made edits
    pub corrected_data: Option<serde_json::Value>,
    /// Summary note for the annotation author
    pub summary_note: Option<String>,
}

/// Request to add a review comment.
#[derive(Debug, Deserialize, ToSchema)]
pub struct AddCommentRequest {
    /// JSON path or field identifier
    pub path: String,
    /// Comment content
    pub content: String,
}

/// Review response.
#[derive(Debug, Serialize, ToSchema)]
pub struct ReviewResponse {
    pub review_id: String,
    pub annotation_id: String,
    pub task_id: String,
    pub reviewer_id: String,
    pub action: String,
    pub corrected_data: Option<serde_json::Value>,
    pub summary_note: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl From<Review> for ReviewResponse {
    fn from(review: Review) -> Self {
        Self {
            review_id: review.review_id.to_string(),
            annotation_id: review.annotation_id.to_string(),
            task_id: review.task_id.to_string(),
            reviewer_id: review.reviewer_id.to_string(),
            action: match review.action {
                ReviewAction::Approve => "approve".to_string(),
                ReviewAction::Reject => "reject".to_string(),
                ReviewAction::RequestChanges => "request_changes".to_string(),
            },
            corrected_data: review.corrected_data,
            summary_note: review.summary_note,
            created_at: review.created_at.to_rfc3339(),
            updated_at: review.updated_at.to_rfc3339(),
        }
    }
}

/// Review comment response.
#[derive(Debug, Serialize, ToSchema)]
pub struct ReviewCommentResponse {
    pub comment_id: String,
    pub review_id: String,
    pub path: String,
    pub content: String,
    pub created_at: String,
}

impl From<ReviewComment> for ReviewCommentResponse {
    fn from(comment: ReviewComment) -> Self {
        Self {
            comment_id: comment.comment_id.to_string(),
            review_id: comment.review_id.to_string(),
            path: comment.path,
            content: comment.content,
            created_at: comment.created_at.to_rfc3339(),
        }
    }
}

/// List of reviews.
#[derive(Debug, Serialize, ToSchema)]
pub struct ReviewListResponse {
    pub items: Vec<ReviewResponse>,
}

// =============================================================================
// Route Handlers
// =============================================================================

/// Submit a review for an annotation.
#[utoipa::path(
    post,
    path = "/api/v1/tasks/{task_id}/reviews",
    request_body = SubmitReviewRequest,
    responses(
        (status = 201, description = "Review submitted", body = ReviewResponse),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Task or annotation not found"),
    ),
    tag = "reviews"
)]
async fn submit_review(
    Path(task_id): Path<Uuid>,
    Extension(_pool): Extension<PgPool>,
    Json(req): Json<SubmitReviewRequest>,
) -> Result<(StatusCode, Json<ReviewResponse>), ApiError> {
    // TODO: Get current user from auth context
    let reviewer_id = UserId::new(); // Placeholder
    let task_id = TaskId::from_uuid(task_id);

    // Parse annotation ID
    let annotation_id: AnnotationId =
        req.annotation_id
            .parse()
            .map_err(|_| ApiError::BadRequest {
                code: "review.invalid_annotation_id",
                message: "Invalid annotation ID format".to_string(),
            })?;

    // Parse action
    let action = match req.action.to_lowercase().as_str() {
        "approve" => ReviewAction::Approve,
        "reject" => ReviewAction::Reject,
        "request_changes" => ReviewAction::RequestChanges,
        _ => {
            return Err(ApiError::BadRequest {
                code: "review.invalid_action",
                message: "Action must be: approve, reject, or request_changes".to_string(),
            })
        }
    };

    // Create review
    let mut review = Review::new(annotation_id, task_id, reviewer_id, action);

    if let Some(corrected_data) = req.corrected_data {
        review = review.with_corrections(corrected_data);
    }

    if let Some(note) = req.summary_note {
        review = review.with_note(note);
    }

    // TODO: Persist to database
    // TODO: Advance workflow state based on review action

    Ok((StatusCode::CREATED, Json(ReviewResponse::from(review))))
}

/// List reviews for a task.
#[utoipa::path(
    get,
    path = "/api/v1/tasks/{task_id}/reviews",
    responses(
        (status = 200, description = "Review list", body = ReviewListResponse),
    ),
    tag = "reviews"
)]
async fn list_reviews(
    Path(_task_id): Path<Uuid>,
    Extension(_pool): Extension<PgPool>,
) -> Result<Json<ReviewListResponse>, ApiError> {
    // TODO: Fetch reviews from database

    Ok(Json(ReviewListResponse { items: vec![] }))
}

/// Add an inline comment to a review.
#[utoipa::path(
    post,
    path = "/api/v1/tasks/{task_id}/reviews/{review_id}/comments",
    request_body = AddCommentRequest,
    responses(
        (status = 201, description = "Comment added", body = ReviewCommentResponse),
        (status = 404, description = "Review not found"),
    ),
    tag = "reviews"
)]
async fn add_comment(
    Path((_task_id, review_id)): Path<(Uuid, Uuid)>,
    Extension(_pool): Extension<PgPool>,
    Json(req): Json<AddCommentRequest>,
) -> Result<(StatusCode, Json<ReviewCommentResponse>), ApiError> {
    let review_id = ReviewId::from_uuid(review_id);

    // Create comment
    let comment = ReviewComment::new(review_id, req.path, req.content);

    // TODO: Persist to database

    Ok((
        StatusCode::CREATED,
        Json(ReviewCommentResponse::from(comment)),
    ))
}

// =============================================================================
// Router
// =============================================================================

/// Review routes nested under /tasks/{task_id}/reviews
pub fn routes() -> Router {
    Router::new()
        .route("/", post(submit_review).get(list_reviews))
        .route("/{review_id}/comments", post(add_comment))
}
