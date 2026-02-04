//! Skip reason domain models.
//!
//! Skip reasons allow annotators to skip tasks they cannot complete
//! while providing structured feedback about why.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::ids::{ProjectId, SkipReasonId, TaskId, TaskSkipId, UserId};

/// Scope of a skip reason.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SkipReasonScope {
    System,
    Project,
}

/// Reason why an annotator skipped a task.
/// System defaults are available to all projects.
/// Projects can add project-specific skip reasons.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkipReason {
    pub skip_reason_id: SkipReasonId,
    /// Machine-readable code (e.g., "unclear_instructions")
    pub code: String,
    /// Human-readable label (e.g., "Unclear Instructions")
    pub label: String,
    /// Whether this is a system-wide or project-specific reason
    pub scope: SkipReasonScope,
    /// Project ID if scope is Project
    pub project_id: Option<ProjectId>,
    /// Whether this skip reason is active
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl SkipReason {
    /// Create a new system skip reason.
    pub fn system(code: impl Into<String>, label: impl Into<String>) -> Self {
        let now = Utc::now();
        Self {
            skip_reason_id: SkipReasonId::new(),
            code: code.into(),
            label: label.into(),
            scope: SkipReasonScope::System,
            project_id: None,
            is_active: true,
            created_at: now,
            updated_at: now,
        }
    }

    /// Create a new project-specific skip reason.
    pub fn project(
        project_id: ProjectId,
        code: impl Into<String>,
        label: impl Into<String>,
    ) -> Self {
        let now = Utc::now();
        Self {
            skip_reason_id: SkipReasonId::new(),
            code: code.into(),
            label: label.into(),
            scope: SkipReasonScope::Project,
            project_id: Some(project_id),
            is_active: true,
            created_at: now,
            updated_at: now,
        }
    }

    /// Deactivate this skip reason.
    pub fn deactivate(&mut self) {
        self.is_active = false;
        self.updated_at = Utc::now();
    }
}

/// Record of a task being skipped by an annotator.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskSkip {
    pub task_skip_id: TaskSkipId,
    pub task_id: TaskId,
    pub user_id: UserId,
    pub skip_reason_id: SkipReasonId,
    /// Optional note explaining why task was skipped
    pub note: Option<String>,
    pub created_at: DateTime<Utc>,
}

impl TaskSkip {
    /// Create a new task skip record.
    pub fn new(
        task_id: TaskId,
        user_id: UserId,
        skip_reason_id: SkipReasonId,
        note: Option<String>,
    ) -> Self {
        Self {
            task_skip_id: TaskSkipId::new(),
            task_id,
            user_id,
            skip_reason_id,
            note,
            created_at: Utc::now(),
        }
    }
}

/// System default skip reasons (code, label).
pub const SYSTEM_SKIP_REASONS: &[(&str, &str)] = &[
    ("unclear_instructions", "Unclear Instructions"),
    ("bad_data_quality", "Bad Data Quality"),
    ("conflict_of_interest", "Conflict of Interest"),
    ("technical_issue", "Technical Issue"),
];

/// Request to create a project skip reason.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateSkipReasonRequest {
    pub code: String,
    pub label: String,
}

/// Request to skip a task.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkipTaskRequest {
    pub skip_reason_id: SkipReasonId,
    pub note: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_system_skip_reason() {
        let reason = SkipReason::system("test_code", "Test Label");
        assert_eq!(reason.code, "test_code");
        assert_eq!(reason.label, "Test Label");
        assert_eq!(reason.scope, SkipReasonScope::System);
        assert!(reason.project_id.is_none());
        assert!(reason.is_active);
    }

    #[test]
    fn test_project_skip_reason() {
        let project_id = ProjectId::new();
        let reason = SkipReason::project(project_id, "custom_code", "Custom Label");
        assert_eq!(reason.code, "custom_code");
        assert_eq!(reason.scope, SkipReasonScope::Project);
        assert_eq!(reason.project_id, Some(project_id));
    }

    #[test]
    fn test_deactivate() {
        let mut reason = SkipReason::system("test", "Test");
        assert!(reason.is_active);
        reason.deactivate();
        assert!(!reason.is_active);
    }
}
