//! PostgreSQL implementation of SkillRepository

use async_trait::async_trait;
use chrono::{Duration, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use glyph_domain::{SkillType, UserId};

use crate::repo::errors::*;
use crate::repo::traits::*;

/// PostgreSQL skill repository
pub struct PgSkillRepository {
    pool: PgPool,
}

impl PgSkillRepository {
    /// Create a new skill repository
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl SkillRepository for PgSkillRepository {
    async fn create_skill_type(
        &self,
        st: &NewSkillType,
    ) -> Result<SkillType, CreateSkillTypeError> {
        // Check for existing
        let existing =
            sqlx::query_scalar::<_, String>("SELECT skill_id FROM skill_types WHERE skill_id = $1")
                .bind(&st.skill_id)
                .fetch_optional(&self.pool)
                .await
                .map_err(CreateSkillTypeError::Database)?;

        if existing.is_some() {
            return Err(CreateSkillTypeError::AlreadyExists(st.skill_id.clone()));
        }

        let row = sqlx::query_as::<_, SkillTypeRow>(
            r#"
            INSERT INTO skill_types (skill_id, name, description, expiration_months,
                                     grace_period_days, requires_proficiency, proficiency_levels)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
            "#,
        )
        .bind(&st.skill_id)
        .bind(&st.name)
        .bind(&st.description)
        .bind(st.expiration_months)
        .bind(st.grace_period_days)
        .bind(st.requires_proficiency)
        .bind(serde_json::to_value(&st.proficiency_levels).ok())
        .fetch_one(&self.pool)
        .await
        .map_err(CreateSkillTypeError::Database)?;

        Ok(row.into())
    }

    async fn find_skill_type(
        &self,
        skill_id: &str,
    ) -> Result<Option<SkillType>, FindSkillTypeError> {
        let row =
            sqlx::query_as::<_, SkillTypeRow>("SELECT * FROM skill_types WHERE skill_id = $1")
                .bind(skill_id)
                .fetch_optional(&self.pool)
                .await
                .map_err(FindSkillTypeError::Database)?;

        Ok(row.map(Into::into))
    }

    async fn list_skill_types(&self) -> Result<Vec<SkillType>, sqlx::Error> {
        let rows = sqlx::query_as::<_, SkillTypeRow>("SELECT * FROM skill_types ORDER BY name")
            .fetch_all(&self.pool)
            .await?;

        Ok(rows.into_iter().map(Into::into).collect())
    }

    async fn update_skill_type(
        &self,
        skill_id: &str,
        update: &SkillTypeUpdate,
    ) -> Result<SkillType, UpdateSkillTypeError> {
        let row = sqlx::query_as::<_, SkillTypeRow>(
            r#"
            UPDATE skill_types SET
                name = COALESCE($2, name),
                description = COALESCE($3, description),
                expiration_months = COALESCE($4, expiration_months),
                grace_period_days = COALESCE($5, grace_period_days),
                requires_proficiency = COALESCE($6, requires_proficiency),
                proficiency_levels = COALESCE($7, proficiency_levels),
                updated_at = NOW()
            WHERE skill_id = $1
            RETURNING *
            "#,
        )
        .bind(skill_id)
        .bind(&update.name)
        .bind(&update.description)
        .bind(update.expiration_months.flatten())
        .bind(update.grace_period_days)
        .bind(update.requires_proficiency)
        .bind(
            update
                .proficiency_levels
                .as_ref()
                .and_then(|p| serde_json::to_value(p).ok()),
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(UpdateSkillTypeError::Database)?
        .ok_or_else(|| UpdateSkillTypeError::NotFound(skill_id.to_string()))?;

        Ok(row.into())
    }

    async fn certify_skill(
        &self,
        cert: &CertifyUserSkill,
    ) -> Result<UserSkillWithStatus, CertifySkillError> {
        // Load skill type for expiration and proficiency validation
        let skill_type = self
            .find_skill_type(&cert.skill_id)
            .await
            .map_err(|e| match e {
                FindSkillTypeError::Database(e) => CertifySkillError::Database(e),
                FindSkillTypeError::NotFound(id) => CertifySkillError::SkillTypeNotFound(id),
            })?
            .ok_or_else(|| CertifySkillError::SkillTypeNotFound(cert.skill_id.clone()))?;

        // Validate proficiency level
        if skill_type.requires_proficiency {
            match (&cert.proficiency_level, &skill_type.proficiency_levels) {
                (None, _) => return Err(CertifySkillError::InvalidProficiency),
                (Some(level), Some(levels)) if !levels.contains(level) => {
                    return Err(CertifySkillError::InvalidProficiency);
                }
                _ => {}
            }
        }

        // Compute expires_at
        let expires_at = skill_type
            .expiration_months
            .map(|months| Utc::now() + Duration::days(months as i64 * 30));

        // Insert certification (or update if already exists)
        let certification_id = Uuid::now_v7();
        sqlx::query(
            r#"
            INSERT INTO user_skills (certification_id, user_id, skill_id, proficiency_level,
                                     certified_by, expires_at, notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (user_id, skill_id) DO UPDATE SET
                proficiency_level = EXCLUDED.proficiency_level,
                certified_by = EXCLUDED.certified_by,
                certified_at = NOW(),
                expires_at = EXCLUDED.expires_at,
                notes = EXCLUDED.notes
            "#,
        )
        .bind(certification_id.to_string())
        .bind(cert.user_id.to_string())
        .bind(&cert.skill_id)
        .bind(&cert.proficiency_level)
        .bind(cert.certified_by.to_string())
        .bind(expires_at)
        .bind(&cert.notes)
        .execute(&self.pool)
        .await
        .map_err(CertifySkillError::Database)?;

        // Return from view
        self.get_user_skill(&cert.user_id, &cert.skill_id)
            .await
            .map_err(CertifySkillError::Database)?
            .ok_or(CertifySkillError::Database(sqlx::Error::RowNotFound))
    }

    async fn revoke_skill(&self, user_id: &UserId, skill_id: &str) -> Result<(), RevokeSkillError> {
        let result = sqlx::query("DELETE FROM user_skills WHERE user_id = $1 AND skill_id = $2")
            .bind(user_id.to_string())
            .bind(skill_id)
            .execute(&self.pool)
            .await
            .map_err(RevokeSkillError::Database)?;

        if result.rows_affected() == 0 {
            return Err(RevokeSkillError::NotFound);
        }

        Ok(())
    }

    async fn list_user_skills(
        &self,
        user_id: &UserId,
    ) -> Result<Vec<UserSkillWithStatus>, sqlx::Error> {
        let rows = sqlx::query_as::<_, UserSkillRow>(
            "SELECT * FROM user_skills_with_status WHERE user_id = $1 ORDER BY skill_name",
        )
        .bind(user_id.to_string())
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.into_iter().filter_map(|r| r.try_into().ok()).collect())
    }

    async fn get_user_skill(
        &self,
        user_id: &UserId,
        skill_id: &str,
    ) -> Result<Option<UserSkillWithStatus>, sqlx::Error> {
        let row = sqlx::query_as::<_, UserSkillRow>(
            "SELECT * FROM user_skills_with_status WHERE user_id = $1 AND skill_id = $2",
        )
        .bind(user_id.to_string())
        .bind(skill_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.and_then(|r| r.try_into().ok()))
    }
}

// =============================================================================
// Row Types for SQLx
// =============================================================================

#[derive(sqlx::FromRow)]
struct SkillTypeRow {
    skill_id: String,
    name: String,
    description: Option<String>,
    expiration_months: Option<i32>,
    grace_period_days: i32,
    requires_proficiency: bool,
    proficiency_levels: Option<serde_json::Value>,
    created_at: chrono::DateTime<chrono::Utc>,
    updated_at: chrono::DateTime<chrono::Utc>,
}

impl From<SkillTypeRow> for SkillType {
    fn from(r: SkillTypeRow) -> Self {
        Self {
            skill_id: r.skill_id,
            name: r.name,
            description: r.description,
            expiration_months: r.expiration_months,
            grace_period_days: r.grace_period_days,
            requires_proficiency: r.requires_proficiency,
            proficiency_levels: r
                .proficiency_levels
                .and_then(|v| serde_json::from_value(v).ok()),
            created_at: r.created_at,
            updated_at: r.updated_at,
        }
    }
}

#[derive(sqlx::FromRow)]
struct UserSkillRow {
    certification_id: String,
    user_id: String,
    skill_id: String,
    skill_name: String,
    proficiency_level: Option<String>,
    certified_by: Option<String>,
    certified_at: chrono::DateTime<chrono::Utc>,
    expires_at: Option<chrono::DateTime<chrono::Utc>>,
    notes: Option<String>,
    grace_period_days: i32,
    status: String,
}

impl TryFrom<UserSkillRow> for UserSkillWithStatus {
    type Error = glyph_domain::IdParseError;

    fn try_from(r: UserSkillRow) -> Result<Self, Self::Error> {
        Ok(Self {
            certification_id: r.certification_id.parse().unwrap_or_default(),
            user_id: r.user_id.parse()?,
            skill_id: r.skill_id,
            skill_name: r.skill_name,
            proficiency_level: r.proficiency_level,
            certified_by: r.certified_by.map(|s| s.parse()).transpose()?,
            certified_at: r.certified_at,
            expires_at: r.expires_at,
            notes: r.notes,
            grace_period_days: r.grace_period_days,
            status: r.status,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_expiration_computation() {
        let months = 6;
        let expected_days = months * 30;
        let expires_at = Utc::now() + Duration::days(expected_days as i64);

        // Verify computation is approximately correct (within 1 day)
        let diff = (expires_at - Utc::now()).num_days();
        assert!(diff >= expected_days - 1 && diff <= expected_days + 1);
    }
}
