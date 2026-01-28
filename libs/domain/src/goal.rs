//! Goal tracking domain models

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use typeshare::typeshare;
use uuid::Uuid;

use crate::enums::{AggregationType, ContributionType, GoalType};

/// A project goal to track progress
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Goal {
    pub goal_id: Uuid,
    pub project_id: Uuid,
    pub name: String,
    pub goal_type: GoalType,
    pub target_value: f64,
    pub current_value: f64,
    pub deadline: Option<DateTime<Utc>>,
    pub contributions: Vec<GoalContribution>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// A contribution to a goal from a workflow step
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GoalContribution {
    pub step_id: String,
    pub contribution_type: ContributionType,
    pub weight: f64,
    pub aggregation: AggregationType,
    pub filter_expression: Option<String>,
}

/// Progress snapshot for a goal
#[typeshare]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GoalProgress {
    pub goal_id: Uuid,
    pub current_value: f64,
    pub target_value: f64,
    pub percentage: f64,
    pub on_track: bool,
    pub projected_completion: Option<DateTime<Utc>>,
    pub calculated_at: DateTime<Utc>,
}
