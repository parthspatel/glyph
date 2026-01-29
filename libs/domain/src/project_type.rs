//! Project Type domain models
//!
//! Project types are reusable templates that define the structure of projects,
//! including input/output JSON schemas and skill requirements.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use typeshare::typeshare;

use crate::enums::ProficiencyLevel;
use crate::ids::{ProjectTypeId, UserId};

/// Difficulty level for project types
#[typeshare]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DifficultyLevel {
    Easy,
    Medium,
    Hard,
    Expert,
}

/// A skill requirement for a project type
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SkillRequirement {
    /// The skill ID this requirement refers to
    pub skill_id: String,
    /// Minimum proficiency level required
    pub min_proficiency: ProficiencyLevel,
    /// Whether this skill is required (vs. nice-to-have)
    pub is_required: bool,
    /// Weight for assignment scoring (higher = more important)
    pub weight: f32,
}

/// A project type template
///
/// Project types define reusable configurations for projects, including:
/// - Input schema: JSON Schema for task input data validation
/// - Output schema: JSON Schema for annotation output validation
/// - Skill requirements: What skills annotators need
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectType {
    pub project_type_id: ProjectTypeId,
    pub name: String,
    pub description: Option<String>,
    /// JSON Schema for validating task input data
    pub input_schema: serde_json::Value,
    /// JSON Schema for validating annotation output data
    pub output_schema: serde_json::Value,
    /// Estimated time to complete one task (seconds)
    pub estimated_duration_seconds: Option<i32>,
    /// Difficulty level for task assignment
    pub difficulty_level: Option<DifficultyLevel>,
    /// Skills required for this project type
    pub skill_requirements: Vec<SkillRequirement>,
    /// Whether this is a system-provided template (vs user-created)
    pub is_system: bool,
    /// User who created this project type (null for system types)
    pub created_by: Option<UserId>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// DTO for creating a new project type
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateProjectType {
    pub name: String,
    pub description: Option<String>,
    pub input_schema: Option<serde_json::Value>,
    pub output_schema: Option<serde_json::Value>,
    pub estimated_duration_seconds: Option<i32>,
    pub difficulty_level: Option<DifficultyLevel>,
    pub skill_requirements: Option<Vec<SkillRequirement>>,
    pub is_system: Option<bool>,
}

/// DTO for updating a project type
#[typeshare]
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct UpdateProjectType {
    pub name: Option<String>,
    pub description: Option<String>,
    pub input_schema: Option<serde_json::Value>,
    pub output_schema: Option<serde_json::Value>,
    pub estimated_duration_seconds: Option<i32>,
    pub difficulty_level: Option<DifficultyLevel>,
}

/// Filter options for listing project types
#[derive(Debug, Clone, Default)]
pub struct ProjectTypeFilter {
    pub is_system: Option<bool>,
    pub created_by: Option<UserId>,
    pub search: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

/// Summary view of a project type for list responses
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectTypeSummary {
    pub project_type_id: ProjectTypeId,
    pub name: String,
    pub description: Option<String>,
    pub difficulty_level: Option<DifficultyLevel>,
    pub is_system: bool,
    pub skill_count: i32,
    pub created_at: DateTime<Utc>,
}
