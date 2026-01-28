//! Project domain models

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use typeshare::typeshare;

use crate::enums::ProjectStatus;
use crate::ids::{ProjectId, ProjectTypeId, UserId, WorkflowId};

/// A project containing tasks and workflows
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub project_id: ProjectId,
    pub name: String,
    pub description: Option<String>,
    pub status: ProjectStatus,
    pub project_type_id: Option<ProjectTypeId>,
    pub workflow_id: WorkflowId,
    pub layout_id: String,
    pub settings: ProjectSettings,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub created_by: UserId,
}

/// A project type defining schemas and configurations
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectType {
    pub project_type_id: ProjectTypeId,
    pub name: String,
    pub description: Option<String>,
    pub input_schema: serde_json::Value,
    pub output_schema: serde_json::Value,
    pub required_skills: Vec<String>,
    pub default_workflow_id: Option<WorkflowId>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Project-level settings
#[typeshare]
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ProjectSettings {
    pub allow_self_review: bool,
    pub require_all_fields: bool,
    pub max_assignments_per_user: Option<i32>,
    pub assignment_timeout_hours: Option<i32>,
    pub quality_threshold: Option<f64>,
}
