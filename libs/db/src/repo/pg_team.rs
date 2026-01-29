//! PostgreSQL implementation of TeamRepository

use async_trait::async_trait;
use sqlx::PgPool;

use glyph_domain::{Team, TeamId, TeamMembership, TeamRole, TeamStatus, UserId};

use crate::pagination::{Page, Pagination};
use crate::repo::errors::*;
use crate::repo::traits::*;

/// PostgreSQL team repository with hierarchy support
pub struct PgTeamRepository {
    pool: PgPool,
}

impl PgTeamRepository {
    /// Create a new team repository
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl TeamRepository for PgTeamRepository {
    async fn find_by_id(&self, id: &TeamId) -> Result<Option<Team>, FindTeamError> {
        let row = sqlx::query_as::<_, TeamRow>(
            r#"
            SELECT team_id, parent_team_id, name, description, status,
                   capacity, specializations, created_at, updated_at
            FROM teams
            WHERE team_id = $1 AND status != 'deleted'
            "#,
        )
        .bind(id.to_string())
        .fetch_optional(&self.pool)
        .await
        .map_err(FindTeamError::Database)?;

        row.map(|r| r.try_into())
            .transpose()
            .map_err(|_| FindTeamError::NotFound(id.clone()))
    }

    async fn create(&self, team: &NewTeam) -> Result<Team, CreateTeamError> {
        let mut tx = self.pool.begin().await.map_err(CreateTeamError::Database)?;

        let id = TeamId::new();
        let row = sqlx::query_as::<_, TeamRow>(
            r#"
            INSERT INTO teams (team_id, parent_team_id, name, description, capacity, specializations)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING team_id, parent_team_id, name, description, status,
                      capacity, specializations, created_at, updated_at
            "#,
        )
        .bind(id.to_string())
        .bind(team.parent_team_id.as_ref().map(|p| p.to_string()))
        .bind(&team.name)
        .bind(&team.description)
        .bind(team.capacity)
        .bind(serde_json::to_value(&team.specializations).unwrap_or_default())
        .fetch_one(&mut *tx)
        .await
        .map_err(CreateTeamError::Database)?;

        // Add initial leader if provided
        if let Some(leader_id) = &team.initial_leader_id {
            sqlx::query(
                "INSERT INTO team_memberships (team_id, user_id, role) VALUES ($1, $2, 'leader')",
            )
            .bind(id.to_string())
            .bind(leader_id.to_string())
            .execute(&mut *tx)
            .await
            .map_err(CreateTeamError::Database)?;
        }

        tx.commit().await.map_err(CreateTeamError::Database)?;

        row.try_into()
            .map_err(|_| CreateTeamError::Database(sqlx::Error::RowNotFound))
    }

    async fn update(&self, id: &TeamId, update: &TeamUpdate) -> Result<Team, UpdateTeamError> {
        let row = sqlx::query_as::<_, TeamRow>(
            r#"
            UPDATE teams SET
                name = COALESCE($2, name),
                description = COALESCE($3, description),
                status = COALESCE($4, status),
                capacity = COALESCE($5, capacity),
                specializations = COALESCE($6, specializations),
                updated_at = NOW()
            WHERE team_id = $1 AND status != 'deleted'
            RETURNING team_id, parent_team_id, name, description, status,
                      capacity, specializations, created_at, updated_at
            "#,
        )
        .bind(id.to_string())
        .bind(&update.name)
        .bind(&update.description)
        .bind(update.status.map(|s| format!("{:?}", s).to_lowercase()))
        .bind(update.capacity)
        .bind(
            update
                .specializations
                .as_ref()
                .and_then(|s| serde_json::to_value(s).ok()),
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(UpdateTeamError::Database)?
        .ok_or_else(|| UpdateTeamError::NotFound(id.clone()))?;

        row.try_into()
            .map_err(|_| UpdateTeamError::Database(sqlx::Error::RowNotFound))
    }

    async fn list(&self, pagination: Pagination) -> Result<Page<Team>, sqlx::Error> {
        let total =
            sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM teams WHERE status != 'deleted'")
                .fetch_one(&self.pool)
                .await?;

        let rows = sqlx::query_as::<_, TeamRow>(
            r#"
            SELECT team_id, parent_team_id, name, description, status,
                   capacity, specializations, created_at, updated_at
            FROM teams
            WHERE status != 'deleted'
            ORDER BY name
            LIMIT $1 OFFSET $2
            "#,
        )
        .bind(pagination.clamped_limit())
        .bind(pagination.offset)
        .fetch_all(&self.pool)
        .await?;

        let teams = rows.into_iter().filter_map(|r| r.try_into().ok()).collect();
        Ok(Page::new(teams, total, &pagination))
    }

    async fn list_root_teams(&self, pagination: Pagination) -> Result<Page<Team>, sqlx::Error> {
        let total = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM teams WHERE parent_team_id IS NULL AND status != 'deleted'",
        )
        .fetch_one(&self.pool)
        .await?;

        let rows = sqlx::query_as::<_, TeamRow>(
            r#"
            SELECT team_id, parent_team_id, name, description, status,
                   capacity, specializations, created_at, updated_at
            FROM teams
            WHERE parent_team_id IS NULL AND status != 'deleted'
            ORDER BY name
            LIMIT $1 OFFSET $2
            "#,
        )
        .bind(pagination.clamped_limit())
        .bind(pagination.offset)
        .fetch_all(&self.pool)
        .await?;

        let teams = rows.into_iter().filter_map(|r| r.try_into().ok()).collect();
        Ok(Page::new(teams, total, &pagination))
    }

    async fn get_sub_teams(&self, team_id: &TeamId) -> Result<Vec<Team>, FindTeamError> {
        let rows = sqlx::query_as::<_, TeamRow>(
            r#"
            SELECT team_id, parent_team_id, name, description, status,
                   capacity, specializations, created_at, updated_at
            FROM teams
            WHERE parent_team_id = $1 AND status != 'deleted'
            ORDER BY name
            "#,
        )
        .bind(team_id.to_string())
        .fetch_all(&self.pool)
        .await
        .map_err(FindTeamError::Database)?;

        Ok(rows.into_iter().filter_map(|r| r.try_into().ok()).collect())
    }

    async fn get_team_tree(&self, team_id: &TeamId) -> Result<Vec<TeamTreeNode>, FindTeamError> {
        let rows = sqlx::query_as::<_, TeamTreeRow>(
            r#"
            WITH RECURSIVE team_tree AS (
                SELECT t.team_id, t.parent_team_id, t.name, t.description,
                       t.status, t.capacity, t.specializations, t.created_at, t.updated_at,
                       0 as depth
                FROM teams t
                WHERE t.team_id = $1 AND t.status != 'deleted'

                UNION ALL

                SELECT t.team_id, t.parent_team_id, t.name, t.description,
                       t.status, t.capacity, t.specializations, t.created_at, t.updated_at,
                       tt.depth + 1
                FROM teams t
                JOIN team_tree tt ON t.parent_team_id = tt.team_id
                WHERE t.status != 'deleted'
            )
            SELECT
                tt.*,
                (SELECT COUNT(*) FROM team_memberships tm WHERE tm.team_id = tt.team_id) as member_count,
                (SELECT COUNT(*) FROM teams t WHERE t.parent_team_id = tt.team_id AND t.status != 'deleted') as sub_team_count
            FROM team_tree tt
            ORDER BY tt.depth, tt.name
            "#,
        )
        .bind(team_id.to_string())
        .fetch_all(&self.pool)
        .await
        .map_err(FindTeamError::Database)?;

        Ok(rows.into_iter().filter_map(|r| r.try_into().ok()).collect())
    }

    async fn add_member(
        &self,
        team_id: &TeamId,
        user_id: &UserId,
        role: TeamRole,
        allocation: Option<i32>,
    ) -> Result<TeamMembership, TeamMembershipError> {
        let row = sqlx::query_as::<_, TeamMembershipRow>(
            r#"
            INSERT INTO team_memberships (team_id, user_id, role, allocation_percentage)
            VALUES ($1, $2, $3, $4)
            RETURNING team_id, user_id, role, allocation_percentage, joined_at
            "#,
        )
        .bind(team_id.to_string())
        .bind(user_id.to_string())
        .bind(format!("{:?}", role).to_lowercase())
        .bind(allocation)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| {
            if let sqlx::Error::Database(ref db_err) = e {
                if db_err.constraint() == Some("team_memberships_pkey") {
                    return TeamMembershipError::AlreadyMember;
                }
            }
            TeamMembershipError::Database(e)
        })?;

        row.try_into()
            .map_err(|_| TeamMembershipError::Database(sqlx::Error::RowNotFound))
    }

    async fn remove_member(
        &self,
        team_id: &TeamId,
        user_id: &UserId,
    ) -> Result<(), TeamMembershipError> {
        let result =
            sqlx::query("DELETE FROM team_memberships WHERE team_id = $1 AND user_id = $2")
                .bind(team_id.to_string())
                .bind(user_id.to_string())
                .execute(&self.pool)
                .await
                .map_err(TeamMembershipError::Database)?;

        if result.rows_affected() == 0 {
            return Err(TeamMembershipError::NotAMember);
        }

        Ok(())
    }

    async fn update_member(
        &self,
        team_id: &TeamId,
        user_id: &UserId,
        role: Option<TeamRole>,
        allocation: Option<i32>,
    ) -> Result<TeamMembership, TeamMembershipError> {
        let row = sqlx::query_as::<_, TeamMembershipRow>(
            r#"
            UPDATE team_memberships SET
                role = COALESCE($3, role),
                allocation_percentage = COALESCE($4, allocation_percentage)
            WHERE team_id = $1 AND user_id = $2
            RETURNING team_id, user_id, role, allocation_percentage, joined_at
            "#,
        )
        .bind(team_id.to_string())
        .bind(user_id.to_string())
        .bind(role.map(|r| format!("{:?}", r).to_lowercase()))
        .bind(allocation)
        .fetch_optional(&self.pool)
        .await
        .map_err(TeamMembershipError::Database)?
        .ok_or(TeamMembershipError::NotAMember)?;

        row.try_into()
            .map_err(|_| TeamMembershipError::Database(sqlx::Error::RowNotFound))
    }

    async fn list_members(
        &self,
        team_id: &TeamId,
        pagination: Pagination,
    ) -> Result<Page<TeamMembershipWithUser>, FindTeamError> {
        let total = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM team_memberships WHERE team_id = $1",
        )
        .bind(team_id.to_string())
        .fetch_one(&self.pool)
        .await
        .map_err(FindTeamError::Database)?;

        let rows = sqlx::query_as::<_, TeamMemberWithUserRow>(
            r#"
            SELECT tm.team_id, tm.user_id, tm.role, tm.allocation_percentage, tm.joined_at,
                   u.display_name, u.email
            FROM team_memberships tm
            JOIN users u ON tm.user_id = u.user_id
            WHERE tm.team_id = $1
            ORDER BY tm.role DESC, u.display_name
            LIMIT $2 OFFSET $3
            "#,
        )
        .bind(team_id.to_string())
        .bind(pagination.clamped_limit())
        .bind(pagination.offset)
        .fetch_all(&self.pool)
        .await
        .map_err(FindTeamError::Database)?;

        let members = rows.into_iter().filter_map(|r| r.try_into().ok()).collect();
        Ok(Page::new(members, total, &pagination))
    }

    async fn get_member_count(&self, team_id: &TeamId) -> Result<i64, sqlx::Error> {
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM team_memberships WHERE team_id = $1")
            .bind(team_id.to_string())
            .fetch_one(&self.pool)
            .await
    }

    async fn soft_delete(&self, id: &TeamId) -> Result<(), UpdateTeamError> {
        let result = sqlx::query(
            "UPDATE teams SET status = 'deleted', updated_at = NOW() WHERE team_id = $1",
        )
        .bind(id.to_string())
        .execute(&self.pool)
        .await
        .map_err(UpdateTeamError::Database)?;

        if result.rows_affected() == 0 {
            return Err(UpdateTeamError::NotFound(id.clone()));
        }

        Ok(())
    }
}

// =============================================================================
// Row Types for SQLx
// =============================================================================

#[derive(sqlx::FromRow)]
struct TeamRow {
    team_id: String,
    parent_team_id: Option<String>,
    name: String,
    description: Option<String>,
    status: String,
    capacity: Option<i32>,
    specializations: serde_json::Value,
    created_at: chrono::DateTime<chrono::Utc>,
    updated_at: chrono::DateTime<chrono::Utc>,
}

impl TryFrom<TeamRow> for Team {
    type Error = glyph_domain::IdParseError;

    fn try_from(r: TeamRow) -> Result<Self, Self::Error> {
        Ok(Self {
            team_id: r.team_id.parse()?,
            parent_team_id: r.parent_team_id.map(|s| s.parse()).transpose()?,
            name: r.name,
            description: r.description,
            status: parse_team_status(&r.status),
            capacity: r.capacity,
            specializations: serde_json::from_value(r.specializations).unwrap_or_default(),
            created_at: r.created_at,
            updated_at: r.updated_at,
        })
    }
}

#[derive(sqlx::FromRow)]
struct TeamTreeRow {
    team_id: String,
    parent_team_id: Option<String>,
    name: String,
    description: Option<String>,
    status: String,
    capacity: Option<i32>,
    specializations: serde_json::Value,
    created_at: chrono::DateTime<chrono::Utc>,
    updated_at: chrono::DateTime<chrono::Utc>,
    depth: i32,
    member_count: i64,
    sub_team_count: i64,
}

impl TryFrom<TeamTreeRow> for TeamTreeNode {
    type Error = glyph_domain::IdParseError;

    fn try_from(r: TeamTreeRow) -> Result<Self, Self::Error> {
        Ok(Self {
            team: Team {
                team_id: r.team_id.parse()?,
                parent_team_id: r.parent_team_id.map(|s| s.parse()).transpose()?,
                name: r.name,
                description: r.description,
                status: parse_team_status(&r.status),
                capacity: r.capacity,
                specializations: serde_json::from_value(r.specializations).unwrap_or_default(),
                created_at: r.created_at,
                updated_at: r.updated_at,
            },
            depth: r.depth,
            member_count: r.member_count,
            sub_team_count: r.sub_team_count,
        })
    }
}

#[derive(sqlx::FromRow)]
struct TeamMembershipRow {
    team_id: String,
    user_id: String,
    role: String,
    allocation_percentage: Option<i32>,
    joined_at: chrono::DateTime<chrono::Utc>,
}

impl TryFrom<TeamMembershipRow> for TeamMembership {
    type Error = glyph_domain::IdParseError;

    fn try_from(r: TeamMembershipRow) -> Result<Self, Self::Error> {
        Ok(Self {
            team_id: r.team_id.parse()?,
            user_id: r.user_id.parse()?,
            role: parse_team_role(&r.role),
            allocation_percentage: r.allocation_percentage,
            joined_at: r.joined_at,
        })
    }
}

#[derive(sqlx::FromRow)]
struct TeamMemberWithUserRow {
    team_id: String,
    user_id: String,
    role: String,
    allocation_percentage: Option<i32>,
    joined_at: chrono::DateTime<chrono::Utc>,
    display_name: String,
    email: String,
}

impl TryFrom<TeamMemberWithUserRow> for TeamMembershipWithUser {
    type Error = glyph_domain::IdParseError;

    fn try_from(r: TeamMemberWithUserRow) -> Result<Self, Self::Error> {
        Ok(Self {
            team_id: r.team_id.parse()?,
            user_id: r.user_id.parse()?,
            role: parse_team_role(&r.role),
            allocation_percentage: r.allocation_percentage,
            joined_at: r.joined_at,
            display_name: r.display_name,
            email: r.email,
        })
    }
}

fn parse_team_status(s: &str) -> TeamStatus {
    match s {
        "active" => TeamStatus::Active,
        "inactive" => TeamStatus::Inactive,
        "deleted" => TeamStatus::Deleted,
        _ => TeamStatus::Active,
    }
}

fn parse_team_role(s: &str) -> TeamRole {
    match s {
        "leader" => TeamRole::Leader,
        "member" => TeamRole::Member,
        _ => TeamRole::Member,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_team_status_parsing() {
        assert_eq!(parse_team_status("active"), TeamStatus::Active);
        assert_eq!(parse_team_status("inactive"), TeamStatus::Inactive);
        assert_eq!(parse_team_status("deleted"), TeamStatus::Deleted);
        assert_eq!(parse_team_status("unknown"), TeamStatus::Active);
    }

    #[test]
    fn test_team_role_parsing() {
        assert_eq!(parse_team_role("leader"), TeamRole::Leader);
        assert_eq!(parse_team_role("member"), TeamRole::Member);
        assert_eq!(parse_team_role("unknown"), TeamRole::Member);
    }
}
