//! Annotation domain models

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use typeshare::typeshare;
use uuid::Uuid;

use crate::enums::{ActorType, AnnotationStatus};

/// An annotation created by a user
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Annotation {
    pub annotation_id: Uuid,
    pub task_id: Uuid,
    pub step_id: String,
    pub user_id: Uuid,
    pub assignment_id: Uuid,
    pub project_id: Uuid,
    pub data: serde_json::Value,
    pub status: AnnotationStatus,
    pub version: i32,
    pub parent_version_id: Option<Uuid>,
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
    pub event_id: Uuid,
    pub annotation_id: Uuid,
    pub event_type: String,
    pub data_snapshot: serde_json::Value,
    pub changes: Option<serde_json::Value>,
    pub actor_id: Uuid,
    pub actor_type: ActorType,
    pub occurred_at: DateTime<Utc>,
    pub request_id: Option<Uuid>,
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
