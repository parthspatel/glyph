//! Skip reason endpoints for managing why tasks are skipped.
//!
//! System skip reasons are available to all projects.
//! Projects can add custom skip reasons.

use axum::{
    extract::Path,
    http::StatusCode,
    routing::{delete, get, post},
    Extension, Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use utoipa::ToSchema;
use uuid::Uuid;

use glyph_domain::{
    ProjectId, SkipReason, SkipReasonId, SkipReasonScope, TaskId, TaskSkip, UserId,
    SYSTEM_SKIP_REASONS,
};

use crate::ApiError;

// =============================================================================
// Request/Response Types
// =============================================================================

/// Request to create a project skip reason.
#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateSkipReasonRequest {
    /// Machine-readable code
    pub code: String,
    /// Human-readable label
    pub label: String,
}

/// Request to skip a task.
#[derive(Debug, Deserialize, ToSchema)]
pub struct SkipTaskRequest {
    /// ID of the skip reason
    pub skip_reason_id: String,
    /// Optional note explaining why
    pub note: Option<String>,
}

/// Skip reason response.
#[derive(Debug, Serialize, ToSchema)]
pub struct SkipReasonResponse {
    pub skip_reason_id: String,
    pub code: String,
    pub label: String,
    pub scope: String,
    pub project_id: Option<String>,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

impl From<SkipReason> for SkipReasonResponse {
    fn from(reason: SkipReason) -> Self {
        Self {
            skip_reason_id: reason.skip_reason_id.to_string(),
            code: reason.code,
            label: reason.label,
            scope: match reason.scope {
                SkipReasonScope::System => "system".to_string(),
                SkipReasonScope::Project => "project".to_string(),
            },
            project_id: reason.project_id.map(|id| id.to_string()),
            is_active: reason.is_active,
            created_at: reason.created_at.to_rfc3339(),
            updated_at: reason.updated_at.to_rfc3339(),
        }
    }
}

/// List of skip reasons.
#[derive(Debug, Serialize, ToSchema)]
pub struct SkipReasonListResponse {
    pub items: Vec<SkipReasonResponse>,
}

/// Task skip response.
#[derive(Debug, Serialize, ToSchema)]
pub struct TaskSkipResponse {
    pub task_skip_id: String,
    pub task_id: String,
    pub user_id: String,
    pub skip_reason_id: String,
    pub note: Option<String>,
    pub created_at: String,
}

impl From<TaskSkip> for TaskSkipResponse {
    fn from(skip: TaskSkip) -> Self {
        Self {
            task_skip_id: skip.task_skip_id.to_string(),
            task_id: skip.task_id.to_string(),
            user_id: skip.user_id.to_string(),
            skip_reason_id: skip.skip_reason_id.to_string(),
            note: skip.note,
            created_at: skip.created_at.to_rfc3339(),
        }
    }
}

// =============================================================================
// Route Handlers
// =============================================================================

/// List active skip reasons for a project.
/// Includes both system and project-specific reasons.
#[utoipa::path(
    get,
    path = "/api/v1/projects/{project_id}/skip-reasons",
    responses(
        (status = 200, description = "Skip reasons list", body = SkipReasonListResponse),
    ),
    tag = "skip-reasons"
)]
async fn list_skip_reasons(
    Path(_project_id): Path<Uuid>,
    Extension(_pool): Extension<PgPool>,
) -> Result<Json<SkipReasonListResponse>, ApiError> {
    // Return system skip reasons (always available)
    let system_reasons: Vec<SkipReasonResponse> = SYSTEM_SKIP_REASONS
        .iter()
        .map(|(code, label)| {
            let reason = SkipReason::system(*code, *label);
            SkipReasonResponse::from(reason)
        })
        .collect();

    // TODO: Also fetch project-specific skip reasons from database

    Ok(Json(SkipReasonListResponse {
        items: system_reasons,
    }))
}

/// Create a project-specific skip reason.
#[utoipa::path(
    post,
    path = "/api/v1/projects/{project_id}/skip-reasons",
    request_body = CreateSkipReasonRequest,
    responses(
        (status = 201, description = "Skip reason created", body = SkipReasonResponse),
        (status = 400, description = "Bad request"),
        (status = 403, description = "Forbidden - admin only"),
    ),
    tag = "skip-reasons"
)]
async fn create_skip_reason(
    Path(project_id): Path<Uuid>,
    Extension(_pool): Extension<PgPool>,
    Json(req): Json<CreateSkipReasonRequest>,
) -> Result<(StatusCode, Json<SkipReasonResponse>), ApiError> {
    // TODO: Check user is admin/manager for this project

    let project_id = ProjectId::from_uuid(project_id);
    let reason = SkipReason::project(project_id, req.code, req.label);

    // TODO: Persist to database

    Ok((StatusCode::CREATED, Json(SkipReasonResponse::from(reason))))
}

/// Deactivate a project skip reason.
#[utoipa::path(
    delete,
    path = "/api/v1/projects/{project_id}/skip-reasons/{skip_reason_id}",
    responses(
        (status = 204, description = "Skip reason deactivated"),
        (status = 403, description = "Forbidden - cannot deactivate system reasons"),
        (status = 404, description = "Skip reason not found"),
    ),
    tag = "skip-reasons"
)]
async fn deactivate_skip_reason(
    Path((_project_id, skip_reason_id)): Path<(Uuid, Uuid)>,
    Extension(_pool): Extension<PgPool>,
) -> Result<StatusCode, ApiError> {
    let _skip_reason_id = SkipReasonId::from_uuid(skip_reason_id);

    // TODO: Check if system reason (reject with 403)
    // TODO: Deactivate in database

    Ok(StatusCode::NO_CONTENT)
}

/// Skip a task with a reason.
#[utoipa::path(
    post,
    path = "/api/v1/tasks/{task_id}/skip",
    request_body = SkipTaskRequest,
    responses(
        (status = 200, description = "Task skipped", body = TaskSkipResponse),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Task or skip reason not found"),
    ),
    tag = "skip-reasons"
)]
async fn skip_task(
    Path(task_id): Path<Uuid>,
    Extension(_pool): Extension<PgPool>,
    Json(req): Json<SkipTaskRequest>,
) -> Result<Json<TaskSkipResponse>, ApiError> {
    // TODO: Get current user from auth context
    let user_id = UserId::new(); // Placeholder
    let task_id = TaskId::from_uuid(task_id);

    // Parse skip reason ID
    let skip_reason_id: SkipReasonId =
        req.skip_reason_id
            .parse()
            .map_err(|_| ApiError::BadRequest {
                code: "skip.invalid_reason_id",
                message: "Invalid skip reason ID format".to_string(),
            })?;

    // Create skip record
    let task_skip = TaskSkip::new(task_id, user_id, skip_reason_id, req.note);

    // TODO: Persist to database
    // TODO: Advance workflow state

    Ok(Json(TaskSkipResponse::from(task_skip)))
}

// =============================================================================
// Routers
// =============================================================================

/// Project skip reason routes (/projects/{project_id}/skip-reasons)
pub fn project_routes() -> Router {
    Router::new()
        .route("/", get(list_skip_reasons).post(create_skip_reason))
        .route("/{skip_reason_id}", delete(deactivate_skip_reason))
}

/// Task skip route (/tasks/{task_id}/skip)
pub fn task_skip_route() -> Router {
    Router::new().route("/", post(skip_task))
}
