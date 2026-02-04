//! Draft management endpoints for auto-saved annotation work.
//!
//! Drafts allow annotators to save work in progress automatically.
//! Only one draft exists per (task_id, user_id) pair.

use axum::{extract::Path, http::StatusCode, routing::post, Extension, Json, Router};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use utoipa::ToSchema;
use uuid::Uuid;

use glyph_domain::{Draft, TaskId, UserId};

use crate::ApiError;

// =============================================================================
// Request/Response Types
// =============================================================================

/// Request to save or update a draft.
#[derive(Debug, Deserialize, ToSchema)]
pub struct SaveDraftRequest {
    /// Annotation data in progress
    pub data: serde_json::Value,
}

/// Draft response.
#[derive(Debug, Serialize, ToSchema)]
pub struct DraftResponse {
    pub draft_id: String,
    pub task_id: String,
    pub user_id: String,
    pub data: serde_json::Value,
    pub version: i32,
    pub created_at: String,
    pub updated_at: String,
}

impl From<Draft> for DraftResponse {
    fn from(draft: Draft) -> Self {
        Self {
            draft_id: draft.draft_id.to_string(),
            task_id: draft.task_id.to_string(),
            user_id: draft.user_id.to_string(),
            data: draft.data,
            version: draft.version,
            created_at: draft.created_at.to_rfc3339(),
            updated_at: draft.updated_at.to_rfc3339(),
        }
    }
}

// =============================================================================
// Route Handlers
// =============================================================================

/// Save or update a draft for a task.
/// Upserts: creates if none exists, updates if exists.
/// Only one draft per (task_id, user_id) pair.
#[utoipa::path(
    post,
    path = "/api/v1/tasks/{task_id}/drafts",
    request_body = SaveDraftRequest,
    responses(
        (status = 200, description = "Draft saved", body = DraftResponse),
        (status = 201, description = "Draft created", body = DraftResponse),
        (status = 404, description = "Task not found"),
    ),
    tag = "drafts"
)]
async fn save_draft(
    Path(task_id): Path<Uuid>,
    Extension(_pool): Extension<PgPool>,
    Json(req): Json<SaveDraftRequest>,
) -> Result<(StatusCode, Json<DraftResponse>), ApiError> {
    // TODO: Get current user from auth context
    let user_id = UserId::new(); // Placeholder
    let task_id = TaskId::from_uuid(task_id);

    // TODO: Implement actual database upsert
    // For now, return a mock response
    let draft = Draft::new(task_id, user_id, req.data);

    // In real implementation:
    // 1. Check if draft exists for (task_id, user_id)
    // 2. If exists: update data and version, return 200
    // 3. If not: create new draft, return 201

    Ok((StatusCode::CREATED, Json(DraftResponse::from(draft))))
}

/// Get the current user's draft for a task.
#[utoipa::path(
    get,
    path = "/api/v1/tasks/{task_id}/drafts",
    responses(
        (status = 200, description = "Draft found", body = DraftResponse),
        (status = 404, description = "No draft found"),
    ),
    tag = "drafts"
)]
async fn get_draft(
    Path(task_id): Path<Uuid>,
    Extension(_pool): Extension<PgPool>,
) -> Result<Json<DraftResponse>, ApiError> {
    // TODO: Get current user from auth context
    let _user_id = UserId::new(); // Placeholder
    let task_id = TaskId::from_uuid(task_id);

    // TODO: Implement actual database lookup
    // For now, return 404 (no draft)
    Err(ApiError::NotFound {
        resource_type: "draft",
        id: task_id.to_string(),
    })
}

/// Delete the current user's draft for a task.
/// Called when annotation is submitted.
#[utoipa::path(
    delete,
    path = "/api/v1/tasks/{task_id}/drafts",
    responses(
        (status = 204, description = "Draft deleted"),
        (status = 404, description = "No draft found"),
    ),
    tag = "drafts"
)]
async fn delete_draft(
    Path(task_id): Path<Uuid>,
    Extension(_pool): Extension<PgPool>,
) -> Result<StatusCode, ApiError> {
    // TODO: Get current user from auth context
    let _user_id = UserId::new(); // Placeholder
    let _task_id = TaskId::from_uuid(task_id);

    // TODO: Implement actual database delete
    // For now, return success
    Ok(StatusCode::NO_CONTENT)
}

// =============================================================================
// Router
// =============================================================================

/// Draft routes nested under /tasks/{task_id}/drafts
pub fn routes() -> Router {
    Router::new().route("/", post(save_draft).get(get_draft).delete(delete_draft))
}
