//! Quality scoring domain models

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use typeshare::typeshare;

use crate::enums::QualityEntityType;
use crate::ids::{AssignmentId, QualityScoreId, TaskId, UserId};

/// A quality score for an entity
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QualityScore {
    pub score_id: QualityScoreId,
    pub entity_type: QualityEntityType,
    /// Entity ID as string since it can reference different entity types
    pub entity_id: String,
    pub score_type: String,
    pub value: f64,
    pub confidence: Option<f64>,
    pub sample_size: i32,
    pub evaluator_id: Option<String>,
    pub calculated_at: DateTime<Utc>,
    pub calculation_metadata: serde_json::Value,
}

/// Metrics collected during an assignment
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssignmentMetrics {
    pub assignment_id: AssignmentId,
    pub user_id: UserId,
    pub task_id: TaskId,
    pub step_id: String,

    // Time metrics
    pub total_time_ms: i64,
    pub active_time_ms: i64,
    pub idle_time_ms: i64,
    pub focus_time_ms: i64,

    // Interaction counts
    pub total_interactions: i32,
    pub keystrokes: i32,
    pub clicks: i32,
    pub selections: i32,
    pub scroll_events: i32,

    // Annotation activity
    pub entities_created: i32,
    pub entities_deleted: i32,
    pub entities_modified: i32,
    pub relations_created: i32,
    pub fields_changed: i32,
    pub undo_count: i32,
    pub redo_count: i32,

    // Quality indicators
    pub corrections_count: i32,
    pub revision_cycles: i32,

    // Help usage
    pub validation_errors: i32,
    pub hints_viewed: i32,
    pub guidelines_accessed: i32,

    // Computed metrics
    pub actions_per_minute: Option<f64>,
    pub avg_time_per_entity_ms: Option<i64>,

    pub computed_at: DateTime<Utc>,
}
