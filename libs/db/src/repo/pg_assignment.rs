//! PostgreSQL implementation of AssignmentRepository

use async_trait::async_trait;
use sqlx::PgPool;

use glyph_domain::{
    AssignmentId, AssignmentStatus, IdParseError, ProjectId, TaskAssignment, TaskId, UserId,
};

use crate::audit::{AuditAction, AuditActorType, AuditEvent, AuditWriter, SYSTEM_ACTOR_ID};
use crate::repo::errors::{CreateAssignmentError, FindAssignmentError, UpdateAssignmentError};
use crate::repo::traits::{AssignmentRepository, NewAssignment, RejectAssignment};

/// PostgreSQL assignment repository
pub struct PgAssignmentRepository {
    pool: PgPool,
    audit: AuditWriter,
}

impl PgAssignmentRepository {
    /// Create a new PostgreSQL assignment repository
    pub fn new(pool: PgPool) -> Self {
        let audit = AuditWriter::new(pool.clone());
        Self { pool, audit }
    }
}

#[async_trait]
impl AssignmentRepository for PgAssignmentRepository {
    async fn find_by_id(
        &self,
        id: &AssignmentId,
    ) -> Result<Option<TaskAssignment>, FindAssignmentError> {
        let row = sqlx::query_as::<_, AssignmentRow>(
            r#"
            SELECT assignment_id::text, task_id::text, project_id::text, step_id,
                   user_id::text, status::text, assigned_at, accepted_at, submitted_at,
                   time_spent_ms, assignment_metadata
            FROM task_assignments
            WHERE assignment_id = $1
            "#,
        )
        .bind(id.as_uuid())
        .fetch_optional(&self.pool)
        .await
        .map_err(FindAssignmentError::Database)?;

        row.map(|r| r.try_into())
            .transpose()
            .map_err(|_| FindAssignmentError::NotFound(id.clone()))
    }

    async fn create(
        &self,
        assignment: &NewAssignment,
    ) -> Result<TaskAssignment, CreateAssignmentError> {
        let id = AssignmentId::new();

        // Use INSERT with ON CONFLICT to handle race conditions atomically
        let row = sqlx::query_as::<_, AssignmentRow>(
            r#"
            INSERT INTO task_assignments (assignment_id, task_id, project_id, step_id, user_id)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (task_id, step_id, user_id) DO NOTHING
            RETURNING assignment_id::text, task_id::text, project_id::text, step_id,
                      user_id::text, status::text, assigned_at, accepted_at, submitted_at,
                      time_spent_ms, assignment_metadata
            "#,
        )
        .bind(id.as_uuid())
        .bind(assignment.task_id.as_uuid())
        .bind(assignment.project_id.as_uuid())
        .bind(&assignment.step_id)
        .bind(assignment.user_id.as_uuid())
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| {
            // Check for foreign key violations
            if let sqlx::Error::Database(ref db_err) = e {
                let constraint = db_err.constraint();
                if constraint == Some("task_assignments_user_id_fkey") {
                    return CreateAssignmentError::UserNotFound(assignment.user_id.clone());
                }
                if constraint == Some("task_assignments_project_id_task_id_fkey") {
                    return CreateAssignmentError::TaskNotFound(assignment.task_id.clone());
                }
            }
            CreateAssignmentError::Database(e)
        })?;

        // If no row returned, it was a duplicate
        let row = row.ok_or(CreateAssignmentError::DuplicateAssignment)?;

        let result: TaskAssignment = row
            .try_into()
            .map_err(|_| CreateAssignmentError::Database(sqlx::Error::RowNotFound))?;

        // Record audit event
        self.audit
            .record_best_effort(AuditEvent {
                entity_type: "assignment",
                entity_id: result.assignment_id.to_string(),
                action: AuditAction::Create,
                actor_id: SYSTEM_ACTOR_ID.to_string(),
                actor_type: AuditActorType::System,
                data_snapshot: serde_json::to_value(&result).unwrap_or_default(),
                changes: None,
                request_id: None,
            })
            .await;

        Ok(result)
    }

    async fn update_status(
        &self,
        id: &AssignmentId,
        status: AssignmentStatus,
    ) -> Result<TaskAssignment, UpdateAssignmentError> {
        let status_str = format!("{status:?}").to_lowercase();

        // Update status and set appropriate timestamp
        let row = sqlx::query_as::<_, AssignmentRow>(
            r#"
            UPDATE task_assignments
            SET status = $2::assignment_status,
                accepted_at = CASE WHEN $2 = 'accepted' THEN COALESCE(accepted_at, NOW()) ELSE accepted_at END,
                submitted_at = CASE WHEN $2 = 'submitted' THEN COALESCE(submitted_at, NOW()) ELSE submitted_at END
            WHERE assignment_id = $1
            RETURNING assignment_id::text, task_id::text, project_id::text, step_id,
                      user_id::text, status::text, assigned_at, accepted_at, submitted_at,
                      time_spent_ms, assignment_metadata
            "#,
        )
        .bind(id.as_uuid())
        .bind(&status_str)
        .fetch_optional(&self.pool)
        .await
        .map_err(UpdateAssignmentError::Database)?
        .ok_or_else(|| UpdateAssignmentError::NotFound(id.clone()))?;

        row.try_into()
            .map_err(|_| UpdateAssignmentError::Database(sqlx::Error::RowNotFound))
    }

    async fn list_by_user(
        &self,
        user_id: &UserId,
        status: Option<AssignmentStatus>,
    ) -> Result<Vec<TaskAssignment>, sqlx::Error> {
        let rows = match status {
            Some(s) => {
                let status_str = format!("{s:?}").to_lowercase();
                sqlx::query_as::<_, AssignmentRow>(
                    r#"
                    SELECT assignment_id::text, task_id::text, project_id::text, step_id,
                           user_id::text, status::text, assigned_at, accepted_at, submitted_at,
                           time_spent_ms, assignment_metadata
                    FROM task_assignments
                    WHERE user_id = $1 AND status = $2::assignment_status
                    ORDER BY assigned_at DESC
                    "#,
                )
                .bind(user_id.as_uuid())
                .bind(&status_str)
                .fetch_all(&self.pool)
                .await?
            }
            None => {
                sqlx::query_as::<_, AssignmentRow>(
                    r#"
                    SELECT assignment_id::text, task_id::text, project_id::text, step_id,
                           user_id::text, status::text, assigned_at, accepted_at, submitted_at,
                           time_spent_ms, assignment_metadata
                    FROM task_assignments
                    WHERE user_id = $1
                    ORDER BY assigned_at DESC
                    "#,
                )
                .bind(user_id.as_uuid())
                .fetch_all(&self.pool)
                .await?
            }
        };

        Ok(rows.into_iter().filter_map(|r| r.try_into().ok()).collect())
    }

    async fn list_by_task(&self, task_id: &TaskId) -> Result<Vec<TaskAssignment>, sqlx::Error> {
        let rows = sqlx::query_as::<_, AssignmentRow>(
            r#"
            SELECT assignment_id::text, task_id::text, project_id::text, step_id,
                   user_id::text, status::text, assigned_at, accepted_at, submitted_at,
                   time_spent_ms, assignment_metadata
            FROM task_assignments
            WHERE task_id = $1
            ORDER BY assigned_at DESC
            "#,
        )
        .bind(task_id.as_uuid())
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.into_iter().filter_map(|r| r.try_into().ok()).collect())
    }

    async fn reject(&self, reject: &RejectAssignment) -> Result<(), UpdateAssignmentError> {
        let result = sqlx::query(
            r#"
            UPDATE task_assignments
            SET status = 'rejected'
            WHERE assignment_id = $1
            "#,
        )
        .bind(reject.assignment_id.as_uuid())
        .execute(&self.pool)
        .await
        .map_err(UpdateAssignmentError::Database)?;

        if result.rows_affected() == 0 {
            return Err(UpdateAssignmentError::NotFound(
                reject.assignment_id.clone(),
            ));
        }

        // Record audit event
        self.audit
            .record_best_effort(AuditEvent {
                entity_type: "assignment",
                entity_id: reject.assignment_id.to_string(),
                action: AuditAction::Update,
                actor_id: SYSTEM_ACTOR_ID.to_string(),
                actor_type: AuditActorType::System,
                data_snapshot: serde_json::json!({
                    "status": "rejected",
                    "reject_reason": reject.reason
                }),
                changes: Some(serde_json::json!({
                    "status": {"old": null, "new": "rejected"}
                })),
                request_id: None,
            })
            .await;

        Ok(())
    }

    async fn has_user_worked_on_task(
        &self,
        user_id: &UserId,
        task_id: &TaskId,
        exclude_steps: &[String],
    ) -> Result<bool, sqlx::Error> {
        // Check if user has completed assignments on this task for any of the excluded steps
        let count = sqlx::query_scalar::<_, i64>(
            r#"
            SELECT COUNT(*)
            FROM task_assignments
            WHERE user_id = $1
              AND task_id = $2
              AND step_id = ANY($3)
              AND status IN ('submitted', 'accepted', 'in_progress')
            "#,
        )
        .bind(user_id.as_uuid())
        .bind(task_id.as_uuid())
        .bind(exclude_steps)
        .fetch_one(&self.pool)
        .await?;

        Ok(count > 0)
    }

    async fn count_active_by_user(&self, user_id: &UserId) -> Result<i64, sqlx::Error> {
        sqlx::query_scalar::<_, i64>(
            r#"
            SELECT COUNT(*)
            FROM task_assignments
            WHERE user_id = $1 AND status IN ('assigned', 'accepted', 'in_progress')
            "#,
        )
        .bind(user_id.as_uuid())
        .fetch_one(&self.pool)
        .await
    }
}

// Internal row type for SQLx mapping
#[derive(sqlx::FromRow)]
struct AssignmentRow {
    assignment_id: String,
    task_id: String,
    project_id: String,
    step_id: String,
    user_id: String,
    status: String,
    assigned_at: chrono::DateTime<chrono::Utc>,
    accepted_at: Option<chrono::DateTime<chrono::Utc>>,
    submitted_at: Option<chrono::DateTime<chrono::Utc>>,
    time_spent_ms: Option<i64>,
    assignment_metadata: serde_json::Value,
}

impl TryFrom<AssignmentRow> for TaskAssignment {
    type Error = IdParseError;

    fn try_from(row: AssignmentRow) -> Result<Self, Self::Error> {
        let assignment_uuid: uuid::Uuid = row
            .assignment_id
            .parse()
            .map_err(|e: uuid::Error| IdParseError::InvalidUuid(e.to_string()))?;
        let task_uuid: uuid::Uuid = row
            .task_id
            .parse()
            .map_err(|e: uuid::Error| IdParseError::InvalidUuid(e.to_string()))?;
        let project_uuid: uuid::Uuid = row
            .project_id
            .parse()
            .map_err(|e: uuid::Error| IdParseError::InvalidUuid(e.to_string()))?;
        let user_uuid: uuid::Uuid = row
            .user_id
            .parse()
            .map_err(|e: uuid::Error| IdParseError::InvalidUuid(e.to_string()))?;

        Ok(TaskAssignment {
            assignment_id: AssignmentId::from_uuid(assignment_uuid),
            task_id: TaskId::from_uuid(task_uuid),
            project_id: ProjectId::from_uuid(project_uuid),
            step_id: row.step_id,
            user_id: UserId::from_uuid(user_uuid),
            status: parse_assignment_status(&row.status),
            assigned_at: row.assigned_at,
            accepted_at: row.accepted_at,
            submitted_at: row.submitted_at,
            time_spent_ms: row.time_spent_ms,
            metadata: row.assignment_metadata,
        })
    }
}

fn parse_assignment_status(s: &str) -> AssignmentStatus {
    match s {
        "assigned" => AssignmentStatus::Assigned,
        "accepted" => AssignmentStatus::Accepted,
        "in_progress" => AssignmentStatus::InProgress,
        "submitted" => AssignmentStatus::Submitted,
        "expired" => AssignmentStatus::Expired,
        "reassigned" => AssignmentStatus::Reassigned,
        "rejected" => AssignmentStatus::Rejected,
        _ => AssignmentStatus::Assigned,
    }
}
