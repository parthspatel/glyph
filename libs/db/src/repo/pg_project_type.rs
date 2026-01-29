//! PostgreSQL implementation of ProjectTypeRepository

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

use glyph_domain::{
    CreateProjectType, DifficultyLevel, ProficiencyLevel, ProjectType, ProjectTypeFilter,
    ProjectTypeId, SkillRequirement, UpdateProjectType, UserId,
};

use super::errors::*;

// =============================================================================
// Repository Trait
// =============================================================================

/// Repository for project type operations
#[async_trait]
pub trait ProjectTypeRepository: Send + Sync {
    /// Create a new project type
    async fn create(
        &self,
        project_type: &CreateProjectType,
        created_by: Option<&UserId>,
    ) -> Result<ProjectType, CreateProjectTypeError>;

    /// Find a project type by ID
    async fn find_by_id(
        &self,
        id: &ProjectTypeId,
    ) -> Result<Option<ProjectType>, FindProjectTypeError>;

    /// List project types with filtering
    async fn list(&self, filter: &ProjectTypeFilter) -> Result<Vec<ProjectType>, sqlx::Error>;

    /// Update a project type
    async fn update(
        &self,
        id: &ProjectTypeId,
        update: &UpdateProjectType,
    ) -> Result<ProjectType, UpdateProjectTypeError>;

    /// Delete a project type
    async fn delete(&self, id: &ProjectTypeId) -> Result<(), DeleteProjectTypeError>;

    /// Add a skill requirement to a project type
    async fn add_skill_requirement(
        &self,
        project_type_id: &ProjectTypeId,
        requirement: &SkillRequirement,
    ) -> Result<(), AddSkillRequirementError>;

    /// Remove a skill requirement from a project type
    async fn remove_skill_requirement(
        &self,
        project_type_id: &ProjectTypeId,
        skill_id: &str,
    ) -> Result<(), RemoveSkillRequirementError>;
}

// =============================================================================
// Row types for database mapping
// =============================================================================

#[derive(FromRow)]
struct ProjectTypeRow {
    project_type_id: Uuid,
    name: String,
    description: Option<String>,
    input_schema: serde_json::Value,
    output_schema: serde_json::Value,
    estimated_duration_seconds: Option<i32>,
    difficulty_level: Option<String>,
    is_system: bool,
    created_by: Option<Uuid>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

#[derive(FromRow)]
struct SkillRequirementRow {
    skill_id: String,
    min_proficiency: String,
    is_required: bool,
    weight: Option<f32>,
}

// =============================================================================
// PostgreSQL Implementation
// =============================================================================

/// PostgreSQL-backed project type repository
pub struct PgProjectTypeRepository {
    pool: PgPool,
}

impl PgProjectTypeRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Load skill requirements for a project type
    async fn load_skill_requirements(
        &self,
        project_type_id: &ProjectTypeId,
    ) -> Result<Vec<SkillRequirement>, sqlx::Error> {
        let rows: Vec<SkillRequirementRow> = sqlx::query_as(
            r#"
            SELECT
                skill_id,
                min_proficiency,
                is_required,
                weight
            FROM project_type_skill_requirements
            WHERE project_type_id = $1
            "#,
        )
        .bind(project_type_id.as_uuid())
        .fetch_all(&self.pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|row| SkillRequirement {
                skill_id: row.skill_id,
                min_proficiency: parse_proficiency(&row.min_proficiency),
                is_required: row.is_required,
                weight: row.weight.unwrap_or(1.0),
            })
            .collect())
    }

    fn row_to_project_type(
        &self,
        row: ProjectTypeRow,
        skill_requirements: Vec<SkillRequirement>,
    ) -> ProjectType {
        ProjectType {
            project_type_id: ProjectTypeId::from_uuid(row.project_type_id),
            name: row.name,
            description: row.description,
            input_schema: row.input_schema,
            output_schema: row.output_schema,
            estimated_duration_seconds: row.estimated_duration_seconds,
            difficulty_level: row.difficulty_level.and_then(|d| parse_difficulty(&d)),
            skill_requirements,
            is_system: row.is_system,
            created_by: row.created_by.map(UserId::from_uuid),
            created_at: row.created_at,
            updated_at: row.updated_at,
        }
    }
}

#[async_trait]
impl ProjectTypeRepository for PgProjectTypeRepository {
    async fn create(
        &self,
        input: &CreateProjectType,
        created_by: Option<&UserId>,
    ) -> Result<ProjectType, CreateProjectTypeError> {
        let id = ProjectTypeId::new();
        let input_schema = input
            .input_schema
            .clone()
            .unwrap_or_else(|| serde_json::json!({}));
        let output_schema = input
            .output_schema
            .clone()
            .unwrap_or_else(|| serde_json::json!({}));
        let difficulty = input.difficulty_level.map(format_difficulty);
        let is_system = input.is_system.unwrap_or(false);

        let row: ProjectTypeRow = sqlx::query_as(
            r#"
            INSERT INTO project_types (
                project_type_id, name, description, input_schema, output_schema,
                estimated_duration_seconds, difficulty_level, is_system, created_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING
                project_type_id, name, description, input_schema, output_schema,
                estimated_duration_seconds, difficulty_level, is_system, created_by,
                created_at, updated_at
            "#,
        )
        .bind(id.as_uuid())
        .bind(&input.name)
        .bind(&input.description)
        .bind(&input_schema)
        .bind(&output_schema)
        .bind(input.estimated_duration_seconds)
        .bind(&difficulty)
        .bind(is_system)
        .bind(created_by.map(|u| *u.as_uuid()))
        .fetch_one(&self.pool)
        .await
        .map_err(|e| {
            if is_unique_violation(&e) {
                CreateProjectTypeError::NameExists(input.name.clone())
            } else {
                CreateProjectTypeError::Database(e)
            }
        })?;

        // Insert skill requirements if provided
        let skill_requirements = if let Some(requirements) = &input.skill_requirements {
            for req in requirements {
                sqlx::query(
                    r#"
                    INSERT INTO project_type_skill_requirements (
                        project_type_id, skill_id, min_proficiency, is_required, weight
                    )
                    VALUES ($1, $2, $3, $4, $5)
                    "#,
                )
                .bind(id.as_uuid())
                .bind(&req.skill_id)
                .bind(format_proficiency(req.min_proficiency))
                .bind(req.is_required)
                .bind(req.weight)
                .execute(&self.pool)
                .await
                .map_err(CreateProjectTypeError::Database)?;
            }
            requirements.clone()
        } else {
            vec![]
        };

        Ok(self.row_to_project_type(row, skill_requirements))
    }

    async fn find_by_id(
        &self,
        id: &ProjectTypeId,
    ) -> Result<Option<ProjectType>, FindProjectTypeError> {
        let row: Option<ProjectTypeRow> = sqlx::query_as(
            r#"
            SELECT
                project_type_id, name, description, input_schema, output_schema,
                estimated_duration_seconds, difficulty_level, is_system, created_by,
                created_at, updated_at
            FROM project_types
            WHERE project_type_id = $1
            "#,
        )
        .bind(id.as_uuid())
        .fetch_optional(&self.pool)
        .await
        .map_err(FindProjectTypeError::Database)?;

        match row {
            Some(row) => {
                let skill_requirements = self
                    .load_skill_requirements(id)
                    .await
                    .map_err(FindProjectTypeError::Database)?;

                Ok(Some(self.row_to_project_type(row, skill_requirements)))
            }
            None => Ok(None),
        }
    }

    async fn list(&self, filter: &ProjectTypeFilter) -> Result<Vec<ProjectType>, sqlx::Error> {
        let limit = filter.limit.unwrap_or(50);
        let offset = filter.offset.unwrap_or(0);

        let rows: Vec<ProjectTypeRow> = sqlx::query_as(
            r#"
            SELECT
                project_type_id, name, description, input_schema, output_schema,
                estimated_duration_seconds, difficulty_level, is_system, created_by,
                created_at, updated_at
            FROM project_types
            WHERE ($1::bool IS NULL OR is_system = $1)
              AND ($2::uuid IS NULL OR created_by = $2)
              AND ($3::text IS NULL OR name ILIKE '%' || $3 || '%' OR description ILIKE '%' || $3 || '%')
            ORDER BY created_at DESC
            LIMIT $4
            OFFSET $5
            "#,
        )
        .bind(filter.is_system)
        .bind(filter.created_by.as_ref().map(|u| *u.as_uuid()))
        .bind(&filter.search)
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.pool)
        .await?;

        let mut result = Vec::with_capacity(rows.len());
        for row in rows {
            let id = ProjectTypeId::from_uuid(row.project_type_id);
            let skill_requirements = self.load_skill_requirements(&id).await?;
            result.push(self.row_to_project_type(row, skill_requirements));
        }

        Ok(result)
    }

    async fn update(
        &self,
        id: &ProjectTypeId,
        update: &UpdateProjectType,
    ) -> Result<ProjectType, UpdateProjectTypeError> {
        let row: Option<ProjectTypeRow> = sqlx::query_as(
            r#"
            UPDATE project_types
            SET
                name = COALESCE($2, name),
                description = COALESCE($3, description),
                input_schema = COALESCE($4, input_schema),
                output_schema = COALESCE($5, output_schema),
                estimated_duration_seconds = COALESCE($6, estimated_duration_seconds),
                difficulty_level = COALESCE($7, difficulty_level),
                updated_at = NOW()
            WHERE project_type_id = $1
            RETURNING
                project_type_id, name, description, input_schema, output_schema,
                estimated_duration_seconds, difficulty_level, is_system, created_by,
                created_at, updated_at
            "#,
        )
        .bind(id.as_uuid())
        .bind(&update.name)
        .bind(&update.description)
        .bind(&update.input_schema)
        .bind(&update.output_schema)
        .bind(update.estimated_duration_seconds)
        .bind(update.difficulty_level.map(format_difficulty))
        .fetch_optional(&self.pool)
        .await
        .map_err(UpdateProjectTypeError::Database)?;

        let row = row.ok_or_else(|| UpdateProjectTypeError::NotFound(id.clone()))?;

        let skill_requirements = self
            .load_skill_requirements(id)
            .await
            .map_err(UpdateProjectTypeError::Database)?;

        Ok(self.row_to_project_type(row, skill_requirements))
    }

    async fn delete(&self, id: &ProjectTypeId) -> Result<(), DeleteProjectTypeError> {
        let result = sqlx::query(r#"DELETE FROM project_types WHERE project_type_id = $1"#)
            .bind(id.as_uuid())
            .execute(&self.pool)
            .await
            .map_err(DeleteProjectTypeError::Database)?;

        if result.rows_affected() == 0 {
            return Err(DeleteProjectTypeError::NotFound(id.clone()));
        }

        Ok(())
    }

    async fn add_skill_requirement(
        &self,
        project_type_id: &ProjectTypeId,
        requirement: &SkillRequirement,
    ) -> Result<(), AddSkillRequirementError> {
        sqlx::query(
            r#"
            INSERT INTO project_type_skill_requirements (
                project_type_id, skill_id, min_proficiency, is_required, weight
            )
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (project_type_id, skill_id) DO UPDATE SET
                min_proficiency = EXCLUDED.min_proficiency,
                is_required = EXCLUDED.is_required,
                weight = EXCLUDED.weight
            "#,
        )
        .bind(project_type_id.as_uuid())
        .bind(&requirement.skill_id)
        .bind(format_proficiency(requirement.min_proficiency))
        .bind(requirement.is_required)
        .bind(requirement.weight)
        .execute(&self.pool)
        .await
        .map_err(AddSkillRequirementError::Database)?;

        Ok(())
    }

    async fn remove_skill_requirement(
        &self,
        project_type_id: &ProjectTypeId,
        skill_id: &str,
    ) -> Result<(), RemoveSkillRequirementError> {
        let result = sqlx::query(
            r#"
            DELETE FROM project_type_skill_requirements
            WHERE project_type_id = $1 AND skill_id = $2
            "#,
        )
        .bind(project_type_id.as_uuid())
        .bind(skill_id)
        .execute(&self.pool)
        .await
        .map_err(RemoveSkillRequirementError::Database)?;

        if result.rows_affected() == 0 {
            return Err(RemoveSkillRequirementError::NotFound);
        }

        Ok(())
    }
}

// =============================================================================
// Helpers
// =============================================================================

fn is_unique_violation(e: &sqlx::Error) -> bool {
    if let sqlx::Error::Database(db_err) = e {
        return db_err.constraint().is_some();
    }
    false
}

fn format_difficulty(level: DifficultyLevel) -> String {
    match level {
        DifficultyLevel::Easy => "easy".to_string(),
        DifficultyLevel::Medium => "medium".to_string(),
        DifficultyLevel::Hard => "hard".to_string(),
        DifficultyLevel::Expert => "expert".to_string(),
    }
}

fn parse_difficulty(s: &str) -> Option<DifficultyLevel> {
    match s.to_lowercase().as_str() {
        "easy" => Some(DifficultyLevel::Easy),
        "medium" => Some(DifficultyLevel::Medium),
        "hard" => Some(DifficultyLevel::Hard),
        "expert" => Some(DifficultyLevel::Expert),
        _ => None,
    }
}

fn format_proficiency(level: ProficiencyLevel) -> String {
    match level {
        ProficiencyLevel::Novice => "novice".to_string(),
        ProficiencyLevel::Intermediate => "intermediate".to_string(),
        ProficiencyLevel::Advanced => "advanced".to_string(),
        ProficiencyLevel::Expert => "expert".to_string(),
    }
}

fn parse_proficiency(s: &str) -> ProficiencyLevel {
    match s.to_lowercase().as_str() {
        "novice" => ProficiencyLevel::Novice,
        "intermediate" => ProficiencyLevel::Intermediate,
        "advanced" => ProficiencyLevel::Advanced,
        "expert" => ProficiencyLevel::Expert,
        _ => ProficiencyLevel::Intermediate,
    }
}
