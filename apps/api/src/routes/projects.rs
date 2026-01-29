//! Project CRUD endpoints

use axum::{
    extract::{Path, Query},
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use glyph_domain::{ProjectId, ProjectStatus};

use crate::error::ApiError;
use crate::extractors::CurrentUser;

/// Project-level settings (API response type)
#[derive(Debug, Clone, Default, Serialize, Deserialize, ToSchema)]
pub struct ProjectSettingsResponse {
    pub allow_self_review: bool,
    pub require_all_fields: bool,
    pub max_assignments_per_user: Option<i32>,
    pub assignment_timeout_hours: Option<i32>,
    pub quality_threshold: Option<f64>,
    pub auto_complete_enabled: bool,
}

/// Project list query parameters
#[derive(Debug, Deserialize)]
pub struct ListProjectsQuery {
    pub status: Option<String>,
    pub project_type_id: Option<String>,
    pub team_id: Option<String>,
    pub created_by: Option<String>,
    pub search: Option<String>,
    pub view: Option<String>, // "my", "team", "all"
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

/// Project list response
#[derive(Debug, Serialize, ToSchema)]
pub struct ProjectListResponse {
    pub items: Vec<ProjectSummaryResponse>,
    pub total: i64,
    pub limit: i64,
    pub offset: i64,
}

/// Project summary for list responses
#[derive(Debug, Serialize, ToSchema)]
pub struct ProjectSummaryResponse {
    pub project_id: String,
    pub name: String,
    pub description: Option<String>,
    pub status: String,
    pub project_type_name: Option<String>,
    pub team_name: Option<String>,
    pub task_count: i64,
    pub completed_task_count: i64,
    pub completion_percentage: f64,
    pub tags: Vec<String>,
    pub deadline: Option<String>,
    pub created_at: String,
    pub created_by: String,
}

/// Project detail response
#[derive(Debug, Serialize, ToSchema)]
pub struct ProjectDetailResponse {
    pub project_id: String,
    pub name: String,
    pub description: Option<String>,
    pub status: String,
    pub project_type_id: Option<String>,
    pub workflow_id: Option<String>,
    pub layout_id: Option<String>,
    pub team_id: Option<String>,
    pub settings: ProjectSettingsResponse,
    pub tags: Vec<String>,
    pub documentation: Option<String>,
    pub deadline: Option<String>,
    pub deadline_action: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub created_by: String,
    // Computed fields
    pub can_activate: bool,
    pub activation_errors: Vec<String>,
    pub allowed_transitions: Vec<String>,
}

/// Request to create a new project
#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateProjectRequest {
    pub name: String,
    pub description: Option<String>,
    pub project_type_id: Option<String>,
    pub team_id: Option<String>,
    pub tags: Option<Vec<String>>,
    pub documentation: Option<String>,
    pub deadline: Option<String>,
    pub deadline_action: Option<String>,
    pub settings: Option<ProjectSettingsResponse>,
}

/// Request to update a project
#[derive(Debug, Deserialize, ToSchema)]
pub struct UpdateProjectRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub project_type_id: Option<String>,
    pub team_id: Option<String>,
    pub workflow_id: Option<String>,
    pub layout_id: Option<String>,
    pub tags: Option<Vec<String>>,
    pub documentation: Option<String>,
    pub deadline: Option<String>,
    pub deadline_action: Option<String>,
    pub settings: Option<ProjectSettingsResponse>,
}

/// Request to update project status
#[derive(Debug, Deserialize, ToSchema)]
pub struct UpdateStatusRequest {
    pub status: String,
}

/// Status update response with validation info
#[derive(Debug, Serialize, ToSchema)]
pub struct StatusUpdateResponse {
    pub project: ProjectDetailResponse,
    pub transition_info: Option<TransitionInfo>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct TransitionInfo {
    pub from_status: String,
    pub to_status: String,
    pub warnings: Vec<String>,
}

/// Clone project request
#[derive(Debug, Deserialize, ToSchema)]
pub struct CloneProjectRequest {
    pub include_data_sources: bool,
    pub include_settings: bool,
    pub new_name: Option<String>,
}

pub fn routes() -> Router {
    Router::new()
        .route("/", get(list_projects).post(create_project))
        .route(
            "/{project_id}",
            get(get_project).put(update_project).delete(delete_project),
        )
        .route("/{project_id}/status", post(update_status))
        .route("/{project_id}/activate", post(activate_project))
        .route("/{project_id}/clone", post(clone_project))
}

/// List projects with filtering
#[utoipa::path(
    get,
    path = "/api/v1/projects",
    params(
        ("status" = Option<String>, Query, description = "Filter by status"),
        ("project_type_id" = Option<String>, Query, description = "Filter by project type"),
        ("search" = Option<String>, Query, description = "Search by name"),
        ("limit" = Option<i64>, Query, description = "Page size"),
        ("offset" = Option<i64>, Query, description = "Page offset"),
    ),
    responses(
        (status = 200, description = "Project list", body = ProjectListResponse),
    ),
    tag = "projects"
)]
async fn list_projects(
    Query(params): Query<ListProjectsQuery>,
    _current_user: CurrentUser,
) -> Result<Json<ProjectListResponse>, ApiError> {
    // For now return placeholder - will be implemented with actual DB query
    let limit = params.limit.unwrap_or(20);
    let offset = params.offset.unwrap_or(0);

    Ok(Json(ProjectListResponse {
        items: vec![],
        total: 0,
        limit,
        offset,
    }))
}

/// Get a project by ID
#[utoipa::path(
    get,
    path = "/api/v1/projects/{project_id}",
    params(
        ("project_id" = String, Path, description = "Project ID"),
    ),
    responses(
        (status = 200, description = "Project details", body = ProjectDetailResponse),
        (status = 404, description = "Project not found"),
    ),
    tag = "projects"
)]
async fn get_project(
    Path(project_id): Path<String>,
    _current_user: CurrentUser,
) -> Result<Json<ProjectDetailResponse>, ApiError> {
    let _id: ProjectId = project_id
        .parse()
        .map_err(|_| ApiError::not_found("project", &project_id))?;

    // Placeholder - will implement with actual DB query
    Err(ApiError::not_found("project", &project_id))
}

/// Create a new project
#[utoipa::path(
    post,
    path = "/api/v1/projects",
    request_body = CreateProjectRequest,
    responses(
        (status = 201, description = "Project created", body = ProjectDetailResponse),
        (status = 400, description = "Invalid request"),
    ),
    tag = "projects"
)]
async fn create_project(
    current_user: CurrentUser,
    Json(req): Json<CreateProjectRequest>,
) -> Result<(StatusCode, Json<ProjectDetailResponse>), ApiError> {
    // Validate name
    if req.name.trim().is_empty() {
        return Err(ApiError::bad_request(
            "validation.name_required",
            "Project name is required",
        ));
    }

    // Placeholder response - will implement with actual DB insert
    let response = ProjectDetailResponse {
        project_id: ProjectId::new().to_string(),
        name: req.name,
        description: req.description,
        status: "draft".to_string(),
        project_type_id: req.project_type_id,
        workflow_id: None,
        layout_id: None,
        team_id: req.team_id,
        settings: req.settings.unwrap_or_default(),
        tags: req.tags.unwrap_or_default(),
        documentation: req.documentation,
        deadline: req.deadline,
        deadline_action: req.deadline_action,
        created_at: chrono::Utc::now().to_rfc3339(),
        updated_at: chrono::Utc::now().to_rfc3339(),
        created_by: current_user.user_id.to_string(),
        can_activate: false,
        activation_errors: vec![
            "Output schema not configured".to_string(),
            "No data sources configured".to_string(),
        ],
        allowed_transitions: vec!["active".to_string(), "archived".to_string()],
    };

    Ok((StatusCode::CREATED, Json(response)))
}

/// Update a project
#[utoipa::path(
    put,
    path = "/api/v1/projects/{project_id}",
    params(
        ("project_id" = String, Path, description = "Project ID"),
    ),
    request_body = UpdateProjectRequest,
    responses(
        (status = 200, description = "Project updated", body = ProjectDetailResponse),
        (status = 404, description = "Project not found"),
    ),
    tag = "projects"
)]
async fn update_project(
    Path(project_id): Path<String>,
    _current_user: CurrentUser,
    Json(_req): Json<UpdateProjectRequest>,
) -> Result<Json<ProjectDetailResponse>, ApiError> {
    let _id: ProjectId = project_id
        .parse()
        .map_err(|_| ApiError::not_found("project", &project_id))?;

    // Placeholder - will implement with actual DB update
    Err(ApiError::not_found("project", &project_id))
}

/// Delete a project (soft delete)
#[utoipa::path(
    delete,
    path = "/api/v1/projects/{project_id}",
    params(
        ("project_id" = String, Path, description = "Project ID"),
    ),
    responses(
        (status = 204, description = "Project deleted"),
        (status = 404, description = "Project not found"),
    ),
    tag = "projects"
)]
async fn delete_project(
    Path(project_id): Path<String>,
    _current_user: CurrentUser,
) -> Result<StatusCode, ApiError> {
    let _id: ProjectId = project_id
        .parse()
        .map_err(|_| ApiError::not_found("project", &project_id))?;

    // Placeholder - will implement with actual soft delete
    Err(ApiError::not_found("project", &project_id))
}

/// Update project status
#[utoipa::path(
    post,
    path = "/api/v1/projects/{project_id}/status",
    params(
        ("project_id" = String, Path, description = "Project ID"),
    ),
    request_body = UpdateStatusRequest,
    responses(
        (status = 200, description = "Status updated", body = StatusUpdateResponse),
        (status = 400, description = "Invalid status transition"),
        (status = 404, description = "Project not found"),
    ),
    tag = "projects"
)]
async fn update_status(
    Path(project_id): Path<String>,
    _current_user: CurrentUser,
    Json(req): Json<UpdateStatusRequest>,
) -> Result<Json<StatusUpdateResponse>, ApiError> {
    let _id: ProjectId = project_id
        .parse()
        .map_err(|_| ApiError::not_found("project", &project_id))?;

    // Parse target status
    let _target_status = match req.status.to_lowercase().as_str() {
        "draft" => ProjectStatus::Draft,
        "active" => ProjectStatus::Active,
        "paused" => ProjectStatus::Paused,
        "completed" => ProjectStatus::Completed,
        "archived" => ProjectStatus::Archived,
        _ => {
            return Err(ApiError::bad_request(
                "validation.invalid_status",
                format!("Invalid status: {}", req.status),
            ))
        }
    };

    // Placeholder - will implement with actual status update
    Err(ApiError::not_found("project", &project_id))
}

/// Activate a project (validate and transition to active)
#[utoipa::path(
    post,
    path = "/api/v1/projects/{project_id}/activate",
    params(
        ("project_id" = String, Path, description = "Project ID"),
    ),
    responses(
        (status = 200, description = "Project activated", body = ProjectDetailResponse),
        (status = 400, description = "Activation validation failed"),
        (status = 404, description = "Project not found"),
    ),
    tag = "projects"
)]
async fn activate_project(
    Path(project_id): Path<String>,
    _current_user: CurrentUser,
) -> Result<Json<ProjectDetailResponse>, ApiError> {
    let _id: ProjectId = project_id
        .parse()
        .map_err(|_| ApiError::not_found("project", &project_id))?;

    // Placeholder - will validate activation requirements:
    // 1. Must be in Draft status
    // 2. Must have output_schema configured (via project_type or direct)
    // 3. Must have at least one data source
    // 4. Must have skill requirements defined (if project_type requires them)

    Err(ApiError::not_found("project", &project_id))
}

/// Clone a project
#[utoipa::path(
    post,
    path = "/api/v1/projects/{project_id}/clone",
    params(
        ("project_id" = String, Path, description = "Project ID to clone"),
    ),
    request_body = CloneProjectRequest,
    responses(
        (status = 201, description = "Project cloned", body = ProjectDetailResponse),
        (status = 404, description = "Project not found"),
    ),
    tag = "projects"
)]
async fn clone_project(
    Path(project_id): Path<String>,
    _current_user: CurrentUser,
    Json(_req): Json<CloneProjectRequest>,
) -> Result<(StatusCode, Json<ProjectDetailResponse>), ApiError> {
    let _id: ProjectId = project_id
        .parse()
        .map_err(|_| ApiError::not_found("project", &project_id))?;

    // Placeholder - will implement clone logic:
    // 1. Copy project settings, tags, documentation
    // 2. Optionally copy data sources (without credentials)
    // 3. Set status to Draft
    // 4. Set new name (or append " (copy)")

    Err(ApiError::not_found("project", &project_id))
}
