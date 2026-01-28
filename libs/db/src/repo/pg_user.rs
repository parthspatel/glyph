//! PostgreSQL implementation of UserRepository
//!
//! Full implementation with audit trail integration.

use async_trait::async_trait;
use sqlx::PgPool;

use glyph_domain::{QualityProfile, User, UserId, UserStatus};

use crate::audit::{AuditAction, AuditActorType, AuditEvent, AuditWriter, SYSTEM_ACTOR_ID};
use crate::pagination::{Page, Pagination};
use crate::repo::errors::{CreateUserError, FindUserError, ListUsersError, UpdateUserError};
use crate::repo::traits::{NewUser, UserRepository, UserUpdate};

/// PostgreSQL user repository
pub struct PgUserRepository {
    pool: PgPool,
    audit: AuditWriter,
}

impl PgUserRepository {
    /// Create a new PostgreSQL user repository
    pub fn new(pool: PgPool) -> Self {
        let audit = AuditWriter::new(pool.clone());
        Self { pool, audit }
    }
}

#[async_trait]
impl UserRepository for PgUserRepository {
    async fn find_by_id(&self, id: &UserId) -> Result<Option<User>, FindUserError> {
        let row = sqlx::query_as::<_, UserRow>(
            r#"
            SELECT user_id, email, display_name, status,
                   skills, roles, quality_profile, created_at, updated_at
            FROM users
            WHERE user_id = $1 AND status != 'deleted'
            "#,
        )
        .bind(id.to_string())
        .fetch_optional(&self.pool)
        .await
        .map_err(FindUserError::Database)?;

        row.map(|r| r.try_into())
            .transpose()
            .map_err(|_| FindUserError::NotFound(id.clone()))
    }

    async fn find_by_email(&self, email: &str) -> Result<Option<User>, FindUserError> {
        let row = sqlx::query_as::<_, UserRow>(
            r#"
            SELECT user_id, email, display_name, status,
                   skills, roles, quality_profile, created_at, updated_at
            FROM users
            WHERE email = $1 AND status != 'deleted'
            "#,
        )
        .bind(email)
        .fetch_optional(&self.pool)
        .await
        .map_err(FindUserError::Database)?;

        row.map(|r| r.try_into())
            .transpose()
            .map_err(|_| FindUserError::Database(sqlx::Error::RowNotFound))
    }

    async fn create(&self, new_user: &NewUser) -> Result<User, CreateUserError> {
        // Check for existing email
        let existing =
            sqlx::query_scalar::<_, String>("SELECT user_id FROM users WHERE email = $1")
                .bind(&new_user.email)
                .fetch_optional(&self.pool)
                .await
                .map_err(CreateUserError::Database)?;

        if existing.is_some() {
            return Err(CreateUserError::EmailExists(new_user.email.clone()));
        }

        let id = UserId::new();
        let row = sqlx::query_as::<_, UserRow>(
            r#"
            INSERT INTO users (user_id, email, display_name)
            VALUES ($1, $2, $3)
            RETURNING user_id, email, display_name, status,
                      skills, roles, quality_profile, created_at, updated_at
            "#,
        )
        .bind(id.to_string())
        .bind(&new_user.email)
        .bind(&new_user.display_name)
        .fetch_one(&self.pool)
        .await
        .map_err(CreateUserError::Database)?;

        let user: User = row
            .try_into()
            .map_err(|_| CreateUserError::Database(sqlx::Error::RowNotFound))?;

        // Record audit event (best effort)
        self.audit
            .record_best_effort(AuditEvent {
                entity_type: "user",
                entity_id: user.user_id.to_string(),
                action: AuditAction::Create,
                actor_id: SYSTEM_ACTOR_ID.to_string(),
                actor_type: AuditActorType::System,
                data_snapshot: serde_json::to_value(&user).unwrap_or_default(),
                changes: None,
                request_id: None,
            })
            .await;

        Ok(user)
    }

    async fn update(&self, id: &UserId, update: &UserUpdate) -> Result<User, UpdateUserError> {
        // Fetch current state for audit diff
        let current = self
            .find_by_id(id)
            .await
            .map_err(|e| match e {
                FindUserError::NotFound(id) => UpdateUserError::NotFound(id),
                FindUserError::Database(e) => UpdateUserError::Database(e),
            })?
            .ok_or_else(|| UpdateUserError::NotFound(id.clone()))?;

        let old_snapshot = serde_json::to_value(&current).unwrap_or_default();

        // Build dynamic update query
        let row = sqlx::query_as::<_, UserRow>(
            r#"
            UPDATE users
            SET display_name = COALESCE($2, display_name),
                status = COALESCE($3, status),
                updated_at = NOW()
            WHERE user_id = $1 AND status != 'deleted'
            RETURNING user_id, email, display_name, status,
                      skills, roles, quality_profile, created_at, updated_at
            "#,
        )
        .bind(id.to_string())
        .bind(&update.display_name)
        .bind(update.status.map(|s| format!("{s:?}").to_lowercase()))
        .fetch_optional(&self.pool)
        .await
        .map_err(UpdateUserError::Database)?
        .ok_or_else(|| UpdateUserError::NotFound(id.clone()))?;

        let user: User = row
            .try_into()
            .map_err(|_| UpdateUserError::Database(sqlx::Error::RowNotFound))?;

        let new_snapshot = serde_json::to_value(&user).unwrap_or_default();
        let changes = AuditWriter::compute_changes(&old_snapshot, &new_snapshot);

        // Record audit event
        self.audit
            .record_best_effort(AuditEvent {
                entity_type: "user",
                entity_id: user.user_id.to_string(),
                action: AuditAction::Update,
                actor_id: SYSTEM_ACTOR_ID.to_string(),
                actor_type: AuditActorType::System,
                data_snapshot: new_snapshot,
                changes,
                request_id: None,
            })
            .await;

        Ok(user)
    }

    async fn list(&self, pagination: Pagination) -> Result<Page<User>, ListUsersError> {
        let total =
            sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM users WHERE status != 'deleted'")
                .fetch_one(&self.pool)
                .await
                .map_err(ListUsersError::Database)?;

        let rows = sqlx::query_as::<_, UserRow>(
            r#"
            SELECT user_id, email, display_name, status,
                   skills, roles, quality_profile, created_at, updated_at
            FROM users
            WHERE status != 'deleted'
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
            "#,
        )
        .bind(pagination.clamped_limit())
        .bind(pagination.offset)
        .fetch_all(&self.pool)
        .await
        .map_err(ListUsersError::Database)?;

        let users: Vec<User> = rows.into_iter().filter_map(|r| r.try_into().ok()).collect();

        Ok(Page::new(users, total, &pagination))
    }

    async fn soft_delete(&self, id: &UserId) -> Result<(), UpdateUserError> {
        let result = sqlx::query(
            "UPDATE users SET status = 'deleted', updated_at = NOW() WHERE user_id = $1",
        )
        .bind(id.to_string())
        .execute(&self.pool)
        .await
        .map_err(UpdateUserError::Database)?;

        if result.rows_affected() == 0 {
            return Err(UpdateUserError::NotFound(id.clone()));
        }

        // Record audit event
        self.audit
            .record_best_effort(AuditEvent {
                entity_type: "user",
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

// Internal row type for SQLx mapping
#[derive(sqlx::FromRow)]
struct UserRow {
    user_id: String,
    email: String,
    display_name: String,
    status: String,
    skills: serde_json::Value,
    roles: serde_json::Value,
    quality_profile: serde_json::Value,
    created_at: chrono::DateTime<chrono::Utc>,
    updated_at: chrono::DateTime<chrono::Utc>,
}

impl TryFrom<UserRow> for User {
    type Error = glyph_domain::IdParseError;

    fn try_from(row: UserRow) -> Result<Self, Self::Error> {
        Ok(User {
            user_id: row.user_id.parse()?,
            email: row.email,
            display_name: row.display_name,
            status: parse_user_status(&row.status),
            skills: serde_json::from_value(row.skills).unwrap_or_default(),
            roles: serde_json::from_value(row.roles).unwrap_or_default(),
            quality_profile: serde_json::from_value(row.quality_profile)
                .unwrap_or_else(|_| QualityProfile::default()),
            created_at: row.created_at,
            updated_at: row.updated_at,
        })
    }
}

fn parse_user_status(s: &str) -> UserStatus {
    match s {
        "active" => UserStatus::Active,
        "inactive" => UserStatus::Inactive,
        "suspended" => UserStatus::Suspended,
        "deleted" => UserStatus::Deleted,
        _ => UserStatus::Active,
    }
}
