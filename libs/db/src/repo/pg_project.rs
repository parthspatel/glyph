//! PostgreSQL implementation of ProjectRepository
//!
//! Full implementation with audit trail integration.

use async_trait::async_trait;
use sqlx::PgPool;

use glyph_domain::{DeadlineAction, Project, ProjectId, ProjectSettings, ProjectStatus, UserId};

use crate::audit::{AuditAction, AuditActorType, AuditEvent, AuditWriter, SYSTEM_ACTOR_ID};
use crate::pagination::{Page, Pagination};
use crate::repo::errors::{CreateProjectError, FindProjectError, UpdateProjectError};
use crate::repo::traits::{NewProject, ProjectRepository, ProjectUpdate};

/// PostgreSQL project repository
pub struct PgProjectRepository {
    pool: PgPool,
    audit: AuditWriter,
}

impl PgProjectRepository {
    /// Create a new PostgreSQL project repository
    pub fn new(pool: PgPool) -> Self {
        let audit = AuditWriter::new(pool.clone());
        Self { pool, audit }
    }
}

#[async_trait]
impl ProjectRepository for PgProjectRepository {
    async fn find_by_id(&self, id: &ProjectId) -> Result<Option<Project>, FindProjectError> {
        let row = sqlx::query_as::<_, ProjectRow>(
            r#"
            SELECT project_id::text, name, description, status::text,
                   project_type_id::text, workflow_id::text, layout_id,
                   team_id::text, settings, tags, documentation,
                   deadline, deadline_action,
                   created_at, updated_at, created_by::text
            FROM projects
            WHERE project_id = $1 AND status != 'deleted'
            "#,
        )
        .bind(id.as_uuid())
        .fetch_optional(&self.pool)
        .await
        .map_err(FindProjectError::Database)?;

        row.map(|r| r.try_into())
            .transpose()
            .map_err(|_| FindProjectError::NotFound(id.clone()))
    }

    async fn create(&self, new_project: &NewProject) -> Result<Project, CreateProjectError> {
        let id = ProjectId::new();

        let row = sqlx::query_as::<_, ProjectRow>(
            r#"
            INSERT INTO projects (
                project_id, name, description, workflow_id, layout_id, created_by
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING project_id::text, name, description, status::text,
                      project_type_id::text, workflow_id::text, layout_id,
                      team_id::text, settings, tags, documentation,
                      deadline, deadline_action,
                      created_at, updated_at, created_by::text
            "#,
        )
        .bind(id.as_uuid())
        .bind(&new_project.name)
        .bind(&new_project.description)
        .bind(new_project.workflow_id.as_uuid())
        .bind(&new_project.layout_id)
        .bind(new_project.created_by.as_uuid())
        .fetch_one(&self.pool)
        .await
        .map_err(CreateProjectError::Database)?;

        let project: Project = row
            .try_into()
            .map_err(|_| CreateProjectError::Database(sqlx::Error::RowNotFound))?;

        // Record audit event
        self.audit
            .record_best_effort(AuditEvent {
                entity_type: "project",
                entity_id: project.project_id.to_string(),
                action: AuditAction::Create,
                actor_id: new_project.created_by.to_string(),
                actor_type: AuditActorType::User,
                data_snapshot: serde_json::to_value(&project).unwrap_or_default(),
                changes: None,
                request_id: None,
            })
            .await;

        Ok(project)
    }

    async fn update(
        &self,
        id: &ProjectId,
        update: &ProjectUpdate,
    ) -> Result<Project, UpdateProjectError> {
        // Fetch current state for audit diff
        let current = self
            .find_by_id(id)
            .await
            .map_err(|e| match e {
                FindProjectError::NotFound(id) => UpdateProjectError::NotFound(id),
                FindProjectError::Database(e) => UpdateProjectError::Database(e),
            })?
            .ok_or_else(|| UpdateProjectError::NotFound(id.clone()))?;

        let old_snapshot = serde_json::to_value(&current).unwrap_or_default();

        let row = sqlx::query_as::<_, ProjectRow>(
            r#"
            UPDATE projects
            SET name = COALESCE($2, name),
                description = COALESCE($3, description),
                status = COALESCE($4, status),
                updated_at = NOW()
            WHERE project_id = $1 AND status != 'deleted'
            RETURNING project_id::text, name, description, status::text,
                      project_type_id::text, workflow_id::text, layout_id,
                      team_id::text, settings, tags, documentation,
                      deadline, deadline_action,
                      created_at, updated_at, created_by::text
            "#,
        )
        .bind(id.as_uuid())
        .bind(&update.name)
        .bind(&update.description)
        .bind(update.status.map(|s| format!("{s:?}").to_lowercase()))
        .fetch_optional(&self.pool)
        .await
        .map_err(UpdateProjectError::Database)?
        .ok_or_else(|| UpdateProjectError::NotFound(id.clone()))?;

        let project: Project = row
            .try_into()
            .map_err(|_| UpdateProjectError::Database(sqlx::Error::RowNotFound))?;

        let new_snapshot = serde_json::to_value(&project).unwrap_or_default();
        let changes = AuditWriter::compute_changes(&old_snapshot, &new_snapshot);

        // Record audit event
        self.audit
            .record_best_effort(AuditEvent {
                entity_type: "project",
                entity_id: project.project_id.to_string(),
                action: AuditAction::Update,
                actor_id: SYSTEM_ACTOR_ID.to_string(),
                actor_type: AuditActorType::System,
                data_snapshot: new_snapshot,
                changes,
                request_id: None,
            })
            .await;

        Ok(project)
    }

    async fn list(&self, pagination: Pagination) -> Result<Page<Project>, sqlx::Error> {
        let total =
            sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM projects WHERE status != 'deleted'")
                .fetch_one(&self.pool)
                .await?;

        let rows = sqlx::query_as::<_, ProjectRow>(
            r#"
            SELECT project_id::text, name, description, status::text,
                   project_type_id::text, workflow_id::text, layout_id,
                   team_id::text, settings, tags, documentation,
                   deadline, deadline_action,
                   created_at, updated_at, created_by::text
            FROM projects
            WHERE status != 'deleted'
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
            "#,
        )
        .bind(pagination.clamped_limit())
        .bind(pagination.offset)
        .fetch_all(&self.pool)
        .await?;

        let projects: Vec<Project> = rows.into_iter().filter_map(|r| r.try_into().ok()).collect();

        Ok(Page::new(projects, total, &pagination))
    }

    async fn soft_delete(&self, id: &ProjectId) -> Result<(), UpdateProjectError> {
        let result = sqlx::query(
            "UPDATE projects SET status = 'deleted', updated_at = NOW() WHERE project_id = $1",
        )
        .bind(id.as_uuid())
        .execute(&self.pool)
        .await
        .map_err(UpdateProjectError::Database)?;

        if result.rows_affected() == 0 {
            return Err(UpdateProjectError::NotFound(id.clone()));
        }

        // Record audit event
        self.audit
            .record_best_effort(AuditEvent {
                entity_type: "project",
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
}

// =============================================================================
// Extended methods (not part of trait)
// =============================================================================

impl PgProjectRepository {
    /// Create a project with minimal fields (for frontend create flow)
    pub async fn create_minimal(
        &self,
        name: &str,
        description: Option<&str>,
        created_by: &UserId,
    ) -> Result<Project, CreateProjectError> {
        let id = ProjectId::new();

        let row = sqlx::query_as::<_, ProjectRow>(
            r#"
            INSERT INTO projects (project_id, name, description, created_by)
            VALUES ($1, $2, $3, $4)
            RETURNING project_id::text, name, description, status::text,
                      project_type_id::text, workflow_id::text, layout_id,
                      team_id::text, settings, tags, documentation,
                      deadline, deadline_action,
                      created_at, updated_at, created_by::text
            "#,
        )
        .bind(id.as_uuid())
        .bind(name)
        .bind(description)
        .bind(created_by.as_uuid())
        .fetch_one(&self.pool)
        .await
        .map_err(CreateProjectError::Database)?;

        let project: Project = row
            .try_into()
            .map_err(|_| CreateProjectError::Database(sqlx::Error::RowNotFound))?;

        // Record audit event
        self.audit
            .record_best_effort(AuditEvent {
                entity_type: "project",
                entity_id: project.project_id.to_string(),
                action: AuditAction::Create,
                actor_id: created_by.to_string(),
                actor_type: AuditActorType::User,
                data_snapshot: serde_json::to_value(&project).unwrap_or_default(),
                changes: None,
                request_id: None,
            })
            .await;

        Ok(project)
    }

    /// Update project with extended fields
    pub async fn update_extended(
        &self,
        id: &ProjectId,
        update: &ExtendedProjectUpdate,
    ) -> Result<Project, UpdateProjectError> {
        let row = sqlx::query_as::<_, ProjectRow>(
            r#"
            UPDATE projects
            SET name = COALESCE($2, name),
                description = COALESCE($3, description),
                status = COALESCE($4, status),
                project_type_id = COALESCE($5, project_type_id),
                team_id = COALESCE($6, team_id),
                tags = COALESCE($7, tags),
                documentation = COALESCE($8, documentation),
                deadline = COALESCE($9, deadline),
                deadline_action = COALESCE($10, deadline_action),
                settings = COALESCE($11, settings),
                updated_at = NOW()
            WHERE project_id = $1 AND status != 'deleted'
            RETURNING project_id::text, name, description, status::text,
                      project_type_id::text, workflow_id::text, layout_id,
                      team_id::text, settings, tags, documentation,
                      deadline, deadline_action,
                      created_at, updated_at, created_by::text
            "#,
        )
        .bind(id.as_uuid())
        .bind(&update.name)
        .bind(&update.description)
        .bind(update.status.map(|s| format!("{s:?}").to_lowercase()))
        .bind(update.project_type_id.as_ref().map(|id| id.as_uuid()))
        .bind(update.team_id.as_ref().map(|id| id.as_uuid()))
        .bind(
            update
                .tags
                .as_ref()
                .map(|t| serde_json::to_value(t).unwrap_or_default()),
        )
        .bind(&update.documentation)
        .bind(update.deadline)
        .bind(
            update
                .deadline_action
                .map(|a| format!("{a:?}").to_lowercase()),
        )
        .bind(
            update
                .settings
                .as_ref()
                .map(|s| serde_json::to_value(s).unwrap_or_default()),
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(UpdateProjectError::Database)?
        .ok_or_else(|| UpdateProjectError::NotFound(id.clone()))?;

        let project: Project = row
            .try_into()
            .map_err(|_| UpdateProjectError::Database(sqlx::Error::RowNotFound))?;

        Ok(project)
    }
}

/// Extended update input with all project fields
#[derive(Debug, Clone, Default)]
pub struct ExtendedProjectUpdate {
    pub name: Option<String>,
    pub description: Option<String>,
    pub status: Option<ProjectStatus>,
    pub project_type_id: Option<glyph_domain::ProjectTypeId>,
    pub team_id: Option<glyph_domain::TeamId>,
    pub tags: Option<Vec<String>>,
    pub documentation: Option<String>,
    pub deadline: Option<chrono::DateTime<chrono::Utc>>,
    pub deadline_action: Option<DeadlineAction>,
    pub settings: Option<ProjectSettings>,
}

// =============================================================================
// Internal row type for SQLx mapping
// =============================================================================

#[derive(sqlx::FromRow)]
struct ProjectRow {
    project_id: String,
    name: String,
    description: Option<String>,
    status: String,
    project_type_id: Option<String>,
    workflow_id: Option<String>,
    layout_id: Option<String>,
    team_id: Option<String>,
    settings: serde_json::Value,
    tags: serde_json::Value,
    documentation: Option<String>,
    deadline: Option<chrono::DateTime<chrono::Utc>>,
    deadline_action: Option<String>,
    created_at: chrono::DateTime<chrono::Utc>,
    updated_at: chrono::DateTime<chrono::Utc>,
    created_by: String,
}

impl TryFrom<ProjectRow> for Project {
    type Error = glyph_domain::IdParseError;

    fn try_from(row: ProjectRow) -> Result<Self, Self::Error> {
        use glyph_domain::IdParseError;

        // Parse project_id
        let project_uuid: uuid::Uuid = row
            .project_id
            .parse()
            .map_err(|e: uuid::Error| IdParseError::InvalidUuid(e.to_string()))?;

        // Parse created_by
        let created_by_uuid: uuid::Uuid = row
            .created_by
            .parse()
            .map_err(|e: uuid::Error| IdParseError::InvalidUuid(e.to_string()))?;

        // Parse optional IDs
        let project_type_id = row
            .project_type_id
            .map(|s| {
                s.parse::<uuid::Uuid>()
                    .map(glyph_domain::ProjectTypeId::from_uuid)
            })
            .transpose()
            .map_err(|e: uuid::Error| IdParseError::InvalidUuid(e.to_string()))?;

        let workflow_id = row
            .workflow_id
            .map(|s| {
                s.parse::<uuid::Uuid>()
                    .map(glyph_domain::WorkflowId::from_uuid)
            })
            .transpose()
            .map_err(|e: uuid::Error| IdParseError::InvalidUuid(e.to_string()))?;

        let team_id = row
            .team_id
            .map(|s| s.parse::<uuid::Uuid>().map(glyph_domain::TeamId::from_uuid))
            .transpose()
            .map_err(|e: uuid::Error| IdParseError::InvalidUuid(e.to_string()))?;

        Ok(Project {
            project_id: ProjectId::from_uuid(project_uuid),
            name: row.name,
            description: row.description,
            status: parse_project_status(&row.status),
            project_type_id,
            workflow_id,
            layout_id: row.layout_id,
            team_id,
            settings: serde_json::from_value(row.settings).unwrap_or_default(),
            tags: serde_json::from_value(row.tags).unwrap_or_default(),
            documentation: row.documentation,
            deadline: row.deadline,
            deadline_action: row.deadline_action.as_deref().map(parse_deadline_action),
            created_at: row.created_at,
            updated_at: row.updated_at,
            created_by: UserId::from_uuid(created_by_uuid),
        })
    }
}

fn parse_project_status(s: &str) -> ProjectStatus {
    match s {
        "draft" => ProjectStatus::Draft,
        "active" => ProjectStatus::Active,
        "paused" => ProjectStatus::Paused,
        "completed" => ProjectStatus::Completed,
        "archived" => ProjectStatus::Archived,
        "deleted" => ProjectStatus::Deleted,
        _ => ProjectStatus::Draft,
    }
}

fn parse_deadline_action(s: &str) -> DeadlineAction {
    match s {
        "notify" => DeadlineAction::Notify,
        "pause" => DeadlineAction::Pause,
        "escalate" => DeadlineAction::Escalate,
        _ => DeadlineAction::Notify,
    }
}
