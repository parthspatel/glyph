//! Permission checking service with team hierarchy support.

use glyph_domain::{TeamId, UserId};
use sqlx::PgPool;

use crate::extractors::CurrentUser;

/// Service for checking user permissions with team hierarchy cascade.
#[derive(Clone)]
pub struct PermissionService {
    pool: PgPool,
}

impl PermissionService {
    /// Create a new permission service with database pool.
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Check if user leads the given team OR any of its parent teams.
    ///
    /// Leadership cascades downward: leading a parent team grants leadership of all sub-teams.
    pub async fn check_team_leadership_cascade(
        &self,
        user_id: &UserId,
        team_id: &TeamId,
    ) -> Result<bool, sqlx::Error> {
        // Use recursive CTE to traverse up the team hierarchy
        let result = sqlx::query_scalar::<_, bool>(
            r#"
            WITH RECURSIVE parent_teams AS (
                -- Start with the target team
                SELECT team_id, parent_team_id
                FROM teams
                WHERE team_id = $1 AND status != 'deleted'

                UNION ALL

                -- Recursively get parent teams
                SELECT t.team_id, t.parent_team_id
                FROM teams t
                JOIN parent_teams pt ON t.team_id = pt.parent_team_id
                WHERE t.status != 'deleted'
            )
            SELECT EXISTS(
                SELECT 1
                FROM team_memberships tm
                JOIN parent_teams pt ON tm.team_id = pt.team_id
                WHERE tm.user_id = $2 AND tm.role = 'leader'
            )
            "#,
        )
        .bind(team_id.as_uuid())
        .bind(user_id.as_uuid())
        .fetch_one(&self.pool)
        .await?;

        Ok(result)
    }

    /// Check if user is a member of the given team (any role).
    pub async fn check_team_membership(
        &self,
        user_id: &UserId,
        team_id: &TeamId,
    ) -> Result<bool, sqlx::Error> {
        let result = sqlx::query_scalar::<_, bool>(
            r#"
            SELECT EXISTS(
                SELECT 1 FROM team_memberships
                WHERE team_id = $1 AND user_id = $2
            )
            "#,
        )
        .bind(team_id.as_uuid())
        .bind(user_id.as_uuid())
        .fetch_one(&self.pool)
        .await?;

        Ok(result)
    }

    /// Check if user can certify skills (either admin or has skill:certifier role).
    pub fn can_certify_skills(&self, user: &CurrentUser) -> bool {
        user.has_any_role(&["admin", "skill:certifier"])
    }
}
