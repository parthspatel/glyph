//! PostgreSQL implementation of TaskRepository
//!
//! Full implementation with audit trail integration.

use async_trait::async_trait;
use sqlx::PgPool;

use glyph_domain::{ProjectId, Task, TaskId, TaskStatus, WorkflowState};

use crate::audit::{AuditAction, AuditActorType, AuditEvent, AuditWriter, SYSTEM_ACTOR_ID};
use crate::pagination::{Page, Pagination};
use crate::repo::errors::{CreateTaskError, FindTaskError, UpdateTaskError};
use crate::repo::traits::{NewTask, TaskRepository, TaskUpdate};

/// PostgreSQL task repository
pub struct PgTaskRepository {
    pool: PgPool,
    audit: AuditWriter,
}

impl PgTaskRepository {
    /// Create a new PostgreSQL task repository
    pub fn new(pool: PgPool) -> Self {
        let audit = AuditWriter::new(pool.clone());
        Self { pool, audit }
    }
}

#[async_trait]
impl TaskRepository for PgTaskRepository {
    async fn find_by_id(&self, id: &TaskId) -> Result<Option<Task>, FindTaskError> {
        let row = sqlx::query_as::<_, TaskRow>(
            r#"
            SELECT task_id::text, project_id::text, status::text, priority,
                   input_data, workflow_state, metadata,
                   created_at, updated_at, completed_at
            FROM tasks
            WHERE task_id = $1 AND status != 'deleted'
            "#,
        )
        .bind(id.as_uuid())
        .fetch_optional(&self.pool)
        .await
        .map_err(FindTaskError::Database)?;

        row.map(|r| r.try_into())
            .transpose()
            .map_err(|_| FindTaskError::NotFound(id.clone()))
    }

    async fn create(&self, new_task: &NewTask) -> Result<Task, CreateTaskError> {
        let id = TaskId::new();

        let row = sqlx::query_as::<_, TaskRow>(
            r#"
            INSERT INTO tasks (
                task_id, project_id, input_data, priority, metadata
            )
            VALUES ($1, $2, $3, COALESCE($4, 0), COALESCE($5, '{}'))
            RETURNING task_id::text, project_id::text, status::text, priority,
                      input_data, workflow_state, metadata,
                      created_at, updated_at, completed_at
            "#,
        )
        .bind(id.as_uuid())
        .bind(new_task.project_id.as_uuid())
        .bind(&new_task.input_data)
        .bind(new_task.priority)
        .bind(&new_task.metadata)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| {
            // Check for foreign key violation (project not found)
            if let Some(db_err) = e.as_database_error() {
                if db_err.constraint() == Some("tasks_project_id_fkey") {
                    return CreateTaskError::ProjectNotFound(new_task.project_id.clone());
                }
            }
            CreateTaskError::Database(e)
        })?;

        let task: Task = row
            .try_into()
            .map_err(|_| CreateTaskError::Database(sqlx::Error::RowNotFound))?;

        // Record audit event
        self.audit
            .record_best_effort(AuditEvent {
                entity_type: "task",
                entity_id: task.task_id.to_string(),
                action: AuditAction::Create,
                actor_id: SYSTEM_ACTOR_ID.to_string(),
                actor_type: AuditActorType::System,
                data_snapshot: serde_json::to_value(&task).unwrap_or_default(),
                changes: None,
                request_id: None,
            })
            .await;

        Ok(task)
    }

    async fn update(&self, id: &TaskId, update: &TaskUpdate) -> Result<Task, UpdateTaskError> {
        // Fetch current state for audit diff
        let current = self
            .find_by_id(id)
            .await
            .map_err(|e| match e {
                FindTaskError::NotFound(id) => UpdateTaskError::NotFound(id),
                FindTaskError::Database(e) => UpdateTaskError::Database(e),
            })?
            .ok_or_else(|| UpdateTaskError::NotFound(id.clone()))?;

        let old_snapshot = serde_json::to_value(&current).unwrap_or_default();

        // Determine if we need to set completed_at
        let set_completed =
            update.status == Some(TaskStatus::Completed) && current.status != TaskStatus::Completed;

        let row = sqlx::query_as::<_, TaskRow>(
            r#"
            UPDATE tasks
            SET status = COALESCE($2, status),
                priority = COALESCE($3, priority),
                metadata = COALESCE($4, metadata),
                updated_at = NOW(),
                completed_at = CASE
                    WHEN $5 THEN NOW()
                    ELSE completed_at
                END
            WHERE task_id = $1 AND status != 'deleted'
            RETURNING task_id::text, project_id::text, status::text, priority,
                      input_data, workflow_state, metadata,
                      created_at, updated_at, completed_at
            "#,
        )
        .bind(id.as_uuid())
        .bind(update.status.map(|s| format!("{s:?}").to_lowercase()))
        .bind(update.priority)
        .bind(&update.metadata)
        .bind(set_completed)
        .fetch_optional(&self.pool)
        .await
        .map_err(UpdateTaskError::Database)?
        .ok_or_else(|| UpdateTaskError::NotFound(id.clone()))?;

        let task: Task = row
            .try_into()
            .map_err(|_| UpdateTaskError::Database(sqlx::Error::RowNotFound))?;

        let new_snapshot = serde_json::to_value(&task).unwrap_or_default();
        let changes = AuditWriter::compute_changes(&old_snapshot, &new_snapshot);

        // Record audit event
        self.audit
            .record_best_effort(AuditEvent {
                entity_type: "task",
                entity_id: task.task_id.to_string(),
                action: AuditAction::Update,
                actor_id: SYSTEM_ACTOR_ID.to_string(),
                actor_type: AuditActorType::System,
                data_snapshot: new_snapshot,
                changes,
                request_id: None,
            })
            .await;

        Ok(task)
    }

    async fn list_by_project(
        &self,
        project_id: &ProjectId,
        pagination: Pagination,
    ) -> Result<Page<Task>, sqlx::Error> {
        let total = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM tasks WHERE project_id = $1 AND status != 'deleted'",
        )
        .bind(project_id.as_uuid())
        .fetch_one(&self.pool)
        .await?;

        let rows = sqlx::query_as::<_, TaskRow>(
            r#"
            SELECT task_id::text, project_id::text, status::text, priority,
                   input_data, workflow_state, metadata,
                   created_at, updated_at, completed_at
            FROM tasks
            WHERE project_id = $1 AND status != 'deleted'
            ORDER BY priority DESC, created_at DESC
            LIMIT $2 OFFSET $3
            "#,
        )
        .bind(project_id.as_uuid())
        .bind(pagination.clamped_limit())
        .bind(pagination.offset)
        .fetch_all(&self.pool)
        .await?;

        let tasks: Vec<Task> = rows.into_iter().filter_map(|r| r.try_into().ok()).collect();

        Ok(Page::new(tasks, total, &pagination))
    }

    async fn soft_delete(&self, id: &TaskId) -> Result<(), UpdateTaskError> {
        let result = sqlx::query(
            "UPDATE tasks SET status = 'deleted', updated_at = NOW() WHERE task_id = $1",
        )
        .bind(id.as_uuid())
        .execute(&self.pool)
        .await
        .map_err(UpdateTaskError::Database)?;

        if result.rows_affected() == 0 {
            return Err(UpdateTaskError::NotFound(id.clone()));
        }

        // Record audit event
        self.audit
            .record_best_effort(AuditEvent {
                entity_type: "task",
                entity_id: id.to_string(),
                action: AuditAction::Delete,
                actor_id: SYSTEM_ACTOR_ID.to_string(),
                actor_type: AuditActorType::System,
                data_snapshot: serde_json::json!({"status": "deleted"}),
                changes: None,
                request_id: None,
            })
            .await;

        Ok(())
    }

    async fn set_cooldown(
        &self,
        id: &TaskId,
        until: chrono::DateTime<chrono::Utc>,
    ) -> Result<(), UpdateTaskError> {
        let result = sqlx::query(
            "UPDATE tasks SET cooldown_until = $2, updated_at = NOW() WHERE task_id = $1",
        )
        .bind(id.as_uuid())
        .bind(until)
        .execute(&self.pool)
        .await
        .map_err(UpdateTaskError::Database)?;

        if result.rows_affected() == 0 {
            return Err(UpdateTaskError::NotFound(id.clone()));
        }

        Ok(())
    }
}

// =============================================================================
// Extended methods (not part of trait)
// =============================================================================

impl PgTaskRepository {
    /// Find a task by ID and project ID (more efficient for partitioned table)
    pub async fn find_by_id_and_project(
        &self,
        id: &TaskId,
        project_id: &ProjectId,
    ) -> Result<Option<Task>, FindTaskError> {
        let row = sqlx::query_as::<_, TaskRow>(
            r#"
            SELECT task_id::text, project_id::text, status::text, priority,
                   input_data, workflow_state, metadata,
                   created_at, updated_at, completed_at
            FROM tasks
            WHERE task_id = $1 AND project_id = $2 AND status != 'deleted'
            "#,
        )
        .bind(id.as_uuid())
        .bind(project_id.as_uuid())
        .fetch_optional(&self.pool)
        .await
        .map_err(FindTaskError::Database)?;

        row.map(|r| r.try_into())
            .transpose()
            .map_err(|_| FindTaskError::NotFound(id.clone()))
    }

    /// Update workflow state for a task
    pub async fn update_workflow_state(
        &self,
        id: &TaskId,
        workflow_state: &WorkflowState,
    ) -> Result<Task, UpdateTaskError> {
        let row = sqlx::query_as::<_, TaskRow>(
            r#"
            UPDATE tasks
            SET workflow_state = $2,
                updated_at = NOW()
            WHERE task_id = $1 AND status != 'deleted'
            RETURNING task_id::text, project_id::text, status::text, priority,
                      input_data, workflow_state, metadata,
                      created_at, updated_at, completed_at
            "#,
        )
        .bind(id.as_uuid())
        .bind(serde_json::to_value(workflow_state).unwrap_or_default())
        .fetch_optional(&self.pool)
        .await
        .map_err(UpdateTaskError::Database)?
        .ok_or_else(|| UpdateTaskError::NotFound(id.clone()))?;

        row.try_into()
            .map_err(|_| UpdateTaskError::Database(sqlx::Error::RowNotFound))
    }

    /// List tasks by project with status filter
    pub async fn list_by_project_with_status(
        &self,
        project_id: &ProjectId,
        status: TaskStatus,
        pagination: Pagination,
    ) -> Result<Page<Task>, sqlx::Error> {
        let status_str = format!("{status:?}").to_lowercase();

        let total = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM tasks WHERE project_id = $1 AND status = $2::task_status",
        )
        .bind(project_id.as_uuid())
        .bind(&status_str)
        .fetch_one(&self.pool)
        .await?;

        let rows = sqlx::query_as::<_, TaskRow>(
            r#"
            SELECT task_id::text, project_id::text, status::text, priority,
                   input_data, workflow_state, metadata,
                   created_at, updated_at, completed_at
            FROM tasks
            WHERE project_id = $1 AND status = $2::task_status
            ORDER BY priority DESC, created_at DESC
            LIMIT $3 OFFSET $4
            "#,
        )
        .bind(project_id.as_uuid())
        .bind(&status_str)
        .bind(pagination.clamped_limit())
        .bind(pagination.offset)
        .fetch_all(&self.pool)
        .await?;

        let tasks: Vec<Task> = rows.into_iter().filter_map(|r| r.try_into().ok()).collect();

        Ok(Page::new(tasks, total, &pagination))
    }
}

// =============================================================================
// Internal row type for SQLx mapping
// =============================================================================

#[derive(sqlx::FromRow)]
struct TaskRow {
    task_id: String,
    project_id: String,
    status: String,
    priority: i32,
    input_data: serde_json::Value,
    workflow_state: serde_json::Value,
    metadata: serde_json::Value,
    created_at: chrono::DateTime<chrono::Utc>,
    updated_at: chrono::DateTime<chrono::Utc>,
    completed_at: Option<chrono::DateTime<chrono::Utc>>,
}

impl TryFrom<TaskRow> for Task {
    type Error = glyph_domain::IdParseError;

    fn try_from(row: TaskRow) -> Result<Self, Self::Error> {
        use glyph_domain::IdParseError;

        // Parse task_id
        let task_uuid: uuid::Uuid = row
            .task_id
            .parse()
            .map_err(|e: uuid::Error| IdParseError::InvalidUuid(e.to_string()))?;

        // Parse project_id
        let project_uuid: uuid::Uuid = row
            .project_id
            .parse()
            .map_err(|e: uuid::Error| IdParseError::InvalidUuid(e.to_string()))?;

        Ok(Task {
            task_id: TaskId::from_uuid(task_uuid),
            project_id: ProjectId::from_uuid(project_uuid),
            status: parse_task_status(&row.status),
            priority: row.priority,
            input_data: row.input_data,
            workflow_state: serde_json::from_value(row.workflow_state).unwrap_or_default(),
            metadata: row.metadata,
            created_at: row.created_at,
            updated_at: row.updated_at,
            completed_at: row.completed_at,
        })
    }
}

fn parse_task_status(s: &str) -> TaskStatus {
    match s {
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
