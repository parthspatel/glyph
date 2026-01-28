//! Annotation domain models

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use typeshare::typeshare;

use crate::enums::{ActorType, AnnotationStatus};
use crate::ids::{AnnotationId, AssignmentId, ProjectId, TaskId, UserId};

/// An annotation created by a user
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Annotation {
    pub annotation_id: AnnotationId,
    pub task_id: TaskId,
    pub step_id: String,
    pub user_id: UserId,
    pub assignment_id: AssignmentId,
    pub project_id: ProjectId,
    pub data: serde_json::Value,
    pub status: AnnotationStatus,
    pub version: i32,
    pub parent_annotation_id: Option<AnnotationId>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub submitted_at: Option<DateTime<Utc>>,
    pub quality_score: Option<f64>,
    pub quality_evaluated_at: Option<DateTime<Utc>>,
    pub time_spent_ms: Option<i64>,
    pub client_metadata: Option<serde_json::Value>,
}

/// An event in the annotation's history (for event sourcing)
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnnotationEvent {
    pub event_id: String,
    pub annotation_id: AnnotationId,
    pub event_type: String,
    pub data_snapshot: serde_json::Value,
    pub changes: Option<serde_json::Value>,
    pub actor_id: String,
    pub actor_type: ActorType,
    pub occurred_at: DateTime<Utc>,
    pub request_id: Option<String>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
}

/// Types of annotation events
#[typeshare]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AnnotationEventType {
    Created,
    Updated,
    Submitted,
    Approved,
    Rejected,
    Superseded,
}
