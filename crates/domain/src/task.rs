//! Task domain models

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use typeshare::typeshare;
use uuid::Uuid;

use crate::enums::{AssignmentStatus, StepStatus, TaskStatus};

/// A task to be annotated
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub task_id: Uuid,
    pub project_id: Uuid,
    pub status: TaskStatus,
    pub priority: i32,
    pub input_data: serde_json::Value,
    pub workflow_state: WorkflowState,
    pub metadata: serde_json::Value,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
}

/// Current state of the task in the workflow
#[typeshare]
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct WorkflowState {
    pub current_step_id: Option<String>,
    pub step_states: Vec<StepState>,
    pub history: Vec<WorkflowHistoryEntry>,
}

/// State of a specific step for a task
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StepState {
    pub step_id: String,
    pub status: StepStatus,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub retry_count: i32,
}

/// A history entry for workflow progression
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowHistoryEntry {
    pub from_step_id: Option<String>,
    pub to_step_id: String,
    pub transition_reason: String,
    pub occurred_at: DateTime<Utc>,
}

/// An assignment of a task to a user
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskAssignment {
    pub assignment_id: Uuid,
    pub task_id: Uuid,
    pub step_id: String,
    pub user_id: Uuid,
    pub status: AssignmentStatus,
    pub assigned_at: DateTime<Utc>,
    pub accepted_at: Option<DateTime<Utc>>,
    pub submitted_at: Option<DateTime<Utc>>,
    pub time_spent_ms: Option<i64>,
    pub metadata: serde_json::Value,
}
