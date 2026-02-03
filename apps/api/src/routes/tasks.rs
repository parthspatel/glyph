//! Task CRUD endpoints

use axum::{
    extract::{Path, Query},
    http::StatusCode,
    routing::get,
    Extension, Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use utoipa::ToSchema;
use uuid::Uuid;

use glyph_db::{NewTask, Pagination, PgTaskRepository, TaskRepository, TaskUpdate as DbTaskUpdate};
use glyph_domain::{ProjectId, Task, TaskId, TaskStatus};

use crate::ApiError;

// =============================================================================
// Request/Response Types
// =============================================================================

/// Request to create a new task
#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateTaskRequest {
    pub input_data: serde_json::Value,
    pub priority: Option<i32>,
    pub metadata: Option<serde_json::Value>,
}

/// Request to update a task
#[derive(Debug, Deserialize, ToSchema)]
pub struct UpdateTaskRequest {
    pub status: Option<String>,
    pub priority: Option<i32>,
    pub metadata: Option<serde_json::Value>,
}

/// Query parameters for listing tasks
#[derive(Debug, Deserialize)]
pub struct ListTasksQuery {
    pub page: Option<i32>,
    pub per_page: Option<i32>,
    pub status: Option<String>,
}

/// Task response
#[derive(Debug, Serialize, ToSchema)]
pub struct TaskResponse {
    pub task_id: String,
    pub project_id: String,
    pub status: String,
    pub priority: i32,
    pub input_data: serde_json::Value,
    pub workflow_state: serde_json::Value,
    pub metadata: serde_json::Value,
    pub created_at: String,
    pub updated_at: String,
    pub completed_at: Option<String>,
}

impl From<Task> for TaskResponse {
    fn from(task: Task) -> Self {
        Self {
            task_id: task.task_id.to_string(),
            project_id: task.project_id.to_string(),
            status: format!("{:?}", task.status).to_lowercase(),
            priority: task.priority,
            input_data: task.input_data,
            workflow_state: serde_json::to_value(&task.workflow_state).unwrap_or_default(),
            metadata: task.metadata,
            created_at: task.created_at.to_rfc3339(),
            updated_at: task.updated_at.to_rfc3339(),
            completed_at: task.completed_at.map(|t| t.to_rfc3339()),
        }
    }
}

/// Paginated task list response
#[derive(Debug, Serialize, ToSchema)]
pub struct TaskListResponse {
    pub items: Vec<TaskResponse>,
    pub total: i64,
    pub page: i32,
    pub per_page: i32,
    pub total_pages: i32,
}

// =============================================================================
// Route Handlers
// =============================================================================

/// Create a new task for a project
#[utoipa::path(
    post,
    path = "/api/v1/projects/{project_id}/tasks",
    request_body = CreateTaskRequest,
    responses(
        (status = 201, description = "Task created", body = TaskResponse),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Project not found"),
    ),
    tag = "tasks"
)]
async fn create_task(
    Path(project_id): Path<Uuid>,
    Extension(pool): Extension<PgPool>,
    Json(req): Json<CreateTaskRequest>,
) -> Result<(StatusCode, Json<TaskResponse>), ApiError> {
    let repo = PgTaskRepository::new(pool);

    let new_task = NewTask {
        project_id: ProjectId::from_uuid(project_id),
        input_data: req.input_data,
        priority: req.priority,
        metadata: req.metadata,
    };

    let task = repo.create(&new_task).await.map_err(|e| match e {
        glyph_db::CreateTaskError::ProjectNotFound(id) => ApiError::NotFound {
            resource_type: "project",
            id: id.to_string(),
        },
        glyph_db::CreateTaskError::Database(e) => ApiError::Internal(e.into()),
    })?;

    Ok((StatusCode::CREATED, Json(TaskResponse::from(task))))
}

/// List tasks for a project
#[utoipa::path(
    get,
    path = "/api/v1/projects/{project_id}/tasks",
    params(
        ("project_id" = Uuid, Path, description = "Project ID"),
        ("page" = Option<i32>, Query, description = "Page number (default: 1)"),
        ("per_page" = Option<i32>, Query, description = "Items per page (default: 20, max: 100)"),
        ("status" = Option<String>, Query, description = "Filter by status"),
    ),
    responses(
        (status = 200, description = "Task list", body = TaskListResponse),
    ),
    tag = "tasks"
)]
async fn list_project_tasks(
    Path(project_id): Path<Uuid>,
    Query(query): Query<ListTasksQuery>,
    Extension(pool): Extension<PgPool>,
) -> Result<Json<TaskListResponse>, ApiError> {
    let repo = PgTaskRepository::new(pool);

    let page = query.page.unwrap_or(1).max(1);
    let per_page = query.per_page.unwrap_or(20).clamp(1, 100);
    let offset = ((page - 1) * per_page) as i64;

    let pagination = Pagination {
        limit: per_page as i64,
        offset,
        sort_by: None,
        sort_order: glyph_db::SortOrder::Desc,
    };

    let project_id = ProjectId::from_uuid(project_id);

    let result = if let Some(status_str) = &query.status {
        let status = parse_task_status(status_str);
        repo.list_by_project_with_status(&project_id, status, pagination)
            .await
            .map_err(|e| ApiError::Internal(e.into()))?
    } else {
        repo.list_by_project(&project_id, pagination)
            .await
            .map_err(|e| ApiError::Internal(e.into()))?
    };

    let total_pages = ((result.total as f64) / (per_page as f64)).ceil() as i32;

    Ok(Json(TaskListResponse {
        items: result.items.into_iter().map(TaskResponse::from).collect(),
        total: result.total,
        page,
        per_page,
        total_pages,
    }))
}

/// Get a single task by ID
#[utoipa::path(
    get,
    path = "/api/v1/tasks/{task_id}",
    params(
        ("task_id" = Uuid, Path, description = "Task ID"),
    ),
    responses(
        (status = 200, description = "Task found", body = TaskResponse),
        (status = 404, description = "Task not found"),
    ),
    tag = "tasks"
)]
async fn get_task(
    Path(task_id): Path<Uuid>,
    Extension(pool): Extension<PgPool>,
) -> Result<Json<TaskResponse>, ApiError> {
    let repo = PgTaskRepository::new(pool);

    let task_id = TaskId::from_uuid(task_id);
    let task = repo
        .find_by_id(&task_id)
        .await
        .map_err(|e| match e {
            glyph_db::FindTaskError::NotFound(id) => ApiError::NotFound {
                resource_type: "task",
                id: id.to_string(),
            },
            glyph_db::FindTaskError::Database(e) => ApiError::Internal(e.into()),
        })?
        .ok_or_else(|| ApiError::NotFound {
            resource_type: "task",
            id: task_id.to_string(),
        })?;

    Ok(Json(TaskResponse::from(task)))
}

/// Update a task
#[utoipa::path(
    patch,
    path = "/api/v1/tasks/{task_id}",
    request_body = UpdateTaskRequest,
    params(
        ("task_id" = Uuid, Path, description = "Task ID"),
    ),
    responses(
        (status = 200, description = "Task updated", body = TaskResponse),
        (status = 404, description = "Task not found"),
    ),
    tag = "tasks"
)]
async fn update_task(
    Path(task_id): Path<Uuid>,
    Extension(pool): Extension<PgPool>,
    Json(req): Json<UpdateTaskRequest>,
) -> Result<Json<TaskResponse>, ApiError> {
    let repo = PgTaskRepository::new(pool);

    let task_id = TaskId::from_uuid(task_id);
    let update = DbTaskUpdate {
        status: req.status.as_deref().map(parse_task_status),
        priority: req.priority,
        metadata: req.metadata,
    };

    let task = repo.update(&task_id, &update).await.map_err(|e| match e {
        glyph_db::UpdateTaskError::NotFound(id) => ApiError::NotFound {
            resource_type: "task",
            id: id.to_string(),
        },
        glyph_db::UpdateTaskError::InvalidStatusTransition => ApiError::BadRequest {
            code: "task.invalid_status_transition",
            message: "Invalid status transition".to_string(),
        },
        glyph_db::UpdateTaskError::Database(e) => ApiError::Internal(e.into()),
    })?;

    Ok(Json(TaskResponse::from(task)))
}

/// Delete a task (soft delete)
#[utoipa::path(
    delete,
    path = "/api/v1/tasks/{task_id}",
    params(
        ("task_id" = Uuid, Path, description = "Task ID"),
    ),
    responses(
        (status = 204, description = "Task deleted"),
        (status = 404, description = "Task not found"),
    ),
    tag = "tasks"
)]
async fn delete_task(
    Path(task_id): Path<Uuid>,
    Extension(pool): Extension<PgPool>,
) -> Result<StatusCode, ApiError> {
    let repo = PgTaskRepository::new(pool);

    let task_id = TaskId::from_uuid(task_id);
    repo.soft_delete(&task_id).await.map_err(|e| match e {
        glyph_db::UpdateTaskError::NotFound(id) => ApiError::NotFound {
            resource_type: "task",
            id: id.to_string(),
        },
        glyph_db::UpdateTaskError::InvalidStatusTransition => ApiError::BadRequest {
            code: "task.invalid_status_transition",
            message: "Invalid status transition".to_string(),
        },
        glyph_db::UpdateTaskError::Database(e) => ApiError::Internal(e.into()),
    })?;

    Ok(StatusCode::NO_CONTENT)
}

/// List all tasks (global)
async fn list_tasks(
    Query(query): Query<ListTasksQuery>,
    Extension(_pool): Extension<PgPool>,
) -> Result<Json<serde_json::Value>, ApiError> {
    // For now, return an empty list - full implementation would need a list_all method
    let page = query.page.unwrap_or(1);
    let per_page = query.per_page.unwrap_or(20);

    Ok(Json(serde_json::json!({
        "items": [],
        "total": 0,
        "page": page,
        "per_page": per_page,
        "total_pages": 0
    })))
}

// =============================================================================
// Router
// =============================================================================

/// Global task routes (/tasks)
pub fn routes() -> Router {
    Router::new().route("/", get(list_tasks)).route(
        "/{task_id}",
        get(get_task).patch(update_task).delete(delete_task),
    )
}

/// Project-scoped task routes (/projects/{project_id}/tasks)
pub fn project_routes() -> Router {
    Router::new().route("/", get(list_project_tasks).post(create_task))
}

// =============================================================================
// Helpers
// =============================================================================

fn parse_task_status(s: &str) -> TaskStatus {
    match s.to_lowercase().as_str() {
        "pending" => TaskStatus::Pending,
        "assigned" => TaskStatus::Assigned,
        "in_progress" => TaskStatus::InProgress,
        "review" => TaskStatus::Review,
        "adjudication" => TaskStatus::Adjudication,
        "completed" => TaskStatus::Completed,
        "failed" => TaskStatus::Failed,
        "cancelled" => TaskStatus::Cancelled,
        "deleted" => TaskStatus::Deleted,
        _ => TaskStatus::Pending,
    }
}
