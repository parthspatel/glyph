//! Project domain models

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use typeshare::typeshare;

use crate::enums::ProjectStatus;
use crate::ids::{ProjectId, ProjectTypeId, TeamId, UserId, WorkflowId};

/// Action to take when project deadline is reached
#[typeshare]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DeadlineAction {
    /// Send notifications only
    Notify,
    /// Pause the project automatically
    Pause,
    /// Escalate to team lead/admin
    Escalate,
}

/// A project containing tasks and workflows
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub project_id: ProjectId,
    pub name: String,
    pub description: Option<String>,
    pub status: ProjectStatus,
    pub project_type_id: Option<ProjectTypeId>,
    pub workflow_id: Option<WorkflowId>,
    pub layout_id: Option<String>,
    pub team_id: Option<TeamId>,
    pub settings: ProjectSettings,
    pub tags: Vec<String>,
    pub documentation: Option<String>,
    pub deadline: Option<DateTime<Utc>>,
    pub deadline_action: Option<DeadlineAction>,
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
    pub auto_complete_enabled: bool,
}

/// DTO for creating a new project
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateProject {
    pub name: String,
    pub description: Option<String>,
    pub project_type_id: Option<ProjectTypeId>,
    pub team_id: Option<TeamId>,
    pub tags: Option<Vec<String>>,
    pub documentation: Option<String>,
    pub deadline: Option<DateTime<Utc>>,
    pub deadline_action: Option<DeadlineAction>,
    pub settings: Option<ProjectSettings>,
}

/// DTO for updating a project
#[typeshare]
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct UpdateProject {
    pub name: Option<String>,
    pub description: Option<String>,
    pub project_type_id: Option<ProjectTypeId>,
    pub team_id: Option<TeamId>,
    pub workflow_id: Option<WorkflowId>,
    pub layout_id: Option<String>,
    pub tags: Option<Vec<String>>,
    pub documentation: Option<String>,
    pub deadline: Option<DateTime<Utc>>,
    pub deadline_action: Option<DeadlineAction>,
    pub settings: Option<ProjectSettings>,
}

/// Filter for listing projects
#[derive(Debug, Clone, Default)]
pub struct ProjectFilter {
    pub status: Option<ProjectStatus>,
    pub project_type_id: Option<ProjectTypeId>,
    pub team_id: Option<TeamId>,
    pub created_by: Option<UserId>,
    pub search: Option<String>,
    pub tags: Option<Vec<String>>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

/// Project status state machine
impl ProjectStatus {
    /// Get the list of statuses this status can transition to
    pub fn allowed_transitions(&self) -> Vec<ProjectStatus> {
        match self {
            Self::Draft => vec![Self::Active, Self::Archived],
            Self::Active => vec![Self::Paused, Self::Completed],
            Self::Paused => vec![Self::Active, Self::Archived],
            Self::Completed => vec![Self::Archived, Self::Paused],
            Self::Archived | Self::Deleted => vec![], // Terminal states
        }
    }

    /// Check if transitioning to target status is allowed
    pub fn can_transition_to(&self, target: &Self) -> bool {
        self.allowed_transitions().contains(target)
    }
}

/// Summary view of a project for list responses
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectSummary {
    pub project_id: ProjectId,
    pub name: String,
    pub description: Option<String>,
    pub status: ProjectStatus,
    pub project_type_name: Option<String>,
    pub team_name: Option<String>,
    pub task_count: i64,
    pub completed_task_count: i64,
    pub tags: Vec<String>,
    pub deadline: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub created_by: UserId,
}
