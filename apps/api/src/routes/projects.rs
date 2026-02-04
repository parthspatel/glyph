//! Project CRUD endpoints

use axum::{
    extract::{Path, Query},
    http::StatusCode,
    routing::{get, post},
    Extension, Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use utoipa::ToSchema;

use glyph_db::{ExtendedProjectUpdate, Pagination, PgProjectRepository, ProjectRepository};
use glyph_domain::{Project, ProjectId, ProjectStatus, ProjectTypeId, TeamId};

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

impl From<Project> for ProjectSummaryResponse {
    fn from(p: Project) -> Self {
        Self {
            project_id: p.project_id.to_string(),
            name: p.name,
            description: p.description,
            status: format!("{:?}", p.status).to_lowercase(),
            project_type_name: None, // Would need join to get this
            team_name: None,         // Would need join to get this
            task_count: 0,           // Would need aggregation
            completed_task_count: 0, // Would need aggregation
            completion_percentage: 0.0,
            tags: p.tags,
            deadline: p.deadline.map(|d| d.to_rfc3339()),
            created_at: p.created_at.to_rfc3339(),
            created_by: p.created_by.to_string(),
        }
    }
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

impl From<Project> for ProjectDetailResponse {
    fn from(p: Project) -> Self {
        let status = p.status;
        let allowed_transitions = get_allowed_transitions(status);
        let (can_activate, activation_errors) = check_activation_readiness(&p);

        Self {
            project_id: p.project_id.to_string(),
            name: p.name,
            description: p.description,
            status: format!("{:?}", status).to_lowercase(),
            project_type_id: p.project_type_id.map(|id| id.to_string()),
            workflow_id: p.workflow_id.map(|id| id.to_string()),
            layout_id: p.layout_id,
            team_id: p.team_id.map(|id| id.to_string()),
            settings: ProjectSettingsResponse {
                allow_self_review: p.settings.allow_self_review,
                require_all_fields: p.settings.require_all_fields,
                max_assignments_per_user: p.settings.max_assignments_per_user,
                assignment_timeout_hours: p.settings.assignment_timeout_hours,
                quality_threshold: p.settings.quality_threshold,
                auto_complete_enabled: p.settings.auto_complete_enabled,
            },
            tags: p.tags,
            documentation: p.documentation,
            deadline: p.deadline.map(|d| d.to_rfc3339()),
            deadline_action: p.deadline_action.map(|a| format!("{:?}", a).to_lowercase()),
            created_at: p.created_at.to_rfc3339(),
            updated_at: p.updated_at.to_rfc3339(),
            created_by: p.created_by.to_string(),
            can_activate,
            activation_errors,
            allowed_transitions,
        }
    }
}

/// Get allowed status transitions based on current status
fn get_allowed_transitions(status: ProjectStatus) -> Vec<String> {
    match status {
        ProjectStatus::Draft => vec!["active".to_string(), "archived".to_string()],
        ProjectStatus::Active => vec!["paused".to_string(), "completed".to_string()],
        ProjectStatus::Paused => vec!["active".to_string(), "archived".to_string()],
        ProjectStatus::Completed => vec!["archived".to_string()],
        ProjectStatus::Archived => vec!["draft".to_string()], // Can unarchive to draft
        ProjectStatus::Deleted => vec![],
    }
}

/// Check if project can be activated
fn check_activation_readiness(project: &Project) -> (bool, Vec<String>) {
    let mut errors = Vec::new();

    if project.status != ProjectStatus::Draft {
        errors.push("Project must be in draft status".to_string());
    }

    // Future: Check for required schema, data sources, etc.
    // For now, draft projects without workflow/layout show what's missing
    if project.workflow_id.is_none() && project.layout_id.is_none() {
        errors.push("Output schema not configured".to_string());
    }

    (errors.is_empty(), errors)
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

// =============================================================================
// Activation Validation Types
// =============================================================================

/// Individual activation check
#[derive(Debug, Serialize, ToSchema)]
pub struct ActivationCheck {
    pub id: String,
    pub category: String,
    pub severity: String,
    pub message: String,
    pub fix_action: Option<String>,
}

/// Activation validation response
#[derive(Debug, Serialize, ToSchema)]
pub struct ActivationValidationResponse {
    pub can_activate: bool,
    pub checks: Vec<ActivationCheck>,
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
        .route(
            "/{project_id}/validate-activation",
            get(validate_project_activation),
        )
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
    Extension(pool): Extension<PgPool>,
) -> Result<Json<ProjectListResponse>, ApiError> {
    let pagination = Pagination {
        limit: params.limit.unwrap_or(20),
        offset: params.offset.unwrap_or(0),
        sort_by: None,
        sort_order: Default::default(),
    };

    let repo = PgProjectRepository::new(pool);
    let page = repo.list(pagination).await.map_err(|e| {
        tracing::error!("Failed to list projects: {:?}", e);
        ApiError::Internal(anyhow::anyhow!("{}", e))
    })?;

    Ok(Json(ProjectListResponse {
        items: page
            .items
            .into_iter()
            .map(ProjectSummaryResponse::from)
            .collect(),
        total: page.total,
        limit: page.limit,
        offset: page.offset,
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
    Extension(pool): Extension<PgPool>,
) -> Result<Json<ProjectDetailResponse>, ApiError> {
    let id: ProjectId = project_id
        .parse()
        .map_err(|_| ApiError::not_found("project", &project_id))?;

    let repo = PgProjectRepository::new(pool);
    let project = repo
        .find_by_id(&id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to find project {}: {:?}", project_id, e);
            ApiError::Internal(anyhow::anyhow!("{}", e))
        })?
        .ok_or_else(|| ApiError::not_found("project", &project_id))?;

    Ok(Json(ProjectDetailResponse::from(project)))
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
    Extension(pool): Extension<PgPool>,
    Json(req): Json<CreateProjectRequest>,
) -> Result<(StatusCode, Json<ProjectDetailResponse>), ApiError> {
    // Validate name
    if req.name.trim().is_empty() {
        return Err(ApiError::bad_request(
            "validation.name_required",
            "Project name is required",
        ));
    }

    let repo = PgProjectRepository::new(pool.clone());
    let project = repo
        .create_minimal(&req.name, req.description.as_deref(), &current_user.user_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to create project: {:?}", e);
            ApiError::Internal(anyhow::anyhow!("{}", e))
        })?;

    // If additional fields provided, update them
    if req.project_type_id.is_some()
        || req.team_id.is_some()
        || req.tags.is_some()
        || req.documentation.is_some()
        || req.deadline.is_some()
    {
        let update = ExtendedProjectUpdate {
            project_type_id: req
                .project_type_id
                .and_then(|s| s.parse::<ProjectTypeId>().ok()),
            team_id: req.team_id.and_then(|s| s.parse::<TeamId>().ok()),
            tags: req.tags,
            documentation: req.documentation,
            deadline: req.deadline.and_then(|s| {
                chrono::DateTime::parse_from_rfc3339(&s)
                    .ok()
                    .map(|dt| dt.with_timezone(&chrono::Utc))
            }),
            deadline_action: req.deadline_action.and_then(|s| parse_deadline_action(&s)),
            ..Default::default()
        };

        let repo = PgProjectRepository::new(pool);
        let updated = repo
            .update_extended(&project.project_id, &update)
            .await
            .map_err(|e| {
                tracing::error!("Failed to update project after create: {:?}", e);
                ApiError::Internal(anyhow::anyhow!("{}", e))
            })?;

        return Ok((
            StatusCode::CREATED,
            Json(ProjectDetailResponse::from(updated)),
        ));
    }

    Ok((
        StatusCode::CREATED,
        Json(ProjectDetailResponse::from(project)),
    ))
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
    Extension(pool): Extension<PgPool>,
    Json(req): Json<UpdateProjectRequest>,
) -> Result<Json<ProjectDetailResponse>, ApiError> {
    let id: ProjectId = project_id
        .parse()
        .map_err(|_| ApiError::not_found("project", &project_id))?;

    let update = ExtendedProjectUpdate {
        name: req.name,
        description: req.description,
        project_type_id: req
            .project_type_id
            .and_then(|s| s.parse::<ProjectTypeId>().ok()),
        team_id: req.team_id.and_then(|s| s.parse::<TeamId>().ok()),
        tags: req.tags,
        documentation: req.documentation,
        deadline: req.deadline.and_then(|s| {
            chrono::DateTime::parse_from_rfc3339(&s)
                .ok()
                .map(|dt| dt.with_timezone(&chrono::Utc))
        }),
        deadline_action: req.deadline_action.and_then(|s| parse_deadline_action(&s)),
        ..Default::default()
    };

    let repo = PgProjectRepository::new(pool);
    let project = repo
        .update_extended(&id, &update)
        .await
        .map_err(|e| match e {
            glyph_db::UpdateProjectError::NotFound(_) => {
                ApiError::not_found("project", &project_id)
            }
            glyph_db::UpdateProjectError::Database(e) => {
                tracing::error!("Failed to update project: {:?}", e);
                ApiError::Internal(anyhow::anyhow!("{}", e))
            }
        })?;

    Ok(Json(ProjectDetailResponse::from(project)))
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
    Extension(pool): Extension<PgPool>,
) -> Result<StatusCode, ApiError> {
    let id: ProjectId = project_id
        .parse()
        .map_err(|_| ApiError::not_found("project", &project_id))?;

    let repo = PgProjectRepository::new(pool);
    repo.soft_delete(&id).await.map_err(|e| match e {
        glyph_db::UpdateProjectError::NotFound(_) => ApiError::not_found("project", &project_id),
        glyph_db::UpdateProjectError::Database(e) => {
            tracing::error!("Failed to delete project: {:?}", e);
            ApiError::Internal(anyhow::anyhow!("{}", e))
        }
    })?;

    Ok(StatusCode::NO_CONTENT)
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
    Extension(pool): Extension<PgPool>,
    Json(req): Json<UpdateStatusRequest>,
) -> Result<Json<StatusUpdateResponse>, ApiError> {
    let id: ProjectId = project_id
        .parse()
        .map_err(|_| ApiError::not_found("project", &project_id))?;

    // Parse target status
    let target_status = parse_project_status(&req.status).ok_or_else(|| {
        ApiError::bad_request(
            "validation.invalid_status",
            format!("Invalid status: {}", req.status),
        )
    })?;

    let repo = PgProjectRepository::new(pool);

    // Get current project to validate transition
    let current = repo
        .find_by_id(&id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to find project {}: {:?}", project_id, e);
            ApiError::Internal(anyhow::anyhow!("{}", e))
        })?
        .ok_or_else(|| ApiError::not_found("project", &project_id))?;

    let from_status = current.status;
    let allowed = get_allowed_transitions(from_status);

    if !allowed.contains(&format!("{:?}", target_status).to_lowercase()) {
        return Err(ApiError::bad_request(
            "validation.invalid_transition",
            format!(
                "Cannot transition from {:?} to {:?}",
                from_status, target_status
            ),
        ));
    }

    // Use basic update for status change
    let update = glyph_db::ProjectUpdate {
        status: Some(target_status),
        ..Default::default()
    };

    let updated = repo.update(&id, &update).await.map_err(|e| match e {
        glyph_db::UpdateProjectError::NotFound(_) => ApiError::not_found("project", &project_id),
        glyph_db::UpdateProjectError::Database(e) => {
            tracing::error!("Failed to update project status: {:?}", e);
            ApiError::Internal(anyhow::anyhow!("{}", e))
        }
    })?;

    Ok(Json(StatusUpdateResponse {
        project: ProjectDetailResponse::from(updated),
        transition_info: Some(TransitionInfo {
            from_status: format!("{:?}", from_status).to_lowercase(),
            to_status: format!("{:?}", target_status).to_lowercase(),
            warnings: vec![],
        }),
    }))
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
    Extension(pool): Extension<PgPool>,
) -> Result<Json<ProjectDetailResponse>, ApiError> {
    let id: ProjectId = project_id
        .parse()
        .map_err(|_| ApiError::not_found("project", &project_id))?;

    let repo = PgProjectRepository::new(pool);

    // Get current project
    let current = repo
        .find_by_id(&id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to find project {}: {:?}", project_id, e);
            ApiError::Internal(anyhow::anyhow!("{}", e))
        })?
        .ok_or_else(|| ApiError::not_found("project", &project_id))?;

    // Check activation readiness
    let (can_activate, errors) = check_activation_readiness(&current);
    if !can_activate {
        return Err(ApiError::bad_request(
            "validation.activation_failed",
            format!("Cannot activate project: {}", errors.join(", ")),
        ));
    }

    // Update status to active
    let update = glyph_db::ProjectUpdate {
        status: Some(ProjectStatus::Active),
        ..Default::default()
    };

    let updated = repo.update(&id, &update).await.map_err(|e| match e {
        glyph_db::UpdateProjectError::NotFound(_) => ApiError::not_found("project", &project_id),
        glyph_db::UpdateProjectError::Database(e) => {
            tracing::error!("Failed to activate project: {:?}", e);
            ApiError::Internal(anyhow::anyhow!("{}", e))
        }
    })?;

    Ok(Json(ProjectDetailResponse::from(updated)))
}

/// Validate project activation readiness
#[utoipa::path(
    get,
    path = "/api/v1/projects/{project_id}/validate-activation",
    params(
        ("project_id" = String, Path, description = "Project ID"),
    ),
    responses(
        (status = 200, description = "Validation checks", body = ActivationValidationResponse),
        (status = 404, description = "Project not found"),
    ),
    tag = "projects"
)]
async fn validate_project_activation(
    Path(project_id): Path<String>,
    _current_user: CurrentUser,
    Extension(pool): Extension<PgPool>,
) -> Result<Json<ActivationValidationResponse>, ApiError> {
    let id: ProjectId = project_id
        .parse()
        .map_err(|_| ApiError::not_found("project", &project_id))?;

    let repo = PgProjectRepository::new(pool);

    let project = repo
        .find_by_id(&id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to find project {}: {:?}", project_id, e);
            ApiError::Internal(anyhow::anyhow!("{}", e))
        })?
        .ok_or_else(|| ApiError::not_found("project", &project_id))?;

    let checks = build_activation_checks(&project);
    let has_blockers = checks.iter().any(|c| c.severity == "blocker");

    Ok(Json(ActivationValidationResponse {
        can_activate: !has_blockers,
        checks,
    }))
}

/// Build detailed activation checks for a project
fn build_activation_checks(project: &Project) -> Vec<ActivationCheck> {
    let mut checks = Vec::new();

    // Status check
    if project.status != ProjectStatus::Draft {
        checks.push(ActivationCheck {
            id: "status_draft".to_string(),
            category: "workflow".to_string(),
            severity: "blocker".to_string(),
            message: "Project must be in draft status to activate".to_string(),
            fix_action: None,
        });
    } else {
        checks.push(ActivationCheck {
            id: "status_draft".to_string(),
            category: "workflow".to_string(),
            severity: "passed".to_string(),
            message: "Project is in draft status".to_string(),
            fix_action: None,
        });
    }

    // Workflow check
    if project.workflow_id.is_some() {
        checks.push(ActivationCheck {
            id: "has_workflow".to_string(),
            category: "workflow".to_string(),
            severity: "passed".to_string(),
            message: "Workflow is configured".to_string(),
            fix_action: None,
        });
    } else {
        checks.push(ActivationCheck {
            id: "has_workflow".to_string(),
            category: "workflow".to_string(),
            severity: "warning".to_string(),
            message: "No workflow configured (using default)".to_string(),
            fix_action: Some("workflow".to_string()),
        });
    }

    // Layout check
    if project.layout_id.is_some() {
        checks.push(ActivationCheck {
            id: "has_layout".to_string(),
            category: "layouts".to_string(),
            severity: "passed".to_string(),
            message: "Layout is configured".to_string(),
            fix_action: None,
        });
    } else {
        checks.push(ActivationCheck {
            id: "has_layout".to_string(),
            category: "layouts".to_string(),
            severity: "blocker".to_string(),
            message: "No annotation layout configured".to_string(),
            fix_action: Some("layouts".to_string()),
        });
    }

    // Team check
    if project.team_id.is_some() {
        checks.push(ActivationCheck {
            id: "has_team".to_string(),
            category: "permissions".to_string(),
            severity: "passed".to_string(),
            message: "Team is assigned".to_string(),
            fix_action: None,
        });
    } else {
        checks.push(ActivationCheck {
            id: "has_team".to_string(),
            category: "permissions".to_string(),
            severity: "warning".to_string(),
            message: "No team assigned".to_string(),
            fix_action: Some("settings".to_string()),
        });
    }

    // Data source placeholder (would need to check data sources table)
    checks.push(ActivationCheck {
        id: "has_data_source".to_string(),
        category: "data_source".to_string(),
        severity: "warning".to_string(),
        message: "Data source configuration pending".to_string(),
        fix_action: Some("data-source".to_string()),
    });

    checks
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
    current_user: CurrentUser,
    Extension(pool): Extension<PgPool>,
    Json(req): Json<CloneProjectRequest>,
) -> Result<(StatusCode, Json<ProjectDetailResponse>), ApiError> {
    let id: ProjectId = project_id
        .parse()
        .map_err(|_| ApiError::not_found("project", &project_id))?;

    let repo = PgProjectRepository::new(pool);

    // Get source project
    let source = repo
        .find_by_id(&id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to find project {}: {:?}", project_id, e);
            ApiError::Internal(anyhow::anyhow!("{}", e))
        })?
        .ok_or_else(|| ApiError::not_found("project", &project_id))?;

    // Create new project with cloned data
    let new_name = req
        .new_name
        .unwrap_or_else(|| format!("{} (copy)", source.name));

    let cloned = repo
        .create_minimal(
            &new_name,
            source.description.as_deref(),
            &current_user.user_id,
        )
        .await
        .map_err(|e| {
            tracing::error!("Failed to clone project: {:?}", e);
            ApiError::Internal(anyhow::anyhow!("{}", e))
        })?;

    // Copy settings if requested
    if req.include_settings {
        let update = ExtendedProjectUpdate {
            project_type_id: source.project_type_id,
            team_id: source.team_id,
            tags: Some(source.tags),
            documentation: source.documentation,
            settings: Some(source.settings),
            ..Default::default()
        };

        let updated = repo
            .update_extended(&cloned.project_id, &update)
            .await
            .map_err(|e| {
                tracing::error!("Failed to apply settings to cloned project: {:?}", e);
                ApiError::Internal(anyhow::anyhow!("{}", e))
            })?;

        return Ok((
            StatusCode::CREATED,
            Json(ProjectDetailResponse::from(updated)),
        ));
    }

    Ok((
        StatusCode::CREATED,
        Json(ProjectDetailResponse::from(cloned)),
    ))
}

// =============================================================================
// Helper functions
// =============================================================================

fn parse_project_status(s: &str) -> Option<ProjectStatus> {
    match s.to_lowercase().as_str() {
        "draft" => Some(ProjectStatus::Draft),
        "active" => Some(ProjectStatus::Active),
        "paused" => Some(ProjectStatus::Paused),
        "completed" => Some(ProjectStatus::Completed),
        "archived" => Some(ProjectStatus::Archived),
        _ => None,
    }
}

fn parse_deadline_action(s: &str) -> Option<glyph_domain::DeadlineAction> {
    match s.to_lowercase().as_str() {
        "notify" => Some(glyph_domain::DeadlineAction::Notify),
        "pause" => Some(glyph_domain::DeadlineAction::Pause),
        "escalate" => Some(glyph_domain::DeadlineAction::Escalate),
        _ => None,
    }
}
