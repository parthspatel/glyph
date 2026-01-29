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

// Note: ProjectType is defined in project_type.rs with full schema support

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
